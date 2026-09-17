import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import defaults from '../../app/zvc/starterhero/data/StarterHero.defaults.js';
import { definitionFromSource, refreshSource, sourceTree } from '../../domain/source-zvc.js';
import { dataFor, getValue, clone } from '../../domain/nodes.js';
import { createInstance, createWorkspace } from '../../domain/workspace.js';
import { validateDefinition, validateWorkspace } from '../../domain/validation.js';
import { isFieldVisible, fieldInputType } from '../../domain/fields.js';
import { documentEnvelope, parseDocument } from '../../domain/export.js';
import { iconAliases } from '../../app/data/icons.js';

// Execute the actual example module; only its imports are provided by this fixture.
function loadExample() {
  const evaluate = (file, imports) => {
    const source = fs.readFileSync(file, 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export default', 'globalThis.result =');
    const context = { ...imports };
    vm.runInNewContext(source, context);
    return context.result;
  };
  const meta = evaluate('app/zvc/starterhero/StarterHero.meta.js', { defaults });
  return evaluate('app/zvc/starterhero/StarterHero.zvc.js', { defaults, meta, ZVCHelper: { getValue, renderNode: node => ({ ...node.meta, ...node.node }) } });
}
test('native Zaux buildNode keeps conditions, independent values and reloadable JSON', () => {
  const module = loadExample();
  const definition = definitionFromSource('starterhero/StarterHero.zvc.js', module, defaults);
  const first = createInstance(definition);
  const second = createInstance(definition);
  first.data = { title: 'Changed', showButton: false };
  refreshSource(first.definition, first.data, module);
  refreshSource(second.definition, second.data, module);
  assert.equal(first.definition.exportName, 'ZVCStarterHero');
  assert.equal(first.definition.tree[0].children[0].props.title, 'Changed');
  assert.equal(first.definition.tree[0].children[0].props.ctas.length, 0);
  assert.equal(second.definition.tree[0].children[0].props.ctas.length, 1);
  assert.equal(dataFor(definition).showButton, true);
  validateDefinition(first.definition);
  const workspace = createWorkspace();
  workspace.library.push(definition);
  workspace.templates[0].instances.push(first, second);
  assert.deepEqual(parseDocument(JSON.stringify(documentEnvelope('workspace', workspace))).data, workspace);
  validateWorkspace(workspace);
  const snapshot = clone(first.definition.tree);
  assert.equal(refreshSource(first.definition, first.data, undefined), false);
  assert.deepEqual(first.definition.tree, snapshot);
});
test('native defaults preserve unexposed values and field conditions follow the Zaux contract', () => {
  const definition = { defaults: { extra: 4, empty: '', zero: 0, enabled: true }, fields: [{ key: 'enabled', type: 'switch', default: false }, { key: 'zero', type: 'number' }] };
  assert.deepEqual(dataFor(definition), { extra: 4, empty: '', zero: 0, enabled: false });
  assert.equal(isFieldVisible({ showIf: { field: 'a', value: false } }, { a: false }), true);
  assert.equal(isFieldVisible({ showIf: [{ field: 'a', operator: 'gt', value: 2 }, { field: 'b', operator: 'contains', value: 'x' }] }, { a: 3, b: ['x'] }), true);
  assert.equal(isFieldVisible({ showIf: { field: 'a', operator: 'notEmpty' } }, { a: 0 }), false);
  assert.equal(fieldInputType({ type: 'buttongroup' }), 'buttongroup');
  assert.equal(sourceTree({ name: 'ComponentsRenderer', props: { components: [{ name: 'p', props: { textContent: 'Text' } }] } }, 'test')[0].name, 'p');
});
test('all static builder icons resolve to symbols supplied by the read-only Zaux dependency', () => {
  const set = JSON.parse(fs.readFileSync('vendor/zaux/public/assets/icon/zaux/selection.json', 'utf8'));
  const names = new Set(set.icons.map(icon => icon.properties.name));
  const files = fs.readdirSync('app/components/builder').filter(file => file.endsWith('.vue'));
  for (const file of files) {
    const source = fs.readFileSync('app/components/builder/' + file, 'utf8');
    for (const [, icon] of source.matchAll(/(?<!:)icon="([\w-]+)"/g)) assert.ok(names.has(iconAliases[icon] ?? icon), file + ': ' + icon);
  }
});
