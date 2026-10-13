import { clone, uid } from './nodes.js';
import { validateDefinition } from './validation.js';

// Compact editable JSON for the Code tab: { fields, nodes } where nodes use the
// Zaux shape { name, props, children? }. Node ids, variants and captured
// partials stay out of the text; applying reconciles ids with the current tree.
const NODE_KEYS = ['name', 'props', 'children'];
const DOCUMENT_KEYS = ['fields', 'nodes'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function requireCompact(condition) { if (!condition) throw new Error('zx_builder_invalid_compact_json'); }

function compactNodes(tree) {
  return tree.map(node => ({ name: node.name, props: clone(node.props), ...(node.children.length ? { children: compactNodes(node.children) } : {}) }));
}
export function compactDefinition(definition) {
  return { fields: clone(definition.fields), nodes: compactNodes(definition.tree) };
}

// Match each input node with a previous sibling of the same name: identical
// props first (so inserting a node keeps the ids of the untouched siblings),
// then the first remaining same-name sibling in order. Matched nodes keep id
// and sourceNodeId provenance; the rest receive new ids.
function reconcile(input, previous, state, depth = 0) {
  requireCompact(Array.isArray(input) && depth < 30);
  for (const item of input) {
    requireCompact(object(item) && Object.keys(item).every(key => NODE_KEYS.includes(key)));
    requireCompact(typeof item.name === 'string' && item.name.trim() && object(item.props));
    requireCompact(item.children === undefined || Array.isArray(item.children));
    requireCompact(++state.count <= 2000);
  }
  const used = new Set();
  const matches = input.map(() => null);
  const signature = props => JSON.stringify(props);
  input.forEach((item, index) => {
    const found = previous.findIndex((node, i) => !used.has(i) && node.name === item.name && signature(node.props) === signature(item.props));
    if (found >= 0) { used.add(found); matches[index] = previous[found]; }
  });
  input.forEach((item, index) => {
    if (matches[index]) return;
    const found = previous.findIndex((node, i) => !used.has(i) && node.name === item.name);
    if (found >= 0) { used.add(found); matches[index] = previous[found]; }
  });
  return input.map((item, index) => {
    const match = matches[index];
    const node = { id: match?.id ?? uid(), name: item.name, props: clone(item.props), children: reconcile(item.children ?? [], match?.children ?? [], state, depth + 1) };
    if (match?.sourceNodeId) node.sourceNodeId = match.sourceNodeId;
    return node;
  });
}

// Accepts { fields?, nodes } or a bare node array (fields unchanged). Returns the
// validated fields and tree to assign to the definition; the input is not mutated.
export function applyCompactDefinition(definition, value) {
  const document = Array.isArray(value) ? { nodes: value } : value;
  requireCompact(object(document) && Object.keys(document).every(key => DOCUMENT_KEYS.includes(key)));
  requireCompact(Array.isArray(document.nodes) && (document.fields === undefined || Array.isArray(document.fields)));
  const fields = document.fields === undefined ? clone(definition.fields) : clone(document.fields);
  const tree = reconcile(document.nodes, definition.tree, { count: 0 });
  validateDefinition({ ...clone(definition), fields, tree });
  return { fields, tree };
}
