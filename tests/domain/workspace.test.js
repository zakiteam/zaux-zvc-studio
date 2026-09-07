import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createWorkspace, createInstance } from '../../domain/workspace.js';
import { runtimeRoot, moveNode, getValue, createNode, bind } from '../../domain/nodes.js';
import { componentFiles, documentEnvelope, parseDocument } from '../../domain/export.js';
import { validateWorkspace, parseJson } from '../../domain/validation.js';

test('template instances own independent copies, including nested nodes and defaults', () => {
  const workspace = createWorkspace();
  const definition = workspace.library[0];
  const first = createInstance(definition);
  const second = createInstance(definition);
  first.definition.tree[0].props.size = 'xs';
  first.definition.fields[0].default = 'Changed';
  assert.equal(definition.tree[0].props.size, 'l');
  assert.equal(second.definition.tree[0].props.size, 'l');
  assert.notEqual(first.definition.tree[0].id, second.definition.tree[0].id);
  assert.notEqual(first.definition.fields[0].default, second.definition.fields[0].default);
});
test('workspace JSON round trip preserves names, data, bindings and CSS', () => {
  const workspace = createWorkspace();
  workspace.templates[0].instances[0].data.title = 'Example';
  workspace.library[0].css = '.my-section { color: green; }';
  const imported = parseDocument(JSON.stringify(documentEnvelope('workspace', workspace)));
  assert.deepEqual(imported.data, workspace);
  assert.deepEqual(validateWorkspace(workspace), workspace);
});
test('node moves prevent ancestry cycles and handle indices in the same list', () => {
  const child = createNode('p'); const parent = createNode('div', {}, [child]); const sibling = createNode('p');
  const nodes = [parent, sibling];
  assert.equal(moveNode(nodes, parent.id, child.id, 'inside'), false);
  assert.equal(moveNode(nodes, parent.id, sibling.id, 'after'), true);
  assert.deepEqual(nodes.map(node => node.id), [sibling.id, parent.id]);
  assert.equal(moveNode(nodes, sibling.id, child.id, 'after'), true);
  assert.deepEqual(parent.children.map(node => node.id), [child.id, sibling.id]);
});
test('generated ZVC JavaScript and runtime JSON render the same nested data', () => {
  const definition = createWorkspace().library[0];
  definition.tree[0].props.test = { title: bind('title'), items: [false, 0, bind('eyelet')] };
  definition.fields[1].default = 'quote " slash \\ newline\n${notCode}';
  const files = componentFiles(definition);
  const source = Object.values(files)[0].replace(/^import .*;\n/gm, '').replace('export default', 'globalThis.result =');
  const defaults = JSON.parse(Object.entries(files).find(([name]) => name.endsWith('.defaults.js'))[1].replace(/^export default /, '').replace(/;\n$/, ''));
  const meta = JSON.parse(Object.entries(files).find(([name]) => name.endsWith('.meta.js'))[1].replace(/^export default /, '').replace(/;\n$/, ''));
  const context = { defaults, meta, ZVCHelper: { getValue, renderNode: value => ({ ...value.meta, ...value.node }) } };
  vm.runInNewContext(source, context);
  const data = { eyelet: false, title: 'Custom title' };
  assert.deepEqual(JSON.parse(JSON.stringify(context.result.buildNode(data))), runtimeRoot(definition, data));
  assert.equal(context.result.buildNode({}).props.components[0].props.test.title, defaults.title);
  assert.equal(source.includes('data-zb-node'), false);
});
test('imports reject unsupported schemas, dangerous keys and duplicate node IDs', () => {
  assert.throws(() => parseDocument('{"schemaVersion":99}'));
  assert.throws(() => parseJson('{"__proto__":{"polluted":true}}'));
  assert.equal({}.polluted, undefined);
  const workspace = createWorkspace();
  workspace.library[0].tree.push(workspace.library[0].tree[0]);
  assert.throws(() => validateWorkspace(workspace));
});
test('flat dotted keys match Zaux getValue precedence and preserve false / zero', () => {
  assert.equal(getValue({ 'a.b': 0, a: { b: 3 } }, 'a.b'), 0);
  assert.equal(getValue({ a: { b: false } }, 'a.b'), false);
});
