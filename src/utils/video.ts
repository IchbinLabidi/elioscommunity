export type VideoSourceType = 'html5' | 'youtube' | 'vimeo' | 'iframe' | 'external';

export function isDirectVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

export function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
    if (!id && parsed.pathname.includes('/embed/')) return url;
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function getVimeoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
    return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
  } catch {
    return null;
  }
}

export function getGoogleDriveEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('drive.google.com')) return null;
    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    return match?.[1] ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
  } catch {
    return null;
  }
}

export function getVideoSourceType(url?: string | null): VideoSourceType {
  if (!url) return 'external';
  if (isDirectVideoUrl(url) || url.includes('supabase.co/storage/')) return 'html5';
  if (getYouTubeEmbedUrl(url)) return 'youtube';
  if (getVimeoEmbedUrl(url)) return 'vimeo';
  if (getGoogleDriveEmbedUrl(url)) return 'iframe';
  return 'external';
}

export function getEmbeddableVideoUrl(url: string) {
  return getYouTubeEmbedUrl(url) ?? getVimeoEmbedUrl(url) ?? getGoogleDriveEmbedUrl(url) ?? url;
}
