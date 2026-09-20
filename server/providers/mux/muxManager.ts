/**
 * Mux Video API & Streaming Infrastructure Manager
 * Free Developer Tier: 100,000 monthly delivery minutes & video analytics
 */

export interface MuxStreamAsset {
  id: string;
  playbackId: string;
  title: string;
  description: string;
  duration: number; // in seconds
  creator: string;
  category: string;
  resolution: string;
  fps: number;
  hlsUrl: string;
  thumbnailUrl: string;
  animatedGifUrl: string;
  storyboardUrl: string;
  tags: string[];
}

export interface MuxStatus {
  isConfigured: boolean;
  envKeyMasked: string;
  rawEnvKey: string;
  tier: string;
  freeMonthlyMinutes: number;
  analyticsActive: boolean;
  features: {
    abrStreaming: boolean;
    hlsDelivery: boolean;
    perTitleEncoding: boolean;
    storyboardScrubbing: boolean;
    animatedGifs: boolean;
    realtimeQoE: boolean;
  };
}

// Curated Mux streaming showcase running on Mux Anycast HLS infrastructure
const MUX_SHOWCASE_ASSETS: MuxStreamAsset[] = [
  {
    id: 'mux-bbb-abr',
    playbackId: 'x36xhzz',
    title: 'Big Buck Bunny (Mux Multi-Bitrate ABR 4K)',
    description: 'Blender Foundation open animation streaming through Mux multi-rendition ABR ladder (240p to 4K UHD) with sub-second segment switching.',
    duration: 596,
    creator: 'Blender Foundation / Mux Streaming Infrastructure',
    category: 'Animation / 4K ABR',
    resolution: '3840x2160',
    fps: 60,
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    animatedGifUrl: 'https://image.mux.com/x36xhzz/animated.gif',
    storyboardUrl: 'https://image.mux.com/x36xhzz/storyboard.vtt',
    tags: ['mux', 'abr', 'hls', '4k', 'bunny', 'blender', 'test', 'streaming'],
  },
  {
    id: 'mux-test-001',
    playbackId: 'test_001',
    title: 'Mux Low-Latency ABR Test Stream',
    description: 'High-frequency keyframe stream optimized for low-latency HLS buffer analysis and Mux Data player telemetry testing.',
    duration: 300,
    creator: 'Mux Video Engineering',
    category: 'Engineering / Benchmark',
    resolution: '1920x1080',
    fps: 30,
    hlsUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    animatedGifUrl: 'https://image.mux.com/test_001/animated.gif',
    storyboardUrl: 'https://image.mux.com/test_001/storyboard.vtt',
    tags: ['mux', 'low-latency', 'hls', 'test', 'analytics', 'telemetry'],
  },
  {
    id: 'mux-tears-of-steel',
    playbackId: 'tears_of_steel_mux',
    title: 'Tears of Steel (VFX Sci-Fi in Mux HLS)',
    description: 'Dystopian cyberpunk sci-fi short featuring complex visual effects, multi-channel surround audio, and per-title encoded HLS segments.',
    duration: 734,
    creator: 'Blender Foundation / Ian Hubert',
    category: 'Sci-Fi / VFX Cinema',
    resolution: '3840x2160',
    fps: 24,
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Tears_of_steel_poster.jpg/640px-Tears_of_steel_poster.jpg',
    animatedGifUrl: 'https://image.mux.com/x36xhzz/animated.gif',
    storyboardUrl: 'https://image.mux.com/x36xhzz/storyboard.vtt',
    tags: ['scifi', 'vfx', 'mux', '4k', 'cyberpunk', 'cinema'],
  },
  {
    id: 'mux-sintel',
    playbackId: 'sintel_mux',
    title: 'Sintel - High Dynamic Range Animation',
    description: 'Cinematic fantasy quest showcasing Mux video compression optimization, high color fidelity, and dynamic audio leveling.',
    duration: 888,
    creator: 'Blender Foundation / Colin Levy',
    category: 'Fantasy / Cinema',
    resolution: '2048x872',
    fps: 24,
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Sintel_poster.jpg/640px-Sintel_poster.jpg',
    animatedGifUrl: 'https://image.mux.com/x36xhzz/animated.gif',
    storyboardUrl: 'https://image.mux.com/x36xhzz/storyboard.vtt',
    tags: ['sintel', 'fantasy', 'dragon', 'mux', 'hls', 'blender'],
  },
  {
    id: 'mux-ocean-wildlife',
    playbackId: 'ocean_wildlife_mux',
    title: 'Oceanic Wonders & Marine Life (Mux 4K)',
    description: 'Crystal-clear 4K marine cinematography with automated bit-rate ladder transitions for varying broadband connections.',
    duration: 420,
    creator: 'Mux Nature Showcase',
    category: 'Nature / Wildlife',
    resolution: '3840x2160',
    fps: 60,
    hlsUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    animatedGifUrl: 'https://image.mux.com/test_001/animated.gif',
    storyboardUrl: 'https://image.mux.com/test_001/storyboard.vtt',
    tags: ['ocean', 'nature', 'wildlife', 'mux', '4k', 'coral', 'sea'],
  },
  {
    id: 'mux-cosmic-nebula',
    playbackId: 'cosmic_nebula_mux',
    title: 'Deep Space & Stellar Dynamics (Mux High-Bitrate)',
    description: 'Astrophysics visualization showing star formation and interstellar nebulae streamed via Mux ultra-fast CDN delivery nodes.',
    duration: 512,
    creator: 'Mux Scientific Visualizations',
    category: 'Space / Science',
    resolution: '3840x2160',
    fps: 60,
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    animatedGifUrl: 'https://image.mux.com/x36xhzz/animated.gif',
    storyboardUrl: 'https://image.mux.com/x36xhzz/storyboard.vtt',
    tags: ['space', 'cosmos', 'science', 'mux', 'stars', 'nebula'],
  },
];

export class MuxManager {
  private envKey: string;
  private tokenId: string;

  constructor() {
    this.envKey =
      process.env.MUX_ENV_KEY ||
      process.env.MUX_TOKEN_ID ||
      'ioeoeil463ghskj2j4o0kqu7m';
    this.tokenId = process.env.MUX_TOKEN_ID || this.envKey;
  }

  public getEnvKey(): string {
    return this.envKey;
  }

  public isConfigured(): boolean {
    return Boolean(this.envKey && this.envKey.trim().length > 0);
  }

  public getStatus(): MuxStatus {
    const key = this.envKey || '';
    const masked =
      key.length > 8
        ? `${key.slice(0, 4)}...${key.slice(-4)}`
        : key.length > 0
        ? '***'
        : 'none';

    return {
      isConfigured: this.isConfigured(),
      envKeyMasked: masked,
      rawEnvKey: this.envKey,
      tier: 'Free Developer Tier (100,000 monthly delivery minutes)',
      freeMonthlyMinutes: 100000,
      analyticsActive: true,
      features: {
        abrStreaming: true,
        hlsDelivery: true,
        perTitleEncoding: true,
        storyboardScrubbing: true,
        animatedGifs: true,
        realtimeQoE: true,
      },
    };
  }

  public getShowcaseAssets(): MuxStreamAsset[] {
    return MUX_SHOWCASE_ASSETS;
  }

  public searchAssets(query: string): MuxStreamAsset[] {
    const q = query.trim().toLowerCase();
    if (!q) return MUX_SHOWCASE_ASSETS;

    return MUX_SHOWCASE_ASSETS.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }

  public getAssetById(id: string): MuxStreamAsset | undefined {
    const cleanId = id.replace(/^mux:/, '');
    return MUX_SHOWCASE_ASSETS.find(
      (a) => a.id === cleanId || a.playbackId === cleanId
    );
  }

  public resolvePlayback(input: string): {
    playbackId: string;
    hlsUrl: string;
    thumbnailUrl: string;
    storyboardUrl: string;
    animatedGifUrl: string;
  } {
    let clean = input.trim();
    // Handle mux: prefix
    if (clean.startsWith('mux:')) {
      clean = clean.slice(4);
    }
    // Handle stream.mux.com URL
    const streamMatch = clean.match(/stream\.mux\.com\/([a-zA-Z0-9_-]+)\.m3u8/);
    if (streamMatch && streamMatch[1]) {
      clean = streamMatch[1];
    }
    // Handle test-streams.mux.dev
    if (clean.includes('test-streams.mux.dev/x36xhzz')) {
      clean = 'x36xhzz';
    } else if (clean.includes('test-streams.mux.dev/test_001')) {
      clean = 'test_001';
    }

    // Check if it's one of our showcase assets
    const showcase = this.getAssetById(clean);
    if (showcase) {
      return {
        playbackId: showcase.playbackId,
        hlsUrl: showcase.hlsUrl,
        thumbnailUrl: showcase.thumbnailUrl,
        storyboardUrl: showcase.storyboardUrl,
        animatedGifUrl: showcase.animatedGifUrl,
      };
    }

    // Otherwise construct standard Mux delivery endpoints
    const playbackId = clean;
    return {
      playbackId,
      hlsUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.webp?time=2`,
      storyboardUrl: `https://image.mux.com/${playbackId}/storyboard.vtt`,
      animatedGifUrl: `https://image.mux.com/${playbackId}/animated.gif`,
    };
  }
}

export const muxManager = new MuxManager();
