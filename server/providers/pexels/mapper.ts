import { MediaItem } from '../../types/media';
import { validateMediaItem } from '../../engine/validator';

export function mapPexelsVideo(rawVideo: any): MediaItem | null {
  if (!rawVideo || !rawVideo.id) return null;

  const id = String(rawVideo.id);
  const user = rawVideo.user || {};

  // Extract best quality playable MP4 (prefer HD/SD with link)
  const videoFiles: any[] = rawVideo.video_files || [];
  const hdFile = videoFiles.find((f) => f.quality === 'hd' && f.link && f.file_type?.includes('mp4'));
  const fallbackFile = videoFiles.find((f) => f.link && (f.file_type?.includes('mp4') || !f.file_type));
  const bestFile = hdFile || fallbackFile || videoFiles[0];

  const playbackUrl = bestFile?.link || null;

  // Build clean title from video URL slug or photographer
  let title = 'Pexels Stock Footage';
  if (rawVideo.url && typeof rawVideo.url === 'string') {
    const slugMatch = rawVideo.url.match(/video\/([^/]+)-(\d+)\/?$/);
    if (slugMatch && slugMatch[1]) {
      title = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  if (title === 'Pexels Stock Footage' && user.name) {
    title = `Stock Video by ${user.name}`;
  }

  return validateMediaItem(
    {
      id,
      provider: 'pexels',
      title,
      description: `Free stock footage provided by ${user.name || 'Pexels creator'} on Pexels.`,
      mediaType: 'video',
      thumbnailUrl: rawVideo.image || undefined,
      sourceUrl: rawVideo.url || `https://www.pexels.com/video/${id}/`,
      playbackUrl,
      embedUrl: null,
      duration: rawVideo.duration || undefined,
      creator: user.name || 'Pexels Contributor',
      channel: 'Pexels Video',
      license: {
        name: 'Pexels License (Free for commercial & personal use, no attribution required)',
        url: 'https://www.pexels.com/license/',
        commercialUse: true,
        attributionRequired: false,
      },
      metadata: {
        width: rawVideo.width,
        height: rawVideo.height,
        authorUrl: user.url,
        videoFilesCount: videoFiles.length,
      },
    },
    'pexels'
  );
}
