import { useSupabaseClient } from './supabase.js';
import { fontEntry, fontUrl } from '../../domain/fonts.js';

export function parseFontLink(input) {
  let href = input.trim();
  if (href.startsWith('<')) {
    const doc = new DOMParser().parseFromString(href, 'text/html');
    const links = [...doc.querySelectorAll('link[rel~="stylesheet"]')];
    if (links.length !== 1) throw new Error('zx_builder_fonts_invalid');
    href = links[0].getAttribute('href') ?? '';
  }
  href = fontUrl(href);
  const url = new URL(href);
  const families = url.hostname === 'fonts.googleapis.com'
    ? url.searchParams.getAll('family').flatMap(value => value.split('|')).map(value => value.split(':')[0]) : [];
  return { href, families };
}
export async function listFonts(search = '', page = 0) {
  let query = useSupabaseClient().from('font_library').select('id, family, href, owner_id, updated_at').is('archived_at', null);
  if (search.trim()) query = query.ilike('family', '%' + search.trim().replace(/[\\%_]/g, '\\$&') + '%');
  const { data, error } = await query.order('family').order('id').range(page * 24, page * 24 + 24);
  if (error) throw error;
  return { entries: data.slice(0, 24), hasMore: data.length > 24 };
}
export async function saveFont({ family, href }, userId, existing) {
  const entry = fontEntry({ id: existing?.id ?? crypto.randomUUID(), family, href });
  let query = useSupabaseClient().from('font_library');
  query = existing ? query.update({ family: entry.family, href: entry.href }).eq('id', existing.id).eq('updated_at', existing.updated_at)
    : query.insert({ ...entry, owner_id: userId });
  const { data, error } = await query.select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('zx_builder_fonts_changed');
  return data;
}
export async function archiveFont(entry) {
  const { data, error } = await useSupabaseClient().from('font_library').update({ archived_at: new Date().toISOString() })
    .eq('id', entry.id).eq('updated_at', entry.updated_at).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('zx_builder_fonts_changed');
}

export function createFontLoader(onError) {
  const sheets = new Map();
  const failed = new Set();
  function report() { onError([...failed]); }
  return {
    apply(fonts = []) {
      const urls = new Set(fonts.map(entry => fontEntry(entry).href));
      for (const [href, link] of sheets) {
        if (!urls.has(href)) { link.onload = null; link.onerror = null; link.remove(); sheets.delete(href); failed.delete(href); }
      }
      for (const href of urls) {
        if (sheets.has(href)) continue;
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = href;
        link.dataset.studioFont = '';
        link.onload = () => { failed.delete(href); report(); };
        link.onerror = () => { failed.add(href); report(); };
        sheets.set(href, link);
        document.head.appendChild(link);
      }
      report();
    },
    dispose() {
      for (const link of sheets.values()) { link.onload = null; link.onerror = null; link.remove(); }
      sheets.clear(); failed.clear();
    }
  };
}
