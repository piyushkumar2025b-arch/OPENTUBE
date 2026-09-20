/**
 * Openverse OAuth2 & Client Credentials Manager
 * 
 * Implements the 4-step Openverse API authentication workflow:
 * 1. Register Application: POST https://api.openverse.org/v1/auth_tokens/register/
 * 2. Save Client Credentials (client_id, client_secret)
 * 3. Email verification notification tracking
 * 4. Token Exchange: POST https://api.openverse.org/v1/auth_tokens/token/ (grant_type=client_credentials)
 *    and attaches "Authorization: Bearer <access_token>" on all media search and detail requests.
 */

interface OpenverseCredentials {
  clientId: string;
  clientSecret: string;
  name?: string;
  email?: string;
}

interface CachedToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp ms
  scope?: string;
}

// Default email for registration
const DEFAULT_EMAIL = 'app899047@gmail.com';

class OpenverseAuthManager {
  private dynamicCredentials: OpenverseCredentials | null = null;
  private cachedToken: CachedToken | null = null;
  private tokenPromise: Promise<string | null> | null = null;

  constructor() {
    // Check if initial access token is in env
    const envToken = process.env.OPENVERSE_ACCESS_TOKEN || process.env.OPENVERSE_API_KEY;
    if (envToken && envToken.trim().length > 10) {
      this.cachedToken = {
        accessToken: envToken.trim(),
        tokenType: 'Bearer',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
    }
  }

  /**
   * Get active client credentials from ENV, dynamic registration, or null
   */
  public getCredentials(): OpenverseCredentials | null {
    const envClientId = process.env.OPENVERSE_CLIENT_ID?.trim();
    const envClientSecret = process.env.OPENVERSE_CLIENT_SECRET?.trim();

    if (envClientId && envClientSecret) {
      return {
        clientId: envClientId,
        clientSecret: envClientSecret,
        email: process.env.OPENVERSE_EMAIL?.trim() || DEFAULT_EMAIL,
        name: 'OpenTube Applet (Env Configured)',
      };
    }

    if (this.dynamicCredentials?.clientId && this.dynamicCredentials?.clientSecret) {
      return this.dynamicCredentials;
    }

    return null;
  }

  /**
   * Step 1: Register an Application with Openverse API
   */
  public async registerApplication(params: {
    name?: string;
    description?: string;
    email?: string;
  }): Promise<{
    success: boolean;
    client_id?: string;
    client_secret?: string;
    name?: string;
    msg?: string;
    error?: string;
  }> {
    const name = params.name?.trim() || 'OpenTube Universal Media Player';
    const description = params.description?.trim() || 'Universal open media search engine & direct streaming media player';
    const email = params.email?.trim() || DEFAULT_EMAIL;

    try {
      const response = await fetch('https://api.openverse.org/v1/auth_tokens/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpenTube/1.0 (https://github.com/opentube)',
        },
        body: JSON.stringify({
          name,
          description,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || data.message || `Registration returned HTTP ${response.status}`,
        };
      }

      if (data.client_id && data.client_secret) {
        this.dynamicCredentials = {
          clientId: data.client_id,
          clientSecret: data.client_secret,
          email,
          name,
        };
        // Invalidate previous token to force fresh exchange with new credentials
        this.cachedToken = null;

        return {
          success: true,
          client_id: data.client_id,
          client_secret: data.client_secret,
          name: data.name || name,
          msg: data.msg || `Registration successful. Check ${email} for any verification link.`,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Openverse registration endpoint.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to connect to Openverse registration service.',
      };
    }
  }

  /**
   * Step 4: Exchange Client ID and Client Secret for a Bearer Access Token
   */
  public async fetchAccessToken(forceRefresh = false): Promise<string | null> {
    // If cached token is valid and not close to expiring (buffer of 3 minutes)
    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAt > Date.now() + 180000) {
      return this.cachedToken.accessToken;
    }

    // Deduplicate simultaneous requests
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = (async () => {
      try {
        const creds = this.getCredentials();
        if (!creds || !creds.clientId || !creds.clientSecret) {
          return null;
        }

        const body = new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          grant_type: 'client_credentials',
        });

        const res = await fetch('https://api.openverse.org/v1/auth_tokens/token/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'OpenTube/1.0 (https://github.com/opentube)',
          },
          body: body.toString(),
        });

        if (!res.ok) {
          console.warn(`[Openverse Auth] Token exchange returned HTTP ${res.status}. Falling back to public Openverse catalog mode.`);
          return null;
        }

        const data = await res.json();
        if (data.access_token) {
          const expiresInMs = (data.expires_in || 43200) * 1000;
          this.cachedToken = {
            accessToken: data.access_token,
            tokenType: data.token_type || 'Bearer',
            expiresAt: Date.now() + expiresInMs,
            scope: data.scope,
          };
          console.log(`[Openverse Auth] Successfully acquired Bearer token, valid for ${Math.round(expiresInMs / 1000)}s`);
          return data.access_token;
        }

        return null;
      } catch (err: any) {
        console.warn('[Openverse Auth] Token exchange network request deferred:', err.message);
        return null;
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
  }

  /**
   * Invalidate the current cached token (e.g., on 401 response)
   */
  public invalidateToken(): void {
    this.cachedToken = null;
  }

  /**
   * Get diagnostic auth status for telemetry and settings UI
   */
  public getStatus() {
    const creds = this.getCredentials();
    const hasToken = Boolean(this.cachedToken?.accessToken);
    const expiresAt = this.cachedToken ? new Date(this.cachedToken.expiresAt).toISOString() : null;
    const remainingSec = this.cachedToken
      ? Math.max(0, Math.round((this.cachedToken.expiresAt - Date.now()) / 1000))
      : 0;

    return {
      authenticated: hasToken,
      hasCredentials: Boolean(creds && creds.clientId && creds.clientSecret),
      clientIdMasked: creds?.clientId ? `${creds.clientId.slice(0, 8)}...${creds.clientId.slice(-4)}` : null,
      fullClientId: creds?.clientId || null,
      email: creds?.email || DEFAULT_EMAIL,
      emailVerified: Boolean(creds?.clientId),
      verificationMsg: hasToken
        ? 'Successfully authenticated. Bearer token active.'
        : creds?.clientId
        ? 'Credentials saved. Ready to exchange token.'
        : 'Openverse is running in public unauthenticated mode. Register or set API credentials for higher limits.',
      tokenType: this.cachedToken?.tokenType || 'Bearer',
      expiresAt,
      remainingSec,
      scope: this.cachedToken?.scope || 'read write',
      rateLimitTier: hasToken
        ? 'Authenticated (higher quota & priority burst rate limit)'
        : 'Public Mode (Direct access, standard rate limits)',
    };
  }
}

export const openverseAuth = new OpenverseAuthManager();
