// Pure bridge logic. No browser IO, no Vue; operates on the starter export
// output and produces what should be written directly into a Zaux repository.

const FONT_BLOCK_START = '<!-- zaux-studio:project-fonts:start -->';
const FONT_BLOCK_END = '<!-- zaux-studio:project-fonts:end -->';

// Starter ZIP artifacts that have no place when writing straight into a Zaux
// repository (the destination keeps its own README; fonts go to preview-head).
const SKIP_PATHS = new Set(['README.md', 'fonts.html', 'fonts.json']);

function parseVersion(value) {
  const parts = String(value ?? '').trim().split('.');
  return parts.map(part => (/^\d+$/.test(part) ? Number(part) : 0))
    .concat([0, 0, 0]).slice(0, 3);
}

export function compareZauxVersions(builderVersion, destinationVersion) {
  const builder = parseVersion(builderVersion);
  const destination = parseVersion(destinationVersion);
  const match = builder.length === destination.length
    && builder.every((part, index) => part === destination[index]);
  return { match, builder: String(builderVersion ?? '').trim(), destination: String(destinationVersion ?? '').trim() };
}

// Split the starter file map into (a) files to copy into the repository and
// (b) the font <link> fragment that should live in .storybook/preview-head.html.
export function bridgeFiles(files = {}) {
  const fontLinks = typeof files['fonts.html'] === 'string' ? files['fonts.html'].trim() : '';
  const projectFiles = Object.fromEntries(
    Object.entries(files).filter(([path]) => !path.startsWith('studio/') && !SKIP_PATHS.has(path))
  );
  return { projectFiles, fontLinks };
}

function tidy(html) {
  const text = html.replace(/\n{3,}/g, '\n\n').trim();
  return text ? text + '\n' : '';
}

// Idempotently merge the Studio font links into an existing preview-head.html.
// A marked block is replaced on re-export so repeated runs do not accumulate.
export function mergePreviewHead(existing, fontLinks) {
  const html = existing == null ? '' : String(existing);
  const links = String(fontLinks ?? '').trim();
  const block = links ? `${FONT_BLOCK_START}\n${links}\n${FONT_BLOCK_END}` : '';
  const start = html.indexOf(FONT_BLOCK_START);
  const end = start === -1 ? -1 : html.indexOf(FONT_BLOCK_END, start);
  if (start !== -1 && end !== -1) {
    return tidy(html.slice(0, start) + block + html.slice(end + FONT_BLOCK_END.length));
  }
  if (!block) return html;
  return html.trim() ? html.replace(/\s+$/, '') + '\n\n' + block + '\n' : block + '\n';
}
