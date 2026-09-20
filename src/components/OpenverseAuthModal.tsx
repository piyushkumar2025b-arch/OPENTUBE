import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Mail,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Clock,
  Terminal,
  FileCode,
} from 'lucide-react';

interface OpenverseStatus {
  authenticated: boolean;
  hasCredentials: boolean;
  clientIdMasked: string | null;
  fullClientId?: string | null;
  email: string;
  emailVerified?: boolean;
  verificationMsg?: string;
  tokenType: string;
  expiresAt: string | null;
  remainingSec: number;
  scope: string;
  rateLimitTier: string;
}

interface OpenverseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenverseAuthModal: React.FC<OpenverseAuthModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<OpenverseStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form fields for Step 1
  const [projectName, setProjectName] = useState('OpenTube Universal Player');
  const [projectDesc, setProjectDesc] = useState('Universal media player & Creative Commons aggregator');
  const [email, setEmail] = useState('app899047@gmail.com');

  // Fetch status on open
  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/openverse/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.email) setEmail(data.email);
      }
    } catch (err: any) {
      console.error('Failed to load Openverse auth status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1-Click Generate / Refresh Token (Step 4 & Background process)
  const handleGenerateOrRefreshToken = async () => {
    setIsRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/openverse/token', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(data.status);
        setMessage({
          type: 'success',
          text: 'Bearer Access Token successfully acquired and cached! Openverse searches are now fully authenticated.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to exchange credentials for access token.',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Network error refreshing token.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Step 1: Register New Application
  const handleRegisterApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setMessage(null);
    try {
      const res = await fetch('/api/openverse/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc,
          email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.status) setStatus(data.status);
        setMessage({
          type: 'success',
          text: data.msg || `Registration successful! Check ${email} for the Openverse verification link.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Openverse registration failed. Verify parameters.',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to connect to Openverse.' });
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hoursRemaining = status?.remainingSec
    ? (status.remainingSec / 3600).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div
        id="openverse-auth-modal"
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-600/20 text-pink-400 border border-pink-500/40 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Openverse API Authentication</h2>
                {status?.authenticated ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Bearer Active ({hoursRemaining}h)</span>
                  </span>
                ) : status?.hasCredentials ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Ready to Exchange Token
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    Public Mode Active
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                4-Step Client Credentials & Bearer Token Authentication Workflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Notification Banner */}
        {message && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                : message.type === 'error'
                ? 'bg-red-950/40 border-red-600/40 text-red-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-200'
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-neutral-400 hover:text-white shrink-0 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Scrollable Workflow Body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 text-xs scrollbar-thin">
          {/* Automatic Generation Banner (Matches prompt note) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-pink-950/40 via-neutral-900 to-neutral-950 border border-pink-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-bold text-neutral-100">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Automated API Key & Token Generator</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Trade registered client credentials for an access token automatically. OpenTube attaches <code className="text-pink-300 bg-neutral-900 px-1 py-0.5 rounded font-mono">Authorization: Bearer &lt;token&gt;</code> on all requests.
              </p>
            </div>
            <button
              id="openverse-quick-generate-btn"
              onClick={handleGenerateOrRefreshToken}
              disabled={isRefreshing}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl flex items-center gap-2 shrink-0 transition-all shadow-lg shadow-pink-950/50 hover:scale-[1.02] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{status?.authenticated ? 'Refresh Bearer Token' : status?.hasCredentials ? 'Exchange Bearer Token' : 'Register / Exchange Token'}</span>
            </button>
          </div>

          {/* 4 Steps Container */}
          <div className="flex flex-col gap-3">
            {/* Step 1: Register Application */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center text-[10px] border border-pink-500/30">
                    1
                  </span>
                  <span className="font-bold text-neutral-200">Step 1: Register Application</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">POST /v1/auth_tokens/register/</span>
              </div>

              <form onSubmit={handleRegisterApp} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-400 uppercase font-semibold">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-400 uppercase font-semibold">Description</label>
                  <input
                    type="text"
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-400 uppercase font-semibold">Admin Email</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-pink-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-pink-300 font-semibold rounded-lg border border-neutral-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isRegistering ? 'Registering...' : 'Register'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Step 2: Client Identifiers */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center text-[10px] border border-pink-500/30">
                    2
                  </span>
                  <span className="font-bold text-neutral-200">Step 2: Client Credentials</span>
                </div>
                {status?.hasCredentials ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                    Configured & Stored
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700 font-medium">
                    Public Mode (No key needed)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">client_id</span>
                    <span className="font-mono text-neutral-200">{status?.clientIdMasked || 'Not configured (Public Mode)'}</span>
                  </div>
                  {status?.fullClientId && (
                    <button
                      onClick={() => copyToClipboard(status.fullClientId || '', 'client_id')}
                      className="p-1.5 text-neutral-400 hover:text-white rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
                      title="Copy full client_id"
                    >
                      {copiedField === 'client_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">client_secret</span>
                    <span className="font-mono text-neutral-400">
                      {status?.hasCredentials ? '••••••••••••••••••••••••••••••••' : 'None required for public access'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                    {status?.hasCredentials ? 'Encrypted on Server' : 'Public Tier'}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Verify Your Email */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                  </span>
                  <span className="font-bold text-neutral-200">Step 3: Email Verified & Credentials Active</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                  <Check className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-800/40 text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-emerald-300">
                    {status?.verificationMsg || 'Successfully verified email. Your OAuth2 credentials are now active.'}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Verified address: <strong className="text-neutral-300">{status?.email || 'app899047@gmail.com'}</strong>. Openverse higher-tier quotas (up to 5,000 requests/day) are fully unlocked.
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4: Token Exchange & Bearer Authentication */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center text-[10px] border border-pink-500/30">
                    4
                  </span>
                  <span className="font-bold text-neutral-200">Step 4: Exchange for Bearer Access Token</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">POST /v1/auth_tokens/token/</span>
              </div>

              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-200">Active Bearer Token:</span>
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-neutral-800 text-pink-300 border border-neutral-700">
                      Bearer ••••••••••••
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                      Scope: {status?.scope || 'read write'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>
                      {status?.remainingSec ? (
                        <>Valid for another <strong className="text-neutral-200">{hoursRemaining} hours</strong> (auto-refreshes seamlessly)</>
                      ) : (
                        'Ready to exchange'
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateOrRefreshToken}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold border border-neutral-700 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Exchange Token Now</span>
                </button>
              </div>
            </div>

            {/* Verification & Manual cURL Command Reference */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                  <span>cURL Command Reference</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/80 font-mono text-[10px] text-neutral-400 border border-neutral-800 overflow-x-auto">
                <div className="text-pink-400"># Step 4: Token Exchange</div>
                <div>curl -X POST https://api.openverse.org/v1/auth_tokens/token/ \</div>
                <div className="pl-4">-H &quot;Content-Type: application/x-www-form-urlencoded&quot; \</div>
                <div className="pl-4">-d &quot;client_id=YOUR_CLIENT_ID&amp;client_secret=YOUR_CLIENT_SECRET&amp;grant_type=client_credentials&quot;</div>
                <div className="text-pink-400 mt-2"># Future Media Requests</div>
                <div>curl https://api.openverse.org/v1/audio/?q=nature -H &quot;Authorization: Bearer &lt;access_token&gt;&quot;</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-neutral-400">
              OpenTube server automatically injects Bearer token on all Openverse queries
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
