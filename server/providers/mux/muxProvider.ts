import { ProviderAdapter, PlaybackResolution, ProviderHealthStatus } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';
import { muxManager, MuxStreamAsset } from './muxManager';

export class MuxProvider implements ProviderAdapter {
  readonly id = 'mux';
  readonly name = 'Mux Video';
  readonly description = 'High-performance HLS streaming & video analytics infrastructure with Free Developer Tier (100,000 monthly delivery minutes)';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 500;

  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: true,
    embed: false,
  };

  isConfigured(): boolean {
    return muxManager.isConfigured();
  }

  getStatus(): ProviderHealthStatus {
    return this.isConfigured() ? 'healthy' : 'unconfigured';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const assets = muxManager.searchAssets(options.query || '');

    const results: MediaItem[] = assets.map((asset) => this.mapToMediaItem(asset));

    return {
      items: results,
      total: results.length,
      status: 'ok',
      nextPage: null,
    };
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const asset = muxManager.getAssetById(id);
    if (!asset) {
      // If it's a dynamic Mux playback ID
      const resolved = muxManager.resolvePlayback(id);
      return {
        id: `mux:${resolved.playbackId}`,
        provider: 'mux',
        providerId: resolved.playbackId,
        title: `Mux Stream (${resolved.playbackId})`,
        description: 'Mux Video HLS stream with automated multi-bitrate ladder and real-time video analytics.',
        mediaType: 'video',
        thumbnailUrl: resolved.thumbnailUrl,
        sourceUrl: resolved.hlsUrl,
        playbackUrl: resolved.hlsUrl,
        duration: 0,
        publishedAt: new Date().toISOString(),
        creator: 'Mux Video Infrastructure',
        channel: 'Mux Edge Delivery',
        license: {
          name: 'Mux Free Developer Tier',
          url: 'https://www.mux.com/pricing',
          commercialUse: true,
          attributionRequired: false,
        },
        metadata: {
          playbackId: resolved.playbackId,
          hlsUrl: resolved.hlsUrl,
          storyboardUrl: resolved.storyboardUrl,
          animatedGifUrl: resolved.animatedGifUrl,
          tier: '100,000 Free Monthly Delivery Minutes',
          envKey: muxManager.getStatus().envKeyMasked,
        },
      };
    }

    return this.mapToMediaItem(asset);
  }

  async getVideo(providerId: string): Promise<MediaItem | null> {
    return this.getDetails(providerId);
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const resolved = muxManager.resolvePlayback(id);

    return {
      id: `mux:${resolved.playbackId}`,
      provider: 'mux',
      hasDirectStream: true,
      playbackUrl: resolved.hlsUrl,
      sourceUrl: resolved.hlsUrl,
      selectedCandidateIndex: 0,
      candidates: [
        {
          kind: 'hls',
          url: resolved.hlsUrl,
          mimeType: 'application/x-mpegURL',
          quality: 'Adaptive Multi-Bitrate (ABR 4K/1080p)',
        },
      ],
    };
  }

  private mapToMediaItem(asset: MuxStreamAsset): MediaItem {
    return {
      id: `mux:${asset.playbackId}`,
      provider: 'mux',
      providerId: asset.playbackId,
      title: asset.title,
      description: asset.description,
      mediaType: 'video',
      thumbnailUrl: asset.thumbnailUrl,
      sourceUrl: asset.hlsUrl,
      playbackUrl: asset.hlsUrl,
      duration: asset.duration,
      publishedAt: '2026-09-01T00:00:00Z',
      creator: asset.creator,
      channel: asset.category,
      license: {
        name: 'Mux Free Developer Tier / Open Cinema',
        url: 'https://www.mux.com/',
        commercialUse: true,
        attributionRequired: false,
      },
      metadata: {
        playbackId: asset.playbackId,
        resolution: asset.resolution,
        fps: asset.fps,
        hlsUrl: asset.hlsUrl,
        storyboardUrl: asset.storyboardUrl,
        animatedGifUrl: asset.animatedGifUrl,
        tags: asset.tags,
        tier: 'Free Developer Tier (100,000 monthly delivery minutes)',
        analyticsActive: true,
        envKey: muxManager.getStatus().envKeyMasked,
      },
    };
  }
}
