import { ProviderAdapter, ProviderHealthStatus } from './types';
import { YouTubeProvider } from './youtube/youtubeProvider';
import { PexelsProvider } from './pexels/search';
import { PixabayProvider } from './pixabay/search';
import { VimeoProvider } from './vimeo/search';
import { ArchiveProvider } from './archive/search';
import { WikimediaProvider } from './wikimedia/search';
import { NasaProvider } from './nasa/search';
import { OpenverseProvider } from './openverse/search';
import { LiveTvProvider } from './livetv';
import { RadioProvider } from './radio';
import { PeerTubeProvider } from './peertube';
import { DailymotionProvider } from './dailymotion/search';
import { OpenMovieProvider } from './openmovie/search';
import { MuxProvider } from './mux/muxProvider';
import { ITunesProvider } from './itunes/search';
import { AudiusProvider } from './audius/search';
import { SomaFmProvider } from './somafm/search';
import { ArchiveWatchProvider } from './archivewatch/search';
import { FeatureFilmsProvider } from './featurefilms/search';
import { ClassicCartoonsProvider } from './classiccartoons/search';
import { NasaSvsProvider } from './nasasvs/search';
import { TvNewsProvider } from './tvnews/search';
import { ComputerChroniclesProvider } from './computerchronicles/search';
import { TedTalksProvider } from './tedtalks/search';
import { OtRadioProvider } from './otradio/search';
import { PrelingerProvider } from './prelinger/search';
import { FreeMusicProvider } from './freemusic/search';
import { CoverrProvider } from './coverr/search';
import { SciFiHorrorProvider } from './scifihorror/search';
import { SilentFilmsProvider } from './silentfilms/search';
import { MitOcwProvider } from './mitocw/search';
import { AnimationProvider } from './animation/search';
import { LocProvider } from './loc/search';
import { SportsArchiveProvider } from './sportsarchive/search';
import { NatureVidsProvider } from './naturevids/search';
import { DvidsProvider } from './dvids/search';
import { HarvardFilmProvider } from './harvardfilm/search';
import { PublicFilmProvider } from './publicfilm/search';
import { RetroGamingProvider } from './retrogaming/search';
import { SoundEffectsProvider } from './soundfx/search';
import { SmithsonianProvider } from './smithsonian/search';
import { getProvidersConfig } from '../providers.config';

export class ProviderRegistry {
  private providers: Map<string, ProviderAdapter> = new Map();

  constructor() {
    this.register(new YouTubeProvider());
    this.register(new PexelsProvider());
    this.register(new DailymotionProvider());
    this.register(new OpenMovieProvider());
    this.register(new MuxProvider());
    this.register(new PixabayProvider());
    this.register(new VimeoProvider());
    this.register(new ArchiveProvider());
    this.register(new WikimediaProvider());
    this.register(new NasaProvider());
    this.register(new OpenverseProvider());
    this.register(new LiveTvProvider());
    this.register(new RadioProvider());
    this.register(new PeerTubeProvider());
    this.register(new ITunesProvider());
    this.register(new AudiusProvider());
    this.register(new SomaFmProvider());
    this.register(new ArchiveWatchProvider());
    this.register(new FeatureFilmsProvider());
    this.register(new ClassicCartoonsProvider());
    this.register(new NasaSvsProvider());
    this.register(new TvNewsProvider());
    this.register(new ComputerChroniclesProvider());
    this.register(new TedTalksProvider());
    this.register(new OtRadioProvider());
    this.register(new PrelingerProvider());
    this.register(new FreeMusicProvider());
    this.register(new CoverrProvider());
    this.register(new SciFiHorrorProvider());
    this.register(new SilentFilmsProvider());
    this.register(new MitOcwProvider());
    this.register(new AnimationProvider());
    this.register(new LocProvider());
    this.register(new SportsArchiveProvider());
    this.register(new NatureVidsProvider());
    this.register(new DvidsProvider());
    this.register(new HarvardFilmProvider());
    this.register(new PublicFilmProvider());
    this.register(new RetroGamingProvider());
    this.register(new SoundEffectsProvider());
    this.register(new SmithsonianProvider());
  }

  register(provider: ProviderAdapter): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): ProviderAdapter | undefined {
    return this.providers.get(id);
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.providers.values());
  }

  getAvailable(): ProviderAdapter[] {
    return this.getAll().filter((p) => p.isConfigured());
  }

  getStatusList(): Array<{
    id: string;
    name: string;
    description: string;
    requiresApiKey: boolean;
    isConfigured: boolean;
    status: ProviderHealthStatus;
    capabilities?: {
      search: boolean;
      metadata: boolean;
      directPlayback: boolean;
      hls: boolean;
      embed: boolean;
    };
  }> {
    const configMap = getProvidersConfig();

    return this.getAll().map((p) => {
      const cfg = configMap[p.id];
      const customStatus = p.getStatus?.();
      const status: ProviderHealthStatus =
        customStatus || (p.isConfigured() ? 'healthy' : 'unconfigured');

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        requiresApiKey: p.requiresApiKey,
        isConfigured: p.isConfigured(),
        status,
        capabilities: {
          search: true,
          metadata: typeof p.getDetails === 'function' || typeof p.getVideo === 'function',
          directPlayback: Boolean(
            p.capabilities?.directPlayback ?? cfg?.capabilities?.directPlayback ?? false
          ),
          hls: Boolean(p.capabilities?.hls ?? cfg?.capabilities?.hls ?? false),
          embed: Boolean(p.capabilities?.embed ?? cfg?.capabilities?.embed ?? false),
        },
      };
    });
  }
}

export const providerRegistry = new ProviderRegistry();
