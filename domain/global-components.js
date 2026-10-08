import { bind, clone, createNode } from './nodes.js';
import { createDefinition } from './workspace.js';
import { validateDefinition } from './validation.js';

// Global ZVC/ZVPs live outside projects (Component designer). A project holds a "linked copy":
// an ordinary library definition whose id is the global id plus `global` provenance metadata.
// Instances keep using sourceId, so Soft/Hard reset work unchanged on linked copies.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Source bases (`source:<key>`) are bundled Zaux/app code, never stored globally.
export function isGlobalCandidate(definition) {
  return UUID.test(definition?.id ?? '') && !definition.global;
}

const normalizeVersion = value => String(value ?? '').trim().replace(/^v(?=\d)/i, '');
// Signatures are compared literally (tags, or `<branch>@<sha7>` in branch mode).
export function zauxCompatibility(signed, running) {
  const component = normalizeVersion(signed);
  const builder = normalizeVersion(running);
  return { match: Boolean(component) && component === builder, component, builder };
}

// A global signature must match the running builder and, when the project is signed,
// the release of its last edit.
export function globalVersionCheck(signed, running, projectEdited) {
  const builder = zauxCompatibility(signed, running);
  const project = projectEdited ? zauxCompatibility(signed, projectEdited) : null;
  return { ...builder, project: project?.builder ?? '', match: builder.match && (project?.match ?? true) };
}

export function globalRecord(definition, zauxVersion) {
  const copy = clone(definition);
  delete copy.global;
  return {
    id: definition.id,
    kind: definition.kind === 'zvp' ? 'zvp' : 'zvc',
    name: definition.name.trim().slice(0, 120),
    export_name: definition.exportName,
    definition: copy,
    zaux_version: String(zauxVersion)
  };
}

// The stored JSON is validated like any import; the row id is authoritative.
export function globalDefinition(row) {
  const definition = { ...clone(row.definition), id: row.id };
  delete definition.global;
  return validateDefinition(definition);
}

// Library entries to create/update and saved ids that disappeared (to archive).
// `saved` maps id -> { json, archived }.
export function globalChanges(library, saved) {
  const current = new Map(library.filter(isGlobalCandidate).map(definition => [definition.id, definition]));
  const upserts = [];
  for (const [id, definition] of current) {
    const json = JSON.stringify(definition);
    const entry = saved.get(id);
    if (!entry || entry.archived || entry.json !== json) upserts.push({ id, json });
  }
  const removed = [...saved].filter(([id, entry]) => !entry.archived && !current.has(id)).map(([id]) => id);
  return { upserts, removed };
}

export function globalMeta(row) {
  return { id: row.id, revision: row.revision, zauxVersion: row.zaux_version, updatedAt: row.updated_at ?? '' };
}

// Adds or refreshes the linked copy of a global row inside a project workspace.
// A refreshed ZVP keeps the project export name, so existing references stay valid.
export function linkGlobalComponent(workspace, row) {
  const definition = globalDefinition(row);
  const index = workspace.library.findIndex(item => item.id === row.id);
  const previous = index >= 0 ? workspace.library[index] : null;
  if (previous && !previous.global) throw new Error('zx_builder_global_id_conflict');
  if (previous && previous.kind === 'zvp' && definition.kind === 'zvp') definition.exportName = previous.exportName;
  if (!previous && definition.kind === 'zvp') {
    const names = new Set(workspace.library.map(item => item.exportName));
    const base = definition.exportName;
    for (let suffix = 2; names.has(definition.exportName); suffix++) definition.exportName = base + suffix;
  }
  definition.global = globalMeta(row);
  if (index >= 0) workspace.library.splice(index, 1, definition);
  else workspace.library.push(definition);
  return definition;
}

export function globalUpdateAvailable(linked, row) {
  return Boolean(linked?.global && row && row.revision > linked.global.revision);
}

// Starter content for an empty global library: a ZVP and a ZVC that references it.
export function sampleGlobalDefinitions(translate) {
  const cta = createDefinition(translate('zx_builder_global_sample_zvp'), 'zvp');
  cta.fields = [
    { key: 'label', label: 'Label', type: 'text', default: translate('zx_builder_global_sample_cta') },
    { key: 'href', label: 'Link', type: 'text', default: '#' }
  ];
  cta.tree = [createNode('ZButton', { label: bind('label'), tag: 'a', href: bind('href'), theme: 'primary', size: 's' })];
  const feature = createDefinition(translate('zx_builder_global_sample_zvc'));
  feature.fields = [
    { key: 'eyelet', label: 'Eyebrow', type: 'text', default: translate('zx_builder_global_sample_eyelet') },
    { key: 'title', label: 'Title', type: 'text', default: translate('zx_builder_global_sample_title') },
    { key: 'excerpt', label: 'Text', type: 'textarea', default: translate('zx_builder_global_sample_text') }
  ];
  feature.tree = [createNode('Zsection', { size: 'm', contained: true, style: { background: 'rgb(var(--zx-color-set1-light))' } }, [
    createNode('div', { style: { display: 'grid', gap: '24px', justifyItems: 'start' } }, [
      createNode('IntroText', { eyelet: bind('eyelet'), title: bind('title'), excerpt: bind('excerpt'), size: 'm' }),
      createNode(cta.exportName, {})
    ])
  ])];
  return [cta, feature];
}
