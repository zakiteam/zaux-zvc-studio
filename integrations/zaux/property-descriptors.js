import section from '../../vendor/zaux/core/components/shared/section/Zsection.meta.js';
import intro from '../../vendor/zaux/core/components/shared/introtext/IntroText.meta.js';
import button from '../../vendor/zaux/core/components/shared/button/ZButton.meta.js';
import introBuilder from '../../vendor/zaux/core/components/shared/introtext/builder/IntroText.builder.js';

const metadata = { Zsection: section, IntroText: intro.base, ZButton: button };
const builders = { IntroText: introBuilder };
// These components have no option arrays in their metadata. Keep the gaps here.
const supplements = {
  // Paragraph.vue (sizes) and style/Paragraph.theme.scss (themes).
  Paragraph: { sizes: ['xs', 's', 'm', 'l'], themes: ['light1', 'dark1', 'dark2'] },
  // Separator.vue defines both sets inline.
  Separator: { sizes: ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'], themes: ['light1', 'light2', 'light3', 'dark1'] }
};

function optionsFor(values) {
  return values.map(value => value !== null && typeof value === 'object'
    ? { value: value.value, label: value.label ?? String(value.value) }
    : { value, label: String(value) });
}

export function propertyDescriptors(name, props) {
  const descriptors = Object.fromEntries(Object.entries(props).map(([key, descriptor]) => [key,
    typeof descriptor === 'function' ? { type: descriptor } : { ...descriptor }
  ]));
  for (const field of builders[name]?.editableProps ?? []) {
    if (!Object.hasOwn(descriptors, field.name)) continue;
    descriptors[field.name].control = field.ctrlType;
    if (field.ctrlType === 'select' && Array.isArray(field.value)) {
      descriptors[field.name].options = optionsFor(field.value);
    }
  }
  const meta = metadata[name] ?? supplements[name];
  for (const [key, values] of [['size', meta?.sizes], ['theme', meta?.themes]]) {
    if (!Object.hasOwn(descriptors, key) || !Array.isArray(values)) continue;
    descriptors[key] = { ...descriptors[key], control: 'select', options: optionsFor(values) };
  }
  return descriptors;
}
