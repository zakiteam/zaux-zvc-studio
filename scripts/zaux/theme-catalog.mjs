import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';
import { ruleConditions } from '../../domain/component-themes.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = resolve(root, 'vendor/zaux');
function filesIn(folder) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? filesIn(resolve(folder, entry.name)) : [resolve(folder, entry.name)]).sort();
}

export function generateThemeCatalog() {
  const catalog = [];
  for (const file of ['core', 'project'].flatMap(area => filesIn(resolve(source, area, 'components'))).filter(file => file.endsWith('.theme.scss'))) {
    const text = readFileSync(file, 'utf8');
    const componentClass = text.match(/\$component\s*:\s*["']([^"']+)/)?.[1];
    const names = new Set([...text.matchAll(/(--zx-[\w-]+)\s*:/g)].map(match => match[1]));
    if (!names.size) continue;
    const css = compile(file, {
      logger: { warn() {}, debug() {} },
      importers: [{ findFileUrl(url) {
        const match = url.match(/^@zx_(core|project|style)\/(.*)$/);
        return match ? pathToFileURL(resolve(source, match[1], match[2])) : null;
      } }]
    }).css;
    const rules = [];
    postcss.parse(css).walkRules(rule => {
      const variables = Object.fromEntries((rule.nodes ?? []).filter(node => node.type === 'decl' && names.has(node.prop)).map(node => [node.prop, node.value]));
      if (!Object.keys(variables).length) return;
      const conditions = ruleConditions(rule);
      if (conditions === null) return;
      const key = JSON.stringify([rule.selector, conditions]);
      const existing = rules.find(item => item.key === key);
      if (existing) Object.assign(existing.variables, variables);
      else rules.push({ key, selector: rule.selector, conditions, variables });
    });
    const name = basename(file, '.theme.scss');
    const themes = [...new Set([...css.matchAll(/--theme-([\w-]+)/g)].map(match => match[1]))];
    const variables = [...new Set([...text.matchAll(/(--zx-[\w-]+)/g)].map(match => match[1]).filter(name => name.startsWith('--zx-' + componentClass + '-')))];
    catalog.push({ id: name, componentClass, variables, source: relative(root, file).replaceAll('\\', '/'), themes, rules });
  }
  const output = resolve(root, 'integrations/zaux/generated');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'component-themes.json'), JSON.stringify(catalog, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generateThemeCatalog();
