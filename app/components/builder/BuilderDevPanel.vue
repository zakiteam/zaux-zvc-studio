<template>
  <aside
    class="zb-dev-panel flex min-h-0 min-w-0 w-[298px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white [overflow-wrap:anywhere] max-[1200px]:w-[280px] max-[900px]:h-[60dvh] max-[900px]:!w-full max-[900px]:border-t-slim"
    :style="{ width: `${width}px` }"
  >
    <!-- Heading: what is selected, as in the Inspector. -->
    <div class="flex h-[44px] shrink-0 items-center gap-1 border-b-slim border-zaux-light-grey px-1.5">
      <span aria-hidden="true" class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs bg-zaux-light text-[11px] text-zaux-accent">&lt;/&gt;</span>
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-[12px] font-semibold leading-tight" :title="target?.name">{{ target?.name ?? translate('zx_builder_dev_mode') }}</h2>
        <p class="truncate text-[9px] leading-tight text-zaux-dark-grey">
          <span class="font-semibold uppercase tracking-[1px]">{{ translate('zx_builder_dev_mode') }}</span>
          <span v-if="target?.code" class="font-mono"> · {{ target.code }}</span>
        </p>
      </div>
    </div>

    <!-- Scope: the selected element, its component or the whole page. -->
    <div
      class="flex h-[36px] shrink-0 items-center gap-[2px] border-b-slim border-zaux-light-grey px-1 [&>button]:min-w-0 [&>button]:flex-1 [&>button]:truncate [&>button]:rounded-xxs [&>button]:px-0.5 [&>button]:py-0.5 [&>button]:text-[11px] [&>button]:font-semibold [&>button]:text-zaux-dark-grey [&>button:hover]:text-zaux-dark [&>button.active]:bg-zaux-light [&>button.active]:text-zaux-dark"
      role="tablist"
      :aria-label="translate('zx_builder_dev_scope')"
    >
      <button v-for="item in scopes" :key="item.id" type="button" role="tab"
        :class="{ active: scope === item.id }" :aria-selected="scope === item.id" :disabled="!item.available"
        class="disabled:opacity-40" @click="scope = item.id">{{ translate(item.label) }}</button>
    </div>

    <div v-if="target" class="min-h-0 flex-1 overflow-auto">
      <!-- Details useful to mount the selection front-end or back-end. -->
      <section class="border-b-slim border-zaux-light-grey p-1.5">
        <h3 class="mb-1 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_dev_details') }}</h3>
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 text-[11px] [&>dt]:text-zaux-dark-grey [&>dd]:min-w-0 [&>dd]:truncate [&>dd]:font-mono">
          <template v-for="row in target.details" :key="row.label">
            <dt>{{ translate(row.label) }}</dt>
            <dd :title="row.value">{{ row.value }}</dd>
          </template>
        </dl>
        <BuilderCodeEditor v-if="target.props" class="mt-1" readonly language="json" rows="6" :label="translate('zx_builder_dev_props')" :modelValue="target.props" />
        <ul v-if="target.instances" class="mt-1 space-y-[1px]">
          <li v-for="instance in target.instances" :key="instance.id">
            <button type="button" class="flex w-full min-w-0 items-center gap-1 rounded-xxs px-1 py-0.5 text-left text-[11px] hover:bg-zaux-light" @click="openInstance(instance.id)">
              <span class="min-w-0 flex-1 truncate">{{ instance.name }}</span>
              <code class="shrink-0 text-[10px] text-zaux-dark-grey">{{ instance.code }}</code>
            </button>
          </li>
        </ul>
      </section>

      <!-- Data contract: fields the selection reads and the values it renders with. -->
      <section v-if="fields" class="border-b-slim border-zaux-light-grey p-1.5">
        <h3 class="mb-0.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">
          <span>{{ translate('zx_builder_dev_fields') }}</span>
          <span class="tracking-normal tabular-nums">{{ fields.length }}</span>
        </h3>
        <p v-if="!fields.length" class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_dev_fields_empty') }}</p>
        <dl>
          <div v-for="field in fields" :key="field.key" class="border-b-slim border-zaux-light-grey py-0.5 last:border-b-0">
            <dt class="flex min-w-0 items-baseline gap-1">
              <code class="truncate text-[11px] font-semibold">{{ field.key }}</code>
              <span class="shrink-0 rounded-xxs bg-zaux-light px-0.5 font-mono text-[9px] text-zaux-dark-grey">{{ field.type }}</span>
            </dt>
            <dd v-if="field.label !== field.key" class="truncate text-[10px] text-zaux-dark-grey">{{ field.label }}</dd>
            <dd class="truncate font-mono text-[10px]" :title="field.preview">
              <span class="text-zaux-dark-grey">{{ translate(field.configured ? 'zx_builder_dev_value_page' : 'zx_builder_dev_value_default') }}:</span> {{ field.preview }}
            </dd>
          </div>
        </dl>
      </section>

      <!-- Export: format, code, copy and download. Nothing here edits the project. -->
      <section class="p-1.5">
        <h3 class="mb-1 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_export') }}</h3>
        <div class="mb-1 flex flex-wrap gap-0.5 rounded-xxs bg-zaux-light p-[2px]" role="group" :aria-label="translate('zx_builder_dev_format')">
          <BuilderButton v-for="item in formats" :key="item.id" size="xs" :label="item.label"
            :variant="item.id === format ? 'primary' : 'secondary'" :aria-pressed="item.id === format" @click="format = item.id" />
        </div>
        <p class="mb-1 text-[10px] leading-[1.6] text-zaux-dark-grey">{{ formatHint }}</p>
        <!-- ACF bridges are included unless unchecked, the README is opt-in, as in the export dialog. -->
        <div v-if="format === 'php' && scope !== 'element'" class="mb-1 flex flex-col gap-0.25 text-[11px]">
          <label class="flex cursor-pointer items-center gap-1">
            <input v-model="phpOptions.acf" type="checkbox" class="!w-auto accent-zaux-accent" />
            {{ translate('zx_builder_php_include_acf') }} <code class="text-[10px] text-zaux-dark-grey">&lt;Name&gt;.acf.php</code>
          </label>
          <label class="flex cursor-pointer items-center gap-1">
            <input v-model="phpOptions.readme" type="checkbox" class="!w-auto accent-zaux-accent" />
            {{ translate('zx_builder_php_include_readme') }} <code class="text-[10px] text-zaux-dark-grey">README.md</code>
          </label>
        </div>
        <p v-if="output.error" role="alert" class="rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error">{{ translate(output.error) }}</p>
        <template v-else>
          <BuilderInput v-if="output.files" v-model="selectedFile" type="select" class="mb-1 w-full" :options="fileOptions" :label="translate('zx_builder_dev_file')" />
          <BuilderCodeEditor readonly rows="16" :language="language" :modelValue="copyText" :label="output.files ? selectedFile : output.filename" />
          <div class="mt-1 flex flex-wrap items-center justify-end gap-1">
            <span class="mr-auto text-[11px] text-zaux-dark-grey" role="status">{{ copied ? translate('zx_builder_copied') : '' }}</span>
            <BuilderButton size="xs" icon="copy" :extraProps="{ actionIcon: false }" :label="translate('zx_builder_copy')" :disabled="!copyText" @click="copy" />
            <BuilderPhpThemeWrite v-if="format === 'php' && output.files" :files="output.files" :disabled="busy" />
            <BuilderButton size="xs" variant="primary" icon="download" :extraProps="{ actionIcon: false }"
              :label="translate(output.files ? 'zx_builder_dev_download_zip' : 'zx_builder_dev_download')" :disabled="busy || !copyText" @click="download" />
          </div>
        </template>
        <template v-if="usage">
          <h3 class="mb-0.5 mt-1.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate('zx_builder_dev_usage') }}</h3>
          <pre class="overflow-auto whitespace-pre rounded-xxs bg-zaux-light p-1 font-mono text-[10px] leading-[1.6]">{{ usage }}</pre>
        </template>
      </section>
    </div>
    <p v-else class="p-2 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_dev_empty') }}</p>
  </aside>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import { definitionWithData, documentEnvelope, nodeBindings, nodeDocument, nodeRuntime, templateRuntime, vueComponent, vueNodeMarkup } from '../../../domain/export.js';
import { phpComponentExport, phpNodeSnippet, phpTemplateExport } from '../../../domain/php/index.js';
import { phpExportOptions } from '../../services/php-export.js';
import { activeDefinitionOnly } from '../../../domain/variants.js';
import { clone, dataFor, runtimeRoot } from '../../../domain/nodes.js';
import { componentPackageFiles, projectStarterFiles } from '../../services/starter-export.js';
import { downloadText, downloadZip } from '../../services/files.js';

const SCOPES = [
  { id: 'element', label: 'zx_builder_dev_scope_element' },
  { id: 'component', label: 'zx_builder_dev_scope_component' },
  { id: 'page', label: 'zx_builder_dev_scope_page' }
];
// Formats per scope; `hint` explains the selected one.
const FORMATS = {
  element: [
    { id: 'runtime', label: 'zx_builder_json_runtime', hint: 'zx_builder_dev_element_runtime_hint' },
    { id: 'json', label: 'zx_builder_json_editable', hint: 'zx_builder_dev_element_json_hint' },
    { id: 'vue', label: 'Vue', hint: 'zx_builder_dev_element_vue_hint' },
    { id: 'php', label: 'PHP', hint: 'zx_builder_dev_element_php_hint' }
  ],
  component: [
    { id: 'runtime', label: 'zx_builder_json_runtime', hint: 'zx_builder_runtime_hint' },
    { id: 'json', label: 'zx_builder_json_editable', hint: 'zx_builder_dev_json_hint' },
    { id: 'js', label: 'JavaScript', hint: 'zx_builder_dev_js_hint' },
    { id: 'vue', label: 'Vue SFC', hint: 'zx_builder_vue_hint' },
    { id: 'php', label: 'PHP', hint: 'zx_builder_dev_php_hint' }
  ],
  page: [
    { id: 'runtime', label: 'zx_builder_json_runtime', hint: 'zx_builder_runtime_hint' },
    { id: 'json', label: 'zx_builder_json_editable', hint: 'zx_builder_dev_json_hint' },
    { id: 'js', label: 'JavaScript', hint: 'zx_builder_dev_js_hint' },
    { id: 'php', label: 'PHP', hint: 'zx_builder_dev_php_hint' }
  ]
};
const PREVIEW_LENGTH = 120;
const preview = value => {
  const text = value === undefined ? '—' : JSON.stringify(value);
  return text.length > PREVIEW_LENGTH ? text.slice(0, PREVIEW_LENGTH) + '…' : text;
};
const fileName = value => String(value || 'zaux').replace(/[^\w.-]+/g, '-');

// Dev mode panel, in place of the Inspector: details and code of the canvas
// selection (element, component or page). It reads the builder state only.
export default defineComponent({
  props: { width: { default: 298 } },
  setup() {
    const builder = useBuilder();
    const { translate } = builder;
    const active = computed(() => builder.workspaceView.value === 'dev');
    const scope = ref('component');
    const format = ref('runtime');
    const selectedFile = ref('');
    const copied = ref(false);
    const busy = ref(false);
    const phpOptions = ref({ readme: false, acf: true });

    // The selected ZVC/ZVP: library definition or template instance, with the data it renders with.
    const component = computed(() => {
      const definition = builder.activeDefinition.value;
      if (!definition) return null;
      const library = builder.mode.value === 'library';
      const instance = library ? null : builder.activeInstance.value;
      return {
        definition: activeDefinitionOnly(definition),
        data: instance?.data ?? {},
        name: library ? definition.name : instance?.name ?? definition.name,
        free: instance?.kind === 'free'
      };
    });
    const page = computed(() => builder.mode.value === 'template' && !builder.designer ? builder.activeTemplate.value : null);
    const node = computed(() => builder.selectedNode.value);
    const scopes = computed(() => SCOPES.map(item => ({
      ...item,
      available: item.id === 'element' ? !!node.value : item.id === 'component' ? !!component.value && !component.value.free : !!page.value
    })));
    // Selecting on the canvas or in the outline moves to the most specific scope.
    watch([builder.nodeId, builder.instanceId, builder.mode, builder.libraryId], () => {
      scope.value = node.value ? 'element' : component.value && !component.value.free ? 'component' : page.value ? 'page' : 'component';
    }, { immediate: true });

    const kindOf = name => /^ZVP[A-Za-z0-9_]+$/.test(name) ? 'zx_builder_dev_kind_zvp' : /^[A-Z]/.test(name) ? 'zx_builder_dev_kind_component' : 'zx_builder_dev_kind_html';
    const target = computed(() => {
      if (!active.value) return null;
      if (scope.value === 'element' && node.value && component.value) {
        const current = node.value;
        const classes = current.props?.class;
        const bindings = nodeBindings(current);
        return {
          name: current.name,
          code: translate(kindOf(current.name)),
          details: [
            { label: 'zx_builder_dev_tag', value: current.name },
            { label: 'zx_builder_dev_in_component', value: component.value.free ? translate('zx_builder_dev_free') : component.value.definition.exportName },
            ...(classes ? [{ label: 'zx_builder_dev_classes', value: Array.isArray(classes) ? classes.join(' ') : String(classes) }] : []),
            { label: 'zx_builder_dev_children', value: String(current.children?.length ?? 0) },
            ...(bindings.length ? [{ label: 'zx_builder_dev_bindings', value: bindings.join(', ') }] : [])
          ],
          props: JSON.stringify(current.props ?? {}, null, 2),
          bindings
        };
      }
      if (scope.value === 'component' && component.value && !component.value.free) {
        const { definition } = component.value;
        return {
          name: component.value.name,
          code: definition.exportName,
          details: [
            { label: 'zx_builder_dev_export_name', value: definition.exportName },
            { label: 'zx_builder_dev_kind', value: definition.kind === 'zvp' ? 'ZVP' : 'ZVC' },
            { label: 'zx_builder_dev_source', value: definition.sourceKey ? definition.sourceKey : translate('zx_builder_dev_source_visual') },
            ...(definition.partials?.length ? [{ label: 'zx_builder_dev_partials', value: definition.partials.map(item => item.exportName).join(', ') }] : []),
            { label: 'zx_builder_dev_css', value: definition.css?.trim() ? translate('zx_builder_dev_yes') : translate('zx_builder_dev_no') }
          ]
        };
      }
      if (scope.value === 'page' && page.value) {
        return {
          name: page.value.name,
          code: translate('zx_builder_dev_scope_page'),
          details: [{ label: 'zx_builder_dev_components', value: String(page.value.instances.length) }],
          instances: page.value.instances.map(instance => ({
            id: instance.id, name: instance.name,
            code: instance.kind === 'free' ? translate('zx_builder_dev_free') : instance.definition.exportName
          }))
        };
      }
      return null;
    });

    // Data contract: component fields, or only those an element reads.
    const fields = computed(() => {
      if (!target.value || scope.value === 'page' || !component.value) return null;
      const { definition, data } = component.value;
      const values = dataFor(definition, data);
      const list = scope.value === 'element'
        ? (definition.fields ?? []).filter(field => target.value.bindings.includes(field.key))
        : definition.fields ?? [];
      if (scope.value === 'element' && !list.length) return null;
      return list.map(field => ({
        key: field.key, label: field.label || field.key, type: field.type,
        configured: Object.hasOwn(data, field.key), preview: preview(values[field.key])
      }));
    });

    const formats = computed(() => (FORMATS[scope.value] ?? []).map(item => ({ ...item, label: item.label.startsWith('zx_') ? translate(item.label) : item.label })));
    watch(formats, list => { if (!list.some(item => item.id === format.value)) format.value = 'runtime'; });
    const formatHint = computed(() => translate(formats.value.find(item => item.id === format.value)?.hint ?? ''));
    const json = value => JSON.stringify(value, null, 2);
    const errorKey = error => (typeof error?.message === 'string' && error.message.startsWith('zx_') ? error.message : 'zx_builder_dev_error');

    // Generated code for the scope and format; computed only while Dev mode is visible.
    const output = computed(() => {
      if (!target.value) return { text: '' };
      try {
        if (scope.value === 'element') {
          const { definition, data } = component.value;
          const base = fileName(node.value.name);
          if (format.value === 'runtime') return { text: json(nodeRuntime(definition, data, node.value.id)), language: 'json', filename: `${base}.runtime.json` };
          if (format.value === 'json') return { text: json(nodeDocument(node.value)), language: 'json', filename: `${base}.json` };
          if (format.value === 'vue') return { text: vueNodeMarkup(node.value) + '\n', language: 'vue', filename: `${base}.vue` };
          return { text: phpNodeSnippet(nodeDocument(node.value)), language: 'php', filename: `${base}.php` };
        }
        if (scope.value === 'component') {
          const definition = definitionWithData(component.value.definition, component.value.data);
          const base = fileName(definition.exportName);
          if (format.value === 'runtime') return { text: json(runtimeRoot(definition)), language: 'json', filename: `${base}.runtime.json` };
          if (format.value === 'json') return { text: json(documentEnvelope('component', definition)), language: 'json', filename: `${base}.json` };
          if (format.value === 'vue') return { text: vueComponent(definition), language: 'vue', filename: `${base.replace(/^ZV[CP]/, '')}.vue` };
          if (format.value === 'js') return { files: componentPackageFiles(builder.document.value, definition), filename: `${base}.zip` };
          const php = phpComponentExport(definition, phpExportOptions(phpOptions.value));
          return { files: php.files, main: php.main?.entry, php, filename: `${base}-php.zip` };
        }
        const template = page.value;
        const base = fileName(template.name);
        if (format.value === 'runtime') return { text: json(templateRuntime(template)), language: 'json', filename: `${base}.runtime.json` };
        if (format.value === 'json') return { text: json(documentEnvelope('template', template)), language: 'json', filename: `${base}.json` };
        if (format.value === 'js') return { files: projectStarterFiles(builder.document.value, template.id), filename: `${base}.zip` };
        const php = phpTemplateExport(template, phpExportOptions(phpOptions.value));
        return { files: php.files, main: php.pages[0]?.path, filename: `${base}-php.zip` };
      } catch (error) {
        return { text: '', error: errorKey(error) };
      }
    });
    // Packages open on their main file, or the first one.
    watch(output, value => {
      copied.value = false;
      if (value.files && !Object.hasOwn(value.files, selectedFile.value)) selectedFile.value = value.main ?? Object.keys(value.files)[0] ?? '';
    });
    const fileOptions = computed(() => Object.keys(output.value.files ?? {}).sort().map(path => ({ value: path, label: path })));
    const copyText = computed(() => output.value.files ? output.value.files[selectedFile.value] ?? '' : output.value.text ?? '');
    const language = computed(() => {
      if (!output.value.files) return output.value.language ?? 'json';
      const path = selectedFile.value;
      if (path.endsWith('.php')) return 'php';
      if (path.endsWith('.css')) return 'css';
      if (path.endsWith('.json')) return 'json';
      if (path.endsWith('.html') || path.endsWith('.md')) return 'html';
      return 'javascript';
    });

    // Call snippet for the component packages.
    const usage = computed(() => {
      if (scope.value !== 'component' || output.value.error || !output.value.files) return '';
      if (format.value === 'php' && output.value.php?.main) {
        const { fn, entry } = output.value.php.main;
        // zaux-wp-core autoloads the component: no require.
        return `// ${entry}\n$components = [\n    ${fn}([ /* field values */ ]),\n];\n\nZauxComponentsHelper::printComponentsList( $components );`;
      }
      if (format.value === 'js') {
        const entry = Object.keys(output.value.files).find(file => !file.includes('/') && /\.zv[cp]\.js$/.test(file));
        const name = component.value.definition.exportName.replace(/^ZV[CP]/, '') || 'Component';
        return entry ? `import ${name} from './${entry}';\n\nconst node = ${name}.buildNode({ /* field values */ });` : '';
      }
      return '';
    });

    function openInstance(id) {
      builder.selectInstance(id);
      builder.revealOutline(id, null);
      builder.reveal(id, null);
    }
    async function copy() {
      try {
        await navigator.clipboard.writeText(copyText.value);
        copied.value = true;
      } catch {
        builder.error.value = 'zx_builder_storage_error';
      }
    }
    async function download() {
      const value = output.value;
      if (busy.value || value.error) return;
      if (!value.files) {
        downloadText(value.filename, value.text, value.language === 'json' ? 'application/json' : 'text/plain');
        return;
      }
      busy.value = true;
      try {
        await downloadZip(value.filename, clone(value.files));
      } catch {
        builder.error.value = 'zx_builder_storage_error';
      } finally {
        busy.value = false;
      }
    }

    return {
      translate, phpOptions, scope, scopes, target, fields, formats, format, formatHint, output, selectedFile, fileOptions,
      copyText, language, usage, copied, busy, openInstance, copy, download
    };
  }
});
</script>
