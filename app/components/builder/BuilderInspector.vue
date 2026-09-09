<template>
  <aside class="zb-inspector flex min-h-0 w-[298px] shrink-0 flex-col border-l-slim border-zaux-light-grey bg-zaux-white max-[1200px]:w-[280px] max-[900px]:h-[60dvh] max-[900px]:!w-full max-[900px]:border-t-slim" :style="{ width: `${width}px` }">
    <div class="zb-inspector-heading px-2.5 pb-2 pt-3 [&>h2]:mt-1 [&>h2]:text-[16px] [&>h2]:font-medium [&>p]:mt-0.5 [&>p]:font-mono [&>p]:text-[10px] [&>p]:text-zaux-dark-grey"><span class="zb-eyebrow block text-[10px] font-semibold uppercase tracking-[1.4px] text-zaux-dark-grey">{{ translate(mode === 'library' ? 'zx_builder_component' : 'zx_builder_instance') }}</span><h2>{{ activeDefinition ? (mode === 'library' ? activeDefinition.name : activeInstance.name) : translate('zx_builder_properties') }}</h2><p v-if="activeDefinition">{{ activeDefinition.exportName }}</p></div>
    <div class="zb-tabs flex shrink-0 gap-0.5 border-b-slim border-zaux-light-grey px-1.5 [&>button]:flex-1 [&>button]:border-b-thick [&>button]:border-transparent [&>button]:px-0.75 [&>button]:py-1.5 [&>button]:text-[11px] [&>button]:text-zaux-dark-grey [&>button.active]:border-zaux-accent [&>button.active]:text-zaux-accent" role="tablist"><button v-for="tab in ['properties', 'data', 'fields', 'code']" :key="tab" role="tab" :aria-selected="inspectorTab === tab" :class="{ active: inspectorTab === tab }" @click="inspectorTab = tab">{{ translate(`zx_builder_${tab}`) }}</button></div>
    <ZOverflowContainer class="zb-scroll h-full min-h-0 flex-1 overflow-auto" autoOverflow>
      <div class="zb-inspector-content p-2">
        <template v-if="activeDefinition">
          <BuilderSourceInfo v-if="isSource" />
          <template v-if="inspectorTab === 'properties'">
            <template v-if="selectedNode && !isSource">
              <div class="zb-node-heading mb-1.5 flex items-center gap-1 [&_strong]:text-[12px] [&_strong]:font-semibold [&_small]:mt-0.5 [&_small]:block [&_small]:text-[10px] [&_small]:text-zaux-dark-grey"><span class="zb-node-icon grid h-[32px] w-[32px] place-items-center rounded-xxs bg-zaux-accent/10 text-[21px] text-zaux-accent">◇</span><div><strong>{{ selectedNode.name }}</strong><small>{{ translate('zx_builder_properties') }}</small></div><div class="zb-node-actions ml-auto flex [&>.zb-button]:!p-0.5"><BuilderButton icon="copy" iconOnly :label="translate('zx_builder_duplicate')" @click="duplicateNode" /><BuilderButton icon="delete" iconOnly :label="translate('zx_builder_delete')" @click="deleteNode" /></div></div>
              <div class="zb-row mb-2 mt-1.5 flex gap-1 [&>*]:flex-1"><BuilderButton :label="translate('zx_builder_move_up')" @click="shiftNode(-1)" /><BuilderButton :label="translate('zx_builder_move_down')" @click="shiftNode(1)" /></div>
              <div class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"><label>{{ translate('zx_builder_node_name') }}</label><BuilderInput type="select" :modelValue="selectedNode.name" :options="[...(catalog.some(entry => entry.name === selectedNode.name) ? [] : [{ value: selectedNode.name, label: selectedNode.name }]), ...catalog.map(entry => ({ value: entry.name, label: entry.name }))]" @change="changeType" /></div>
              <BuilderProperty v-for="property in visibleProperties" :key="`${selectedNode.id}-${property}`" :property="property" :value="selectedNode.props[property]" :fields="activeDefinition.fields" :descriptor="descriptors[property]" @change="setProperty(property, $event)" />
              <div class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"><label>{{ translate('zx_builder_add') }} · {{ translate('zx_builder_properties') }}</label><BuilderInput type="select" modelValue="" :options="[{ value: '', label: '+' }, ...extraProperties.map(property => ({ value: property, label: property }))]" @change="addProperty" /></div>
              <div class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"><label>{{ translate('zx_builder_classes') }}</label><BuilderValue :modelValue="selectedNode.props.class ?? ''" label="CSS class" :type="Array.isArray(selectedNode.props.class) ? 'json' : 'text'" @update:modelValue="setProperty('class', $event)" /></div>
              <details><summary>{{ translate('zx_builder_styles') }}</summary><BuilderValue :modelValue="selectedNode.props.style ?? {}" label="CSS style" type="json" @update:modelValue="setProperty('style', $event)" /></details>
              <details><summary>{{ translate('zx_builder_advanced') }}</summary><BuilderCodeEditor v-model="propsDraft" rows="14" :label="translate('zx_builder_advanced')" /><BuilderButton :label="translate('zx_builder_apply')" @click="applyProps" /><BuilderButton icon="delete" iconOnly :label="translate('zx_builder_clear_json')" @click="clearProps" /></details>
            </template>
            <div v-else-if="!isSource" class="zb-inspector-empty px-1 py-4 text-center [&>span]:mb-2 [&>span]:block [&>span]:text-[34px] [&>span]:font-light [&>span]:text-zaux-light-grey [&>p]:mb-2 [&>p]:text-[12px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey"><span>↖</span><p>{{ translate('zx_builder_select_hint') }}</p><BuilderButton :label="translate('zx_builder_elements')" @click="leftTab = 'elements'" /></div>
            <div class="zb-context-card mt-3 rounded-xs border-slim border-zaux-light-grey bg-zaux-light/60 p-2 [&_p]:mb-1.5 [&_p]:mt-1 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-zaux-dark-grey"><span class="zb-badge inline-block rounded-xxs bg-zaux-light px-0.75 py-0.25 font-mono text-[10px] tracking-[0.8px] text-zaux-dark-grey">{{ mode === 'library' ? 'ZVC' : 'COPY' }}</span><p>{{ translate(mode === 'library' ? 'zx_builder_library_notice' : 'zx_builder_copy_notice') }}</p><BuilderButton v-if="mode === 'template'" :label="translate('zx_builder_save_library')" @click="modal = { type: 'save-library', name: activeInstance.name }" /></div>
          </template>
          <template v-else-if="inspectorTab === 'data'">
            <p class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate(mode === 'library' ? 'zx_builder_library_notice' : 'zx_builder_copy_notice') }}</p>
            <p v-if="!activeDefinition.fields.length" class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_no_fields') }}</p>
            <fieldset :disabled="isSourceBase || (isSource && !hasSource)"><div v-for="field in visibleFields" :key="field.key" class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"><label>{{ field.label }}<small>{{ field.key }}</small></label><BuilderValue :disabled="isSourceBase || (isSource && !hasSource)" :label="field.label" :type="fieldInputType(field)" :options="field.options" :modelValue="fieldValue(field)" @update:modelValue="setFieldValue(field, $event)" /><button v-if="mode === 'template' && Object.hasOwn(activeInstance.data, field.key)" class="zb-text-link mt-1 !text-[10px] text-zaux-accent underline" @click="updateData(field.key, undefined)">{{ translate('zx_builder_reset_value') }}</button></div></fieldset>
          </template>
          <template v-else-if="inspectorTab === 'fields'"><p v-if="isSource" class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_source_fields') }}</p><BuilderFields v-else /></template>
          <template v-else>
            <div class="zb-field mb-2.5 [&>label]:mb-1 [&>label]:block [&>label]:text-[11px] [&>label]:font-medium [&>label]:text-zaux-dark [&_label_small]:mt-0.5 [&_label_small]:block [&_label_small]:font-mono [&_label_small]:text-[9px] [&_label_small]:text-zaux-dark-grey"><label>{{ translate('zx_builder_export_name') }}</label><BuilderInput :readonly="isSource" :modelValue="activeDefinition.exportName" @change="updateDefinition(def => { def.exportName = $event.target.value; })" /></div>
            <div class="zb-segmented mb-1.5 flex rounded-xxs bg-zaux-light p-0.5 [&>button]:flex-1 [&>button]:rounded-xxs [&>button]:p-0.75 [&>button]:text-[10px] [&>button]:text-zaux-dark-grey [&>.active]:bg-zaux-white [&>.active]:text-zaux-accent"><button :class="{ active: codeMode === 'json' }" @click="codeMode = 'json'">JSON</button><button :class="{ active: codeMode === 'js' }" @click="codeMode = 'js'">JavaScript</button><button :class="{ active: codeMode === 'css' }" @click="codeMode = 'css'">CSS</button></div>
            <template v-if="codeMode === 'json'"><BuilderCodeEditor v-model="definitionDraft" :readonly="isSource" rows="26" label="ZVC JSON" /><BuilderButton v-if="!isSource" :label="translate('zx_builder_apply')" @click="applyDefinition" /></template>
            <template v-else-if="codeMode === 'js'"><BuilderCodeEditor language="javascript" :modelValue="source" readonly rows="26" label="ZVC JavaScript" /><BuilderButton :label="translate('zx_builder_download_js')" @click="modal = { type: 'export', scope: 'component' }" /></template>
            <template v-else><p class="zb-help !mb-2 !mt-1.5 text-[11px] leading-[1.65] text-zaux-dark-grey">{{ translate('zx_builder_css_hint') }}</p><BuilderCodeEditor :key="activeDefinition.id" :disabled="isSourceBase" :modelValue="activeDefinition.css" language="css" rows="22" label="CSS" @change="updateDefinition(def => { def.css = $event; })" /></template>
          </template>
        </template>
        <div v-else class="zb-inspector-empty px-1 py-4 text-center [&>span]:mb-2 [&>span]:block [&>span]:text-[34px] [&>span]:font-light [&>span]:text-zaux-light-grey [&>p]:mb-2 [&>p]:text-[12px] [&>p]:leading-[1.8] [&>p]:text-zaux-dark-grey"><span>◇</span><p>{{ translate('zx_builder_empty_hint') }}</p><BuilderButton :label="translate('zx_builder_new_component')" @click="modal = { type: 'new-component' }" /></div>
        <p v-if="localError" class="zb-field-error !mt-1.5 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error" role="alert">{{ translate(localError) }}</p>
      </div>
    </ZOverflowContainer>
  </aside>
</template>
<script>
import { defineComponent, computed, ref, watch } from 'vue';
import { useBuilder } from '../../composables/useBuilder.js';
import { catalog, propertyInfo } from '../../services/catalog.js';
import { parseJson, validateDefinition } from '../../../domain/validation.js';
import { sourceCode } from '../../services/source-zvc.js';
import { fieldInputType, isFieldVisible } from '../../../domain/fields.js';
import { clone, dataFor, getValue } from '../../../domain/nodes.js';
import BuilderButton from './BuilderButton.vue';
import BuilderCodeEditor from './BuilderCodeEditor.vue';
import BuilderProperty from './BuilderProperty.vue';
import BuilderValue from './BuilderValue.vue';
import BuilderFields from './BuilderFields.vue';
import BuilderSourceInfo from './BuilderSourceInfo.vue';
import BuilderInput from './BuilderInput.vue';
export default defineComponent({
  components: { BuilderCodeEditor, BuilderButton, BuilderProperty, BuilderValue, BuilderFields, BuilderSourceInfo, BuilderInput },
  props: { width: { default: 298 } },
  setup() {
    const builder = useBuilder();
    const propsDraft = ref(''); const definitionDraft = ref(''); const localError = ref(''); const codeMode = ref('json');
    const descriptors = computed(() => propertyInfo(builder.selectedNode.value?.name));
    const visibleProperties = computed(() => Object.keys(builder.selectedNode.value?.props ?? {}).filter(key => !['class', 'style'].includes(key)));
    const extraProperties = computed(() => Object.keys(descriptors.value).filter(key => !Object.hasOwn(builder.selectedNode.value?.props ?? {}, key) && !['class', 'style'].includes(key)).sort());
    const source = computed(() => builder.activeDefinition.value ? sourceCode(builder.activeDefinition.value) : '');
    watch(builder.selectedNode, value => { propsDraft.value = JSON.stringify(value?.props ?? {}, null, 2); localError.value = ''; }, { deep: true, immediate: true });
    watch(builder.activeDefinition, value => { definitionDraft.value = JSON.stringify(value ?? {}, null, 2); }, { deep: true, immediate: true });
    function setProperty(key, value) { builder.updateNode({ ...builder.selectedNode.value.props, [key]: value }); }
    function addProperty(event) {
      const key = event.target.value; if (!key) return;
      const descriptor = descriptors.value[key]; const value = descriptor?.default;
      setProperty(key, typeof value === 'function' ? (descriptor.type === Array ? [] : descriptor.type === Object ? {} : null) : value ?? ''); event.target.value = '';
    }
    function changeType(event) { builder.commit(() => { builder.selectedNode.value.name = event.target.value; }); }
    function clearProps() { propsDraft.value = '{}'; applyProps(); }
    function applyProps() { try { const props = parseJson(propsDraft.value); if (!props || typeof props !== 'object' || Array.isArray(props)) throw new Error(); builder.updateNode(props); localError.value = ''; } catch { localError.value = 'zx_builder_invalid_json'; } }
    function applyDefinition() {
      try { const def = validateDefinition(parseJson(definitionDraft.value)); builder.updateDefinition(current => Object.assign(current, { ...def, id: current.id })); builder.nodeId.value = null; localError.value = ''; } catch (exception) { localError.value = exception.message.startsWith('zx_') ? exception.message : 'zx_builder_invalid_json'; }
    }
    const currentData = computed(() => builder.activeDefinition.value ? dataFor(builder.activeDefinition.value, builder.mode.value === 'template' ? builder.activeInstance.value?.data : {}) : {});
    const visibleFields = computed(() => builder.activeDefinition.value?.fields.filter(field => isFieldVisible(field, currentData.value)) ?? []);
    function fieldValue(field) { return getValue(currentData.value, field.key); }
    function setFieldValue(field, value) { if (builder.mode.value === 'template') builder.updateData(field.key, value); else builder.updateDefinition(def => { def.fields.find(item => item.key === field.key).default = clone(value); }); }
    return { ...builder, visibleFields, fieldInputType, catalog, descriptors, visibleProperties, extraProperties, propsDraft, definitionDraft, source, localError, codeMode, setProperty, addProperty, changeType, clearProps, applyProps, applyDefinition, fieldValue, setFieldValue };
  }
});
</script>
