const storageKey = 'zx_builder_theme';

export function readStudioTheme() {
  try { return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function saveStudioTheme(theme) {
  try { localStorage.setItem(storageKey, theme); }
  catch { /* Keep the session preference when browser storage is unavailable. */ }
}
