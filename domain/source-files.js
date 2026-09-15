// Bundle relative imports from trusted repository sources without changing vendor.
// Aliases and package imports keep their destination-project meaning.
export function localSourceFiles(directory, sources) {
  const normalize = path => {
    const parts = [];
    for (const part of path.split('/')) {
      if (part === '..') parts.pop();
      else if (part && part !== '.') parts.push(part);
    }
    return parts.join('/');
  };
  const available = Object.fromEntries(Object.entries(sources).map(([path, content]) => [normalize(path), content]));
  const root = normalize(directory) + '/';
  const outputPath = path => path.startsWith(root) ? path.slice(root.length) : '_dependencies/' + path;
  function relative(from, to) {
    const parent = from.split('/').slice(0, -1);
    const target = to.split('/');
    while (parent.length && target.length && parent[0] === target[0]) { parent.shift(); target.shift(); }
    return './' + '../'.repeat(parent.length) + target.join('/');
  }
  const files = {};
  const visited = new Set();
  function add(path) {
    if (visited.has(path)) return;
    visited.add(path);
    let content = available[path];
    if (path.endsWith('.js')) {
      content = content.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(\.[^'"]+)\2/g, (match, start, quote, specifier) => {
        const base = normalize(path.slice(0, path.lastIndexOf('/') + 1) + specifier);
        const resolved = [base, base + '.js', base + '.json', base + '/index.js'].find(candidate => Object.hasOwn(available, candidate));
        if (!resolved) return match;
        add(resolved);
        return start + quote + relative(outputPath(path), outputPath(resolved)) + quote;
      });
    }
    files[outputPath(path)] = content;
  }
  Object.keys(available).filter(path => path.startsWith(root)).forEach(add);
  return files;
}
