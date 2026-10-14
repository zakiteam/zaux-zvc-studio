import attributeHooks from '../generated/attributes-hooks.json';
import flatAttributes from '../generated/attributes-flat.json';
import { registryEntry } from './hook-registry.js';

// Zaux components accept an `attributes` prop in one of two shapes:
// - hooks: { [hook]: { class, id, 'data-*', … } }, each hook bound with
//   v-bind="attributes?.<hook>" on an inner node (generated `attributes-hooks.json`,
//   the same scan as upstream `gen:attr-hooks`);
// - flat: { rows: 4, … } bound directly on the native element (inputs,
//   HtmlRenderer; generated `attributes-flat.json`).

// Partials that receive the parent's `attributes` prop unchanged.
// Card passes it to CardBaseDefault (vendor/zaux/core/components/shared/card/Card.vue).
const forwardedAttributes = { Card: ['CardBaseDefault'] };

const commonAttributes = ['id', 'title', 'role', 'aria-label', 'aria-describedby', 'aria-hidden', 'tabindex', 'data-'];
// Native attributes worth suggesting for flat components, on top of the registry keys.
const flatSuggestions = {
  InputText: ['maxlength', 'minlength', 'pattern', 'autocomplete', 'inputmode', 'min', 'max', 'step', 'readonly', 'spellcheck'],
  InputTextarea: ['rows', 'cols', 'maxlength', 'minlength', 'autocomplete', 'spellcheck', 'readonly'],
  InputSelect: ['autocomplete'],
  InputFile: ['multiple', 'capture'],
  HtmlRenderer: ['class', 'style']
};

const flatRegistry = Object.fromEntries(flatAttributes.map(item => [item, true]));
const isFlat = name => !!registryEntry(flatRegistry, name);

// Editor configuration for a component's `attributes` prop, or null without hooks.
// hooks: [{ key, source }] where source names the forwarding partial, if any.
export function attributeConfig(name) {
  if (!name) return null;
  const own = registryEntry(attributeHooks, name);
  // Registry keys of flat components (InputSelect `icon`, InputText `type`) are read
  // from the same object but are not element attributes, so they are not suggested.
  if (isFlat(name)) {
    return { mode: 'flat', suggestions: [...new Set([...(flatSuggestions[own?.key ?? name] ?? []), ...commonAttributes])] };
  }
  const hooks = [
    ...(own?.value ?? []).map(key => ({ key, source: null })),
    ...(forwardedAttributes[own?.key ?? name] ?? []).flatMap(partial =>
      (attributeHooks[partial] ?? []).map(key => ({ key, source: partial })))
  ];
  const unique = hooks.filter((hook, index) => hooks.findIndex(item => item.key === hook.key) === index);
  return unique.length ? { mode: 'hooks', hooks: unique, suggestions: ['class', 'style', ...commonAttributes] } : null;
}
