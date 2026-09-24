import { descendingStyles, styleScreens } from '../integrations/zaux/responsive-styles.js';
import { literalClasses, readStyleClass, readStyleImportant, replaceStyleClass, setStyleImportant } from './node-styles.js';

// A small adapter over the native class editor; no second persisted style model.
function valuesFor(value, control) {
  let current = readStyleClass(value, control);
  return styleScreens.map(screen => {
    const local = readStyleClass(value, control, screen.value);
    if (local && (!current.startsWith('!') || local.startsWith('!'))) current = local;
    return current;
  });
}

export function readResponsiveStyle(value, control, scope = '') {
  if (!descendingStyles) return readStyleClass(value, control, scope);
  if (control.globalSides) {
    // Reuse native shorthand aggregation on the effective side values.
    const classes = control.globalSides.map(side => readResponsiveStyle(value, side, scope)).filter(Boolean).join(' ');
    return readStyleClass(classes, control);
  }
  const index = scope ? styleScreens.findIndex(screen => screen.value === scope) : styleScreens.length - 1;
  return index < 0 ? readStyleClass(value, control, scope) : valuesFor(value, control)[index];
}

export function readResponsiveImportant(value, control, scope = '') {
  if (!descendingStyles) return readStyleImportant(value, control, scope);
  const values = (control.globalSides ?? [control]).map(side => readResponsiveStyle(value, side, scope)).filter(Boolean);
  return values.length > 0 && values.every(item => item.startsWith('!'));
}

export function needsResponsiveBase(value, control, scope) {
  return descendingStyles && !!scope && (control.globalSides ?? [control]).some(side => !readStyleClass(value, side));
}

function writeValues(value, control, values) {
  // Native min-width cannot cancel an earlier !important with an ordinary rule.
  let important = false;
  for (const next of values) {
    if (important && !next.startsWith('!')) return { value, error: 'zx_builder_style_responsive_important' };
    important ||= next.startsWith('!');
  }
  // Preserve custom recognized values as well as catalog options when restoring guards.
  const writable = { ...control, id: '', options: [...control.options, ...values.map(item => ({ value: item.replace(/^!/, '') }))] };
  let result = value;
  for (const scope of ['', ...styleScreens.map(screen => screen.value)]) result = replaceStyleClass(result, writable, '', scope);
  let previous = null;
  values.forEach((next, index) => {
    if (next === previous) return;
    const scope = index === 0 ? '' : styleScreens[index].value;
    result = replaceStyleClass(result, writable, next.replace(/^!/, ''), scope);
    if (next.startsWith('!')) result = setStyleImportant(result, writable, true, scope);
    previous = next;
  });
  return { value: result };
}

function editResponsive(value, control, scope, transform) {
  if (literalClasses(value) === null) return { value };
  if (needsResponsiveBase(value, control, scope)) return { value, error: 'zx_builder_style_responsive_base' };
  if (control.globalSides) {
    let result = value;
    for (const side of control.globalSides) {
      const edited = editResponsive(result, side, scope, transform);
      if (edited.error) return { value, error: edited.error };
      result = edited.value;
    }
    return { value: result };
  }
  const index = scope ? styleScreens.findIndex(screen => screen.value === scope) : styleScreens.length - 1;
  if (index < 0) return { value };
  const values = valuesFor(value, control);
  const current = values[index];
  // Stop at the next smaller authored change; preserve both sides of this plateau.
  let start = index;
  while (start > 0 && values[start - 1] === current) start--;
  const next = transform(current, values[index + 1] ?? current, control);
  if (!next || next === current) return { value };
  for (let i = start; i <= index; i++) values[i] = next;
  return writeValues(value, control, values);
}

export function replaceResponsiveStyle(value, control, next, scope = '') {
  if (!descendingStyles) return { value: replaceStyleClass(value, control, next, scope) };
  if (!scope && (!next || needsResponsiveBase(value, control, styleScreens[0].value))) {
    if (!next) {
      const differs = (control.globalSides ?? [control]).some(side => new Set(valuesFor(value, side)).size > 1);
      if (differs) return { value, error: 'zx_builder_style_responsive_clear_base' };
      let result = value;
      for (const prefix of ['', ...styleScreens.map(screen => screen.value)]) result = replaceStyleClass(result, control, '', prefix);
      return { value: result };
    }
    const seeded = replaceStyleClass(value, control, next);
    if (seeded === value) return { value };
    // Imported min-width rules may already override the newly supplied baseline.
    return replaceResponsiveStyle(seeded, control, next);
  }
  const edited = editResponsive(value, control, scope, (current, above, side) => {
    if (!next) return above; // Reset restores the larger viewport's value.
    // Let the existing editor expand global/side shorthand and validate the input.
    const changed = replaceStyleClass(current, control, next);
    return readStyleClass(changed, side);
  });
  if (!edited.error && next && control.id === 'container') {
    const sides = ['r', 'l'].map(side => ({ spacing: true, family: 'm', pattern: new RegExp(`^-?m${side}-.+$`), options: [{ value: `m${side}-auto` }] }));
    const centering = { globalSides: sides, options: [{ value: 'mx-auto' }] };
    // Container's implicit centering is also a responsive edit and needs a baseline.
    const centered = replaceResponsiveStyle(edited.value, centering, 'mx-auto', scope);
    if (centered.error) return { value, error: centered.error };
    return centered;
  }
  return edited;
}

export function setResponsiveImportant(value, control, important, scope = '') {
  if (!descendingStyles) return { value: setStyleImportant(value, control, important, scope) };
  return editResponsive(value, control, scope, current => (important ? '!' : '') + current.replace(/^!/, ''));
}

// In the inverse UI a native transition at lg: represents an override below lg.
export function hasResponsiveStyle(value, controls, scope) {
  const index = styleScreens.findIndex(screen => screen.value === scope);
  if (index < 0 || index === styleScreens.length - 1) return false;
  return controls.some(control => {
    const values = valuesFor(value, control);
    return values[index] !== values[index + 1];
  });
}

export function resetResponsiveStyles(value, controls, scope) {
  let result = value;
  for (const control of controls) {
    if (!hasResponsiveStyle(result, [control], scope)) continue;
    const edited = replaceResponsiveStyle(result, control, '', scope);
    if (edited.error) return { value, error: edited.error };
    result = edited.value;
  }
  return { value: result };
}
