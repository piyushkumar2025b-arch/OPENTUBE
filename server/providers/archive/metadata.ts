export interface ArchiveMetadataFile {
  name: string;
  format?: string;
  size?: string;
  source?: string;
}

export async function fetchArchivePlayableUrl(identifier: string, timeoutMs = 4000): Promise<string | null> {
  const url = `https://archive.org/metadata/${encodeURIComponent(identifier)}/files`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OpenTube/1.0 (https://github.com/opentube)' },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = await res.json();
    const files: ArchiveMetadataFile[] = data.result || data.files || [];

    // Prioritize 512kb/h.264 mp4 or standard webm/mp4 files
    const mp4File = files.find(
      (f) =>
        typeof f.name === 'string' &&
        f.name.toLowerCase().endsWith('.mp4') &&
        !f.name.includes('_ia.mp4') &&
        !f.name.includes('_thumb')
    );

    const webmFile = files.find(
      (f) => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.webm')
    );

    const chosen = mp4File || webmFile;
    if (chosen && chosen.name) {
      return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(chosen.name)}`;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
