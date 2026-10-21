import { clone } from './nodes.js';

// Pure operations behind the shared list editor (BuilderSortableList): each returns a new
// array and leaves the input untouched. Out-of-range indexes return the list unchanged.

export function moveItem(list, from, to) {
  if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const result = [...list];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function duplicateItem(list, index, copy = clone) {
  if (index < 0 || index >= list.length) return list;
  const result = [...list];
  result.splice(index + 1, 0, copy(list[index]));
  return result;
}

export function removeItem(list, index) {
  if (index < 0 || index >= list.length) return list;
  return list.filter((_, position) => position !== index);
}

// Index-keyed UI state (collapsed rows, selection) after one of the operations above.
export function remapIndex(index, op) {
  if (index === null || index === undefined) return index;
  if (op.type === 'move') {
    if (index === op.from) return op.to;
    if (op.from < index && index <= op.to) return index - 1;
    if (op.to <= index && index < op.from) return index + 1;
    return index;
  }
  if (op.type === 'duplicate') return index > op.index ? index + 1 : index;
  if (op.type === 'remove') return index === op.index ? null : index > op.index ? index - 1 : index;
  return index;
}
