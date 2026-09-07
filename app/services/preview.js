import DOMPurify from 'dompurify';
import { runtimeNodes } from '../../domain/nodes.js';

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^on/i.test(key) && !['srcdoc', '__proto__', 'constructor', 'prototype'].includes(key))
    .map(([key, item]) => [key, clean(item)]));
  if (typeof value === 'string') {
    if (/^\s*(javascript|vbscript|data\s*:\s*text\/html)/i.test(value)) return '';
    return value.includes('<') ? DOMPurify.sanitize(value, { ADD_ATTR: ['target'], FORBID_TAGS: ['style', 'iframe', 'form'] }) : value;
  }
  return value;
}
export function previewNodes(instance, editable) {
  editable = editable && !instance.definition.sourceKey;
  const nodes = clean(runtimeNodes(instance.definition, instance.data, editable));
  function annotate(list) {
    list.forEach(node => {
      if (editable) node.props.draggable = true;
      if (node.children) annotate(node.children);
    });
  }
  annotate(nodes);
  return nodes;
}
