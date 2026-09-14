<template>
  <fieldset :disabled="!canEditRemote || remoteProjectBusy" class="grid min-w-0 gap-3 mb-3">
    <BuilderSliderSlides v-if="Array.isArray(node.props.slides)" :modelValue="node.props.slides" @change="setProperty('slides', $event)" />
    <p v-else class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_slider_bound') }}</p>
    <details open>
      <summary class="mb-2 font-medium">{{ translate('zx_builder_slider_layout') }}</summary>
      <template v-if="guidedParams">
        <BuilderInput type="select" v-model="scope" :label="translate('zx_builder_viewport')" :options="scopeOptions" />
        <p class="my-1 text-[10px] text-zaux-dark-grey">{{ translate('zx_builder_slider_inherit') }}</p>
        <BuilderSliderFields v-if="isPlainRecord(localParams)" :key="scope" :modelValue="localParams" :fields="layoutFields" :fallback="fallback" @change="setLayout" />
        <p v-else>{{ translate('zx_builder_slider_bound') }}</p>
      </template>
      <p v-else class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_slider_advanced_params') }}</p>
    </details>
    <details>
      <summary class="mb-2 font-medium">{{ translate('zx_builder_slider_behavior') }}</summary>
      <BuilderSliderFields :modelValue="node.props" :fields="config.fields" @change="updateProperties" />
      <BuilderSliderFields v-if="guidedParams" :modelValue="behaviorParams" :fields="behaviorFields" @change="setProperty('customSliderParams', $event)" />
    </details>
    <details v-if="isPlainRecord(node.props.customSliderParams)">
      <summary>{{ translate('zx_builder_slider_params') }}</summary>
      <BuilderValue type="json" :modelValue="node.props.customSliderParams" :label="translate('zx_builder_slider_params')" @update:modelValue="setParams" />
    </details>
  </fieldset>
</template>
<script>
import { defineComponent, computed, ref, watch } from 'vue';
import { useBuilder } from '../../../../composables/useBuilder.js';
import { sliderControls, sliderBreakpoints, layoutFields, behaviorFields } from '../../../../../integrations/zaux/slider-controls.js';
import { isPlainRecord, pathValue } from '../../../../../domain/slider.js';
import BuilderInput from '../BuilderInput.vue';
import BuilderValue from '../BuilderValue.vue';
import BuilderSliderFields from './BuilderSliderFields.vue';
import BuilderSliderSlides from './BuilderSliderSlides.vue';
export default defineComponent({
  components: { BuilderInput, BuilderValue, BuilderSliderFields, BuilderSliderSlides },
  props: { node: Object },
  setup(props) {
    const builder = useBuilder();
    const config = computed(() => sliderControls[props.node.name]);
    const scope = ref('');
    watch(builder.viewportStyleScope, value => {
      scope.value = String(sliderBreakpoints.find(item => item.name + ':' === value)?.width ?? '');
    }, { immediate: true });
    const params = computed(() => props.node.props.customSliderParams);
    const guidedParams = computed(() => isPlainRecord(params.value)
      && (!config.value.props.overrideDefaultParams || props.node.props.overrideDefaultParams === true)
      && (params.value.breakpoints == null || (isPlainRecord(params.value.breakpoints) && Object.keys(params.value.breakpoints).every(point => /^\d+$/.test(point))))
      && (!params.value.breakpointsBase || params.value.breakpointsBase === 'window'));
    const scopeOptions = computed(() => [
      { value: '', label: builder.translate('zx_builder_slider_base') },
      ...sliderBreakpoints.map(item => ({ value: String(item.width), label: item.name + ' ≥ ' + item.width + 'px' })),
      ...Object.keys(params.value?.breakpoints ?? {})
        .filter(value => /^\d+$/.test(value) && !sliderBreakpoints.some(item => String(item.width) === value))
        .map(value => ({ value, label: '≥ ' + value + 'px' }))
    ]);
    const localParams = computed(() => scope.value ? params.value?.breakpoints?.[scope.value] ?? {} : params.value);
    const fallback = computed(() => Object.fromEntries(layoutFields.map(field => [
      field.path, scope.value ? pathValue(params.value, field.path) : undefined
    ])));
    const behaviorParams = computed(() => ({
      ...params.value,
      ...(params.value?.pagination == null || typeof params.value.pagination === 'boolean' ? { pagination: { enabled: params.value?.pagination === true, clickable: true } } : {})
    }));
    function updateProperties(value) {
      if (!builder.canEditRemote.value || builder.remoteProjectBusy.value) return;
      builder.updateNode(value);
    }
    function setProperty(key, value) { updateProperties({ ...props.node.props, [key]: value }); }
    function setParams(value) { if (isPlainRecord(value)) setProperty('customSliderParams', value); }
    function setLayout(value) {
      if (!scope.value) { setParams(value); return; }
      const breakpoints = { ...params.value.breakpoints };
      if (Object.keys(value).length) breakpoints[scope.value] = value;
      else delete breakpoints[scope.value];
      setParams({ ...params.value, breakpoints });
    }
    return { ...builder, config, scope, scopeOptions, guidedParams, localParams, fallback, behaviorParams,
      layoutFields, behaviorFields, isPlainRecord, updateProperties, setProperty, setParams, setLayout };
  }
});
</script>
