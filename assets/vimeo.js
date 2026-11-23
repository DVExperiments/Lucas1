// Extract a Vimeo player URL without inserting the supplied embed markup into the page.
export function vimeoPlayer(input) {
  const value = input.trim();
  const iframe = value.startsWith('<') ? value.match(/<iframe\b[^>]*>/i)?.[0] : undefined;
  const source = iframe ? iframe.match(/\s+src\s*=\s*(["'])([^"']+)\1/i)?.[2] : value;
  if (!source) return '';
  try {
    const url = new URL(source.replace(/&amp;/g, '&'));
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return '';
    const player = url.hostname === 'player.vimeo.com';
    if (!player && !['vimeo.com', 'www.vimeo.com'].includes(url.hostname)) return '';
    const parts = player
      ? url.pathname.match(/^\/video\/(\d+)\/?$/)
      : url.pathname.match(/^\/(\d+)(?:\/([a-z0-9]+))?\/?$/i);
    if (!parts) return '';
    const hash = url.searchParams.get('h') ?? parts[2];
    if (hash !== undefined && !/^[a-z0-9]+$/i.test(hash)) return '';
    const result = new URL('https://player.vimeo.com/video/' + parts[1]);
    if (hash) result.searchParams.set('h', hash);
    result.searchParams.set('dnt', '1');
    return result.href;
  } catch {
    return '';
  }
}
