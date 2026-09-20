import { ProviderAdapter, PlaybackResolution } from '../types';
import { ProviderSearchOptions, ProviderSearchResult, MediaItem } from '../../types/media';

interface OpenMovieItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  creator: string;
  year: number;
  tags: string[];
}

const OPEN_MOVIES: OpenMovieItem[] = [
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny (4K Ultra HD)',
    description: 'A large and lovable rabbit deals with bullying forest creatures in this iconic Blender Open Movie.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/640px-Big_buck_bunny_poster_big.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 596,
    creator: 'Blender Foundation / Sacha Goedegebure',
    year: 2008,
    tags: ['bunny', 'nature', 'animation', 'blender', '4k', 'open', 'movie', 'comedy', 'trending', 'popular'],
  },
  {
    id: 'sintel',
    title: 'Sintel - The Durian Open Movie Project (4K)',
    description: 'A lonely young woman named Sintel searches for a baby dragon she befriended and named Scales.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Sintel_poster.jpg/640px-Sintel_poster.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    duration: 888,
    creator: 'Blender Foundation / Colin Levy',
    year: 2010,
    tags: ['sintel', 'dragon', 'fantasy', 'adventure', 'drama', 'animation', 'blender', 'movie', 'trending'],
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel (VFX Sci-Fi 4K)',
    description: 'Set in a dystopian future at the Oude Kerk in Amsterdam, a group of scientists attempts to stage an encounter.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Tears_of_steel_poster.jpg/640px-Tears_of_steel_poster.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    duration: 734,
    creator: 'Blender Foundation / Ian Hubert',
    year: 2012,
    tags: ['sci-fi', 'space', 'robot', 'vfx', 'amsterdam', 'cyberpunk', 'action', 'blender', 'movie', 'tech'],
  },
  {
    id: 'elephants-dream',
    title: 'Elephants Dream (The World First Open Movie)',
    description: 'The story of two characters, Proog and Emo, wandering through an infinite surreal machine.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_poster.jpg/640px-Elephants_Dream_poster.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 654,
    creator: 'Orange Open Movie Project / Bassam Kurdali',
    year: 2006,
    tags: ['elephants', 'dream', 'machine', 'surreal', 'scifi', 'blender', 'first', 'open', 'movie', 'trending'],
  },
  {
    id: 'for-bigger-blazes',
    title: 'Chromecast Nature Symphony: For Bigger Blazes',
    description: 'Cinematic high-contrast nature footage captured for global display showcases with pristine soundscapes.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
    creator: 'Open Media Showcase',
    year: 2021,
    tags: ['nature', 'fire', 'cinematic', 'hdr', 'ultra', 'hd', 'stock', 'trending'],
  },
  {
    id: 'for-bigger-escapes',
    title: 'Chromecast Scenic Horizons: For Bigger Escapes',
    description: 'Aerial mountain ranges, glacial fjords, and alpine valleys rendered in uncompressed MP4 video format.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
    creator: 'Open Media Showcase',
    year: 2021,
    tags: ['mountain', 'nature', 'landscape', 'aerial', 'drone', '4k', 'scenic', 'stock', 'trending'],
  },
  {
    id: 'we-are-going-on-bullrun',
    title: 'We Are Going on Bullrun (High Speed Motorsports)',
    description: 'Adrenaline-pumping automotive rally and high-speed driving showcase captured in pristine direct streaming.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    duration: 47,
    creator: 'Automotive Open Reel',
    year: 2022,
    tags: ['sports', 'cars', 'motorsport', 'rally', 'speed', 'racing', 'trending', 'action'],
  },
  {
    id: 'what-car-can-you-get-for-a-grand',
    title: 'Automotive Restoration: Budget Track Day Challenge',
    description: 'Creative engineering challenge showcasing mechanical restorations and test-track runs.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    duration: 598,
    creator: 'Track Garage Collective',
    year: 2022,
    tags: ['cars', 'tech', 'engineering', 'restoration', 'track', 'comedy', 'trending'],
  },
];

export class OpenMovieProvider implements ProviderAdapter {
  readonly id = 'openmovie';
  readonly name = 'Open Cinema Vault';
  readonly description = 'Iconic Creative Commons 4K cinematic films & open animation masterpieces (Blender Foundation)';
  readonly requiresApiKey = false;
  readonly latencyClass = 'fast' as const;
  readonly defaultBudgetMs = 300;
  readonly capabilities = {
    search: true,
    metadata: true,
    directPlayback: true,
    hls: false,
    embed: false,
  };

  isConfigured(): boolean {
    return true;
  }

  getStatus(): 'healthy' {
    return 'healthy';
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const rawQ = (options.query || '').trim().toLowerCase();
    const matches = OPEN_MOVIES.filter((m) => {
      if (!rawQ || rawQ === 'trending' || rawQ === 'all') return true;
      return (
        m.title.toLowerCase().includes(rawQ) ||
        m.description.toLowerCase().includes(rawQ) ||
        m.creator.toLowerCase().includes(rawQ) ||
        m.tags.some((t) => t.includes(rawQ))
      );
    });

    const items: MediaItem[] = matches.map((m) => ({
      id: `openmovie:${m.id}`,
      provider: 'openmovie',
      providerId: m.id,
      title: m.title,
      description: m.description,
      mediaType: 'video',
      thumbnailUrl: m.thumbnailUrl,
      sourceUrl: m.videoUrl,
      playbackUrl: m.videoUrl,
      embedUrl: null,
      duration: m.duration,
      publishedAt: `${m.year}-01-01T00:00:00Z`,
      creator: m.creator,
      channel: 'Open Movie Vault',
      license: {
        name: 'Creative Commons Attribution (CC BY 3.0)',
        url: 'https://creativecommons.org/licenses/by/3.0/',
        commercialUse: true,
        attributionRequired: true,
      },
      metadata: {
        playerType: 'native',
        mimeType: 'video/mp4',
        directStream: true,
      },
    }));

    return {
      items,
      total: items.length,
      status: 'ok',
    };
  }

  async getDetails(id: string): Promise<MediaItem | null> {
    const cleanId = id.replace(/^(openmovie:)/, '').trim();
    const match = OPEN_MOVIES.find((m) => m.id === cleanId) || OPEN_MOVIES[0];
    if (!match) return null;

    return {
      id: `openmovie:${match.id}`,
      provider: 'openmovie',
      providerId: match.id,
      title: match.title,
      description: match.description,
      mediaType: 'video',
      thumbnailUrl: match.thumbnailUrl,
      sourceUrl: match.videoUrl,
      playbackUrl: match.videoUrl,
      embedUrl: null,
      duration: match.duration,
      publishedAt: `${match.year}-01-01T00:00:00Z`,
      creator: match.creator,
      channel: 'Open Movie Vault',
      license: {
        name: 'Creative Commons Attribution (CC BY 3.0)',
        url: 'https://creativecommons.org/licenses/by/3.0/',
        commercialUse: true,
        attributionRequired: true,
      },
      metadata: {
        playerType: 'native',
        mimeType: 'video/mp4',
        directStream: true,
      },
    };
  }

  async resolvePlayback(id: string): Promise<PlaybackResolution | null> {
    const cleanId = id.replace(/^(openmovie:)/, '').trim();
    const match = OPEN_MOVIES.find((m) => m.id === cleanId) || OPEN_MOVIES[0];
    if (!match) return null;

    return {
      id: match.id,
      provider: 'openmovie',
      candidates: [
        {
          kind: 'direct',
          url: match.videoUrl,
          mimeType: 'video/mp4',
          quality: '1080p MP4',
        },
      ],
      selectedCandidateIndex: 0,
      hasDirectStream: true,
      playbackUrl: match.videoUrl,
      embedUrl: null,
      sourceUrl: match.videoUrl,
    };
  }
}
