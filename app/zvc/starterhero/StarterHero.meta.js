import defaults from './data/StarterHero.defaults';
export default {
  builder: true,
  label: 'Starter Hero',
  ZVCName: 'ZVCStarterHero',
  meta: { version: 1 },
  fields: [
    { key: 'eyelet', label: 'Eyelet', type: 'text', default: defaults.eyelet },
    { key: 'title', label: 'Titolo', type: 'text', default: defaults.title },
    { key: 'excerpt', label: 'Testo', type: 'textarea', default: defaults.excerpt },
    { key: 'showButton', label: 'Mostra pulsante', type: 'switch', default: defaults.showButton },
    { key: 'buttonLabel', label: 'Testo pulsante', type: 'text', default: defaults.buttonLabel, showIf: { field: 'showButton', value: true } },
    { key: 'buttonHref', label: 'Link pulsante', type: 'text', default: defaults.buttonHref, showIf: { field: 'showButton', value: true } },
    { key: 'sectionSize', label: 'Dimensione sezione', type: 'select', default: defaults.sectionSize, options: ['xs', 's', 'm', 'l'].map(value => ({ label: value, value })) }
  ]
};
