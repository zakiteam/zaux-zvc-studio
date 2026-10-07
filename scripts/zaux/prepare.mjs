import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass';
import postcss from 'postcss';
import { generateThemeCatalog } from './theme-catalog.mjs';
import { generateStaticClasses } from './static-classes.mjs';
import { installZaux } from './install.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = resolve(root, 'vendor/zaux');
const output = resolve(root, 'integrations/zaux/generated');
const release = await installZaux();
mkdirSync(output, { recursive: true });
const slash = value => value.replaceAll('\\', '/');
const toImport = path => './' + slash(relative(output, path));
function filesIn(folder, recursive = true) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(folder, entry.name);
    return entry.isDirectory() ? (recursive ? filesIn(path) : []) : [path];
  }).sort();
}
function write(name, text) {
  const path = resolve(output, name);
  if (!existsSync(path) || readFileSync(path, 'utf8') !== text) writeFileSync(path, text);
}

// Match Zaux's registration convention: direct files in each component folder.
const componentName = path => path.endsWith('.zvc.js') ? 'ZVC' + basename(path, '.zvc.js').replace(/(^|-)(\w)/g, (_, dash, letter) => letter.toUpperCase()) : basename(path, '.vue');
// Case-only duplicates (Zsection.vue next to ZSection.vue) exist once on disk; the
// installer records them so the other upstream name is still registered.
const caseVariants = (release?.caseVariants ?? []).map(variant => ({ name: componentName(variant.path), file: resolve(source, variant.file) }));
for (const area of ['core', 'project']) {
  for (const kind of ['common', 'shared', 'utils', 'overrides', 'virtual']) {
    const folder = resolve(source, area, 'components', kind);
    const files = existsSync(folder) ? readdirSync(folder, { withFileTypes: true })
      .filter(entry => entry.isDirectory()).flatMap(entry => filesIn(resolve(folder, entry.name), false)) : [];
    const exports = files.filter(path => (path.endsWith('.vue') && !path.endsWith('.docs.vue')) || path.endsWith('.zvc.js'))
      .flatMap(path => [componentName(path), ...caseVariants.filter(variant => variant.file === path).map(variant => variant.name)]
        .map(name => `export { default as ${name} } from ${JSON.stringify(toImport(path))};`));
    write(`${area}-${kind}.js`, exports.join('\n') + '\n');
  }
  const templates = filesIn(resolve(source, area, 'templates')).filter(path => path.endsWith('.tpl.js'));
  write(`${area}-templates.js`, templates.map((path, i) => `export { default as Template${i} } from ${JSON.stringify(toImport(path))};`).join('\n') + '\n');
}

const baseStyles = ['styles/scrollbars', 'styles/base', 'styles/animations', 'styles/vue-transitions', 'styles/typography', 'utilities/gradients'];
const styles = baseStyles.map(name => resolve(source, `core/style/${name}.scss`));
for (const area of ['core', 'project']) {
  styles.push(...filesIn(resolve(source, area, 'components')).filter(path => path.endsWith('.scss') && !path.includes(`${area}/storybook`)));
}
write('styles.scss', [...new Set(styles)].map(path => `@use ${JSON.stringify(toImport(path))} as *;`).join('\n') + '\n');

// Zaux declares some utilities inside SCSS @layer blocks (scrollbar themes and sizes,
// gradient directions...). Tailwind purges them unless a scanned file names them, and
// Sass generates part of the names, so the local safelist receives the compiled list.
const zxCore = pathToFileURL(resolve(source, 'core') + '/');
const layerClasses = new Set();
for (const path of new Set(styles)) {
  if (!readFileSync(path, 'utf8').includes('@layer')) continue;
  try {
    const { css } = sass.compile(path, {
      importers: [{ findFileUrl: url => url.startsWith('@zx_core/') ? new URL(url.slice('@zx_core/'.length), zxCore) : null }],
      logger: sass.Logger.silent
    });
    postcss.parse(css).walkAtRules('layer', layer => layer.walkRules(rule => {
      for (const match of rule.selector.matchAll(/\.(-?-?[A-Za-z_][\w-]*)/g)) layerClasses.add(match[1]);
    }));
  } catch (error) {
    console.warn(`Zaux layer classes skipped for ${slash(relative(root, path))}: ${error.message}`);
  }
}
write('layer-classes.json', JSON.stringify([...layerClasses].sort(), null, 2) + '\n');

// The upstream configuration expects generated local files. Redirect only those
// imports here; the installed release is never a write destination.
const tailwindPath = resolve(source, 'style/tailwind.config.js');
const tailwind = readFileSync(tailwindPath, 'utf8').replace(/from\s+(["'])(\.[^"']+)\1/g, (match, quote, specifier) => {
  const path = specifier.includes('_local/tailwind') ? resolve(root, 'integrations/zaux/safelist.js') : resolve(dirname(tailwindPath), specifier);
  return `from ${JSON.stringify(toImport(path))}`;
}).replace(/from\s+(["'])tailwindcss\/plugin\1/g, 'from "tailwindcss/plugin.js"');
write('tailwind.source.js', tailwind);
const { default: loadConfig } = await import('tailwindcss/loadConfig.js');
const { default: resolveConfig } = await import('tailwindcss/resolveConfig.js');
const resolvedConfig = resolveConfig(loadConfig(resolve(output, 'tailwind.source.js')));
write('tailwind.runtime.json', JSON.stringify({ theme: resolvedConfig.theme }));
const attributes = {};
for (const area of ['core', 'project']) {
  for (const file of filesIn(resolve(source, area, 'components')).filter(file => file.endsWith('.vue'))) {
    const keys = [...readFileSync(file, 'utf8').matchAll(/attributes\??\.([\w-]+)/g)].map(match => match[1]);
    if (keys.length) attributes[basename(file, '.vue')] = [...new Set(keys)].sort();
  }
}
write('attributes-hooks.json', JSON.stringify(attributes, null, 2));
generateThemeCatalog();
generateStaticClasses();
console.log('Zaux bridge prepared outside the read-only release.');
