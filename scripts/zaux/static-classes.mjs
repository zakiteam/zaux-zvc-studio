import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Lists the classes the static stylesheets already contain (content scan + safelist),
// so the runtime endpoint emits only what is missing. Uses the Tailwind 3.4.17
// internals already relied on by integrations/zaux/tailwind-assistance.js.
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

export function generateStaticClasses() {
  const loadConfig = require('tailwindcss/loadConfig.js');
  const resolveConfig = require('tailwindcss/resolveConfig.js');
  const { createContext } = require('tailwindcss/lib/lib/setupContextUtils.js');
  const { defaultExtractor } = require('tailwindcss/lib/lib/defaultExtractor.js');
  const { generateRules } = require('tailwindcss/lib/lib/generateRules.js');
  const glob = require('fast-glob');
  const config = loadConfig(resolve(root, 'integrations/zaux/tailwind.config.js'));
  // Creating the context expands the safelist into changedContent.
  const context = createContext(resolveConfig(config));
  const extract = defaultExtractor(context);
  const candidates = new Set();
  for (const item of context.changedContent) for (const candidate of extract(item.content)) candidates.add(candidate);
  for (const file of glob.sync(config.content)) for (const candidate of extract(readFileSync(file, 'utf8'))) candidates.add(candidate);
  generateRules(candidates, context);
  const text = JSON.stringify([...context.classCache.keys()].sort()) + '\n';
  const output = resolve(root, 'integrations/zaux/generated/static-classes.json');
  if (!existsSync(output) || readFileSync(output, 'utf8') !== text) writeFileSync(output, text);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generateStaticClasses();
