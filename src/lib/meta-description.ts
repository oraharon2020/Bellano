/**
 * A search-result description out of WordPress HTML: the words a reader sees,
 * on one line, cut at a word near `max` characters.
 *
 * Almost no Bellano product has a Yoast meta description, so this is what
 * Google shows under most of them. It used to be the long description's first
 * 160 characters with only the tags taken out — line breaks, tab bullets and
 * the spec list included ("מידות ומפרט טכני\r\n\r\nמידות הכורסה:\r\n\r\n \tרוחב
 * כללי: 84 ס”מ"), on 50 of 50 products sampled (15/11/2026).
 */
export function metaDescription(html: string | null | undefined, max = 155): string {
  const text = (html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[\s,.;:–-]+$/, '')}…`;
}
