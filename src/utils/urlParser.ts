import { VideoItem } from '../types';

export function parseAnyVideoUrl(rawUrl: string, customTitle?: string): VideoItem | null {
  const url = (rawUrl || '').trim();
  if (!url) return null;

  // 1. YouTube
  const ytMatch =
    url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      id: `custom:yt-${videoId}`,
      title: customTitle || `YouTube Stream (${videoId})`,
      description: `User-imported YouTube video URL: ${url}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      videoUrl: url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
      playbackUrl: undefined,
      duration: 0,
      source: 'youtube',
      sourceName: 'YouTube Direct',
      sourceLabel: 'YouTube URL',
      author: 'YouTube',
      channel: 'YouTube Direct',
      publishedAt: 'Direct URL',
      license: 'Standard YouTube License',
      playerType: 'embed',
      metadata: { playerType: 'embed', isEmbedOnly: true },
    };
  }

  // 2. Dailymotion
  const dmMatch = url.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    const dmId = dmMatch[1];
    return {
      id: `custom:dm-${dmId}`,
      title: customTitle || `Dailymotion Stream (${dmId})`,
      description: `User-imported Dailymotion video URL: ${url}`,
      thumbnail: `https://www.dailymotion.com/thumbnail/video/${dmId}`,
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${dmId}`,
      videoUrl: url,
      embedUrl: `https://geo.dailymotion.com/player.html?video=${dmId}`,
      playbackUrl: undefined,
      duration: 0,
      source: 'dailymotion',
      sourceName: 'Dailymotion Direct',
      sourceLabel: 'Dailymotion URL',
      author: 'Dailymotion',
      channel: 'Dailymotion Direct',
      publishedAt: 'Direct URL',
      license: 'Dailymotion Open Terms',
      playerType: 'embed',
      metadata: { playerType: 'embed', isEmbedOnly: true },
    };
  }

  // 3. Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      id: `custom:vimeo-${vimeoId}`,
      title: customTitle || `Vimeo Video (${vimeoId})`,
      description: `User-imported Vimeo video URL: ${url}`,
      thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      videoUrl: url,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
      playbackUrl: undefined,
      duration: 0,
      source: 'vimeo',
      sourceName: 'Vimeo Direct',
      sourceLabel: 'Vimeo URL',
      author: 'Vimeo',
      channel: 'Vimeo Direct',
      publishedAt: 'Direct URL',
      license: 'Vimeo Standard Terms',
      playerType: 'embed',
      metadata: { playerType: 'embed', isEmbedOnly: true },
    };
  }

  // 4. HLS Stream (.m3u8)
  if (url.includes('.m3u8') || url.includes('/hls/') || url.includes('/live/')) {
    return {
      id: `custom:hls-${Date.now()}`,
      title: customTitle || 'Live HLS Stream',
      description: `User-imported HLS adaptive bitrate stream: ${url}`,
      thumbnail: 'https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=800&auto=format&fit=crop&q=80',
      videoUrl: url,
      playbackUrl: url,
      duration: 0,
      isLive: true,
      source: 'livetv',
      sourceName: 'Custom HLS Live',
      sourceLabel: 'HLS Stream',
      author: 'Live Broadcast',
      channel: 'Custom HLS',
      publishedAt: 'Live Now',
      license: 'Live Broadcast License',
      playerType: 'hls',
      metadata: { playerType: 'hls', streamType: 'hls', directStream: true },
    };
  }

  // 5. Audio Streams (.mp3, .aac, .ogg, radio streams)
  if (
    url.endsWith('.mp3') ||
    url.endsWith('.aac') ||
    url.endsWith('.ogg') ||
    url.endsWith('.wav') ||
    url.includes('stream') ||
    url.includes('icecast') ||
    url.includes('shoutcast')
  ) {
    return {
      id: `custom:audio-${Date.now()}`,
      title: customTitle || 'Live Audio / Radio Stream',
      description: `User-imported audio stream: ${url}`,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      videoUrl: url,
      audioUrl: url,
      playbackUrl: url,
      duration: 0,
      source: 'radio',
      sourceName: 'Custom Audio',
      sourceLabel: 'Audio Stream',
      author: 'Audio Station',
      channel: 'Custom Audio',
      publishedAt: 'Direct Stream',
      license: 'Public Audio License',
      playerType: 'audio',
      metadata: { playerType: 'audio', streamType: 'audio_stream' },
    };
  }

  // 6. Direct MP4, WebM, MOV, OGG, or any other video URL
  return {
    id: `custom:video-${Date.now()}`,
    title: customTitle || 'Direct Video Stream',
    description: `User-imported direct video link: ${url}`,
    thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80',
    videoUrl: url,
    playbackUrl: url,
    duration: 0,
    source: 'all',
    sourceName: 'Direct Video URL',
    sourceLabel: 'Direct Link',
    author: 'Direct URL',
    channel: 'Custom Video Player',
    publishedAt: 'Direct Link',
    license: 'Direct Link License',
    playerType: 'html5',
    metadata: { playerType: 'html5', directStream: true },
  };
}
