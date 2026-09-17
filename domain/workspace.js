import { uid, clone, copyNode, createNode, bind } from './nodes.js';

import stylePreset from '../app/data/styles/preset.js';

export const SCHEMA_VERSION = 1;
export function exportName(name, kind = 'zvc') {
  const cleaned = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+(.)?/g, (_, letter) => letter?.toUpperCase() ?? '');
  return `${kind === 'zvp' ? 'ZVP' : 'ZVC'}${cleaned.replace(/^ZV[CP]/, '').replace(/^./, letter => letter.toUpperCase()) || 'Component'}`;
}
export function createDefinition(name = 'Component', kind = 'zvc') {
  return { id: uid(), name, exportName: exportName(name, kind), ...(kind === 'zvp' ? { kind } : {}), fields: [], tree: [], css: '' };
}
export function copyDefinition(definition, name = definition.name) {
  return { ...clone(definition), id: uid(), name, exportName: definition.sourceKey && (definition.kind !== 'zvp' || name === definition.name) ? definition.exportName : exportName(name, definition.kind), tree: definition.tree.map(copyNode) };
}
export function createInstance(definition) {
  return { id: uid(), sourceId: definition.id, name: definition.name, definition: copyDefinition(definition), data: {} };
}
export function createTemplate(name) { return { id: uid(), name, instances: [] }; }

// Internal IDs stay scoped to the new document, preserving source/partial references.
export function copyWorkspace(workspace, name) {
  const now = new Date().toISOString();
  return { ...clone(workspace), id: uid(), name, createdAt: now, updatedAt: now };
}

export function createWorkspace() {
  const hero = createDefinition('Welcome Section');
  hero.fields = [
    { key: 'eyelet', label: 'Eyebrow', type: 'text', default: 'ZAUX VIRTUAL COMPONENTS' },
    { key: 'title', label: 'Title', type: 'text', default: 'Le tue idee.\nLa tua struttura.' },
    { key: 'excerpt', label: 'Text', type: 'textarea', default: 'Componi, personalizza e riutilizza. Il tuo prossimo progetto inizia da qui.' },
    { key: 'buttonLabel', label: 'Button', type: 'text', default: 'Esplora il progetto' }
  ];
  hero.tree = [createNode('Zsection', { size: 'l', contained: true, style: { background: 'rgb(var(--zx-color-set1-light))' } }, [
    createNode('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '48px', alignItems: 'center' } }, [
      createNode('div', {}, [
        createNode('IntroText', { eyelet: bind('eyelet'), title: bind('title'), excerpt: bind('excerpt'), size: 'l', titleTag: 'h1' }),
        createNode('ZButton', { label: bind('buttonLabel'), tag: 'a', href: '#explore', theme: 'primary', size: 's', style: { marginTop: '24px' } })
      ]),
      createNode('div', { style: { borderRadius: '180px 180px 24px 24px', minHeight: '320px', background: 'rgb(var(--zx-color-set1-dark))', display: 'grid', placeItems: 'center', padding: '32px' } }, [
        createNode('div', { style: { width: '170px', height: '170px', borderRadius: '50%', background: 'rgb(var(--zx-color-set1-accent))', boxShadow: '38px 25px 0 rgb(var(--zx-color-set1-dark-accent)), -22px -32px 0 rgb(var(--zx-color-set1-light-accent))' } })
      ])
    ])
  ])];
  const text = createDefinition('Editorial Section');
  text.fields = [
    { key: 'title', label: 'Title', type: 'text', default: 'Uno spazio per ogni idea.' },
    { key: 'text', label: 'Text', type: 'textarea', default: 'Ogni sezione è una composizione di componenti Zaux. Seleziona un elemento per modificarlo, oppure trascina nuovi elementi sulla pagina.' }
  ];
  text.tree = [createNode('Zsection', { size: 'm', contained: true }, [
    createNode('IntroText', { title: bind('title'), excerpt: bind('text'), size: 'm' })
  ])];
  const template = createTemplate('Homepage');
  template.instances = [createInstance(hero), createInstance(text)];
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid(), 
    name: 'Untitled workspace', 
    createdAt: now,
    updatedAt: now,
    library: [hero, text],
    templates: [template],
    styles: clone(stylePreset)
  };
}
