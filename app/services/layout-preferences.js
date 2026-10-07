const storageKey = 'zx_builder_layout';

// Per-browser panel sizes; never part of project data or exports.
export function readLayoutPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function saveLayoutPreferences(preferences) {
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); }
  catch { /* Keep the session layout when browser storage is unavailable. */ }
}

const hubKey = 'zx_builder_hub';

// Per-browser project list view, sort and filter.
export function readHubPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(hubKey) ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function saveHubPreferences(preferences) {
  try { localStorage.setItem(hubKey, JSON.stringify(preferences)); }
  catch { /* Keep the session choice when browser storage is unavailable. */ }
}
