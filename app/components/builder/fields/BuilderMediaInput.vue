<template>
  <div class="grid min-w-0 gap-2">
    <div role="group" :aria-label="translate('zx_builder_media_type')" class="flex gap-0.5">
      <BuilderButton size="xs" :variant="type === 'img' ? 'primary' : 'secondary'" :aria-pressed="type === 'img'" :label="translate('zx_builder_media_image')" @click="setType('img')" />
      <BuilderButton size="xs" :variant="type === 'video' ? 'primary' : 'secondary'" :aria-pressed="type === 'video'" :label="translate('zx_builder_media_video')" @click="setType('video')" />
    </div>

    <BuilderInput v-if="hasFillSpace" :id="`${id}-fill`" type="select" :modelValue="String(draft.fillSpace)" :label="translate('zx_builder_media_fill')" :disabled="disabled" :options="yesNo" @update:modelValue="setFillSpace($event === 'true')" />

    <template v-if="type === 'img'">
      <BuilderImageInput :id="`${id}-src`" :modelValue="propsValue.src ?? ''" :label="translate('zx_builder_media_url')" :disabled="disabled" @update:modelValue="setProp('src', $event)" />
      <BuilderInput :id="`${id}-alt`" v-model="altDraft" type="text" :label="translate('zx_builder_media_alt')" :disabled="disabled" @change="commitAlt" />
      <BuilderInput :id="`${id}-ratio`" type="select" :modelValue="propsValue.aspectRatio ?? ''" :label="translate('zx_builder_media_ratio')" :disabled="disabled" :options="ratioOptions" @update:modelValue="setProp('aspectRatio', $event)" />
      <BuilderInput :id="`${id}-lazy`" type="select" :modelValue="String(propsValue.lazyload ?? true)" :label="translate('zx_builder_media_lazyload')" :disabled="disabled" :options="yesNo" @update:modelValue="setProp('lazyload', $event === 'true')" />

      <div class="grid gap-1">
        <p class="mb-0.5 text-[11px] font-medium text-zaux-dark">{{ translate('zx_builder_media_behavior') }}</p>
        <div role="group" :aria-label="translate('zx_builder_media_behavior')" class="flex flex-wrap gap-0.5">
          <BuilderButton size="xs" :variant="hasClass(classes, 'w-full') ? 'primary' : 'secondary'" :aria-pressed="hasClass(classes, 'w-full')" :label="translate('zx_builder_media_full_width')" @click="toggleClass('w-full')" />
          <BuilderButton size="xs" :variant="hasClass(classes, 'h-full') ? 'primary' : 'secondary'" :aria-pressed="hasClass(classes, 'h-full')" :label="translate('zx_builder_media_full_height')" @click="toggleClass('h-full')" />
        </div>
        <BuilderInput :id="`${id}-fit`" type="select" :modelValue="objectFit" :label="translate('zx_builder_media_object_fit')" :disabled="disabled" :options="objectFitOptions" @update:modelValue="changeObjectFit($event)" />
      </div>
    </template>

    <template v-else>
      <BuilderInput :id="`${id}-video-url`" v-model="videoUrlDraft" type="text" :label="translate('zx_builder_media_video_url')" :disabled="disabled" @change="commitVideoUrl" />
      <BuilderInput :id="`${id}-video-format`" type="select" :modelValue="videoSource.type ?? 'video/mp4'" :label="translate('zx_builder_media_format')" :disabled="disabled" :options="formatOptions" @update:modelValue="setVideoType($event)" />
      <BuilderImageInput :id="`${id}-poster`" :modelValue="propsValue.poster ?? ''" :label="translate('zx_builder_media_poster')" :disabled="disabled" @update:modelValue="setProp('poster', $event)" />
      <div class="grid gap-1">
        <p class="mb-0.5 text-[11px] font-medium text-zaux-dark">{{ translate('zx_builder_media_behavior') }}</p>
        <div role="group" :aria-label="translate('zx_builder_media_behavior')" class="flex flex-wrap gap-0.5">
          <BuilderButton size="xs" :variant="propsValue.autoPlay ? 'primary' : 'secondary'" :aria-pressed="!!propsValue.autoPlay" :label="translate('zx_builder_media_autoplay')" @click="setProp('autoPlay', !propsValue.autoPlay)" />
          <BuilderButton size="xs" :variant="propsValue.muted ? 'primary' : 'secondary'" :aria-pressed="!!propsValue.muted" :label="translate('zx_builder_media_muted')" @click="setProp('muted', !propsValue.muted)" />
          <BuilderButton size="xs" :variant="propsValue.loop ? 'primary' : 'secondary'" :aria-pressed="!!propsValue.loop" :label="translate('zx_builder_media_loop')" @click="setProp('loop', !propsValue.loop)" />
          <BuilderButton size="xs" :variant="propsValue.activateControls ? 'primary' : 'secondary'" :aria-pressed="!!propsValue.activateControls" :label="translate('zx_builder_media_controls')" @click="setProp('activateControls', !propsValue.activateControls)" />
        </div>
      </div>
    </template>

    <details>
      <summary class="text-[11px]">{{ translate('zx_builder_advanced') }}</summary>
      <BuilderValue type="json" :modelValue="draft" :label="translate('zx_builder_media')" :disabled="disabled" @update:modelValue="applyJson" />
    </details>
  </div>
</template>

<script>
import { computed, defineComponent, ref, useId, watch } from 'vue';
import { useTranslation } from '../../../composables/useTranslation.js';
import { clone } from '../../../../domain/nodes.js';
import {
  hasClass, isMediaObject, mediaClassSurface, mediaType, setClass, setObjectFit
} from '../../../../domain/media.js';
import BuilderButton from '../BuilderButton.vue';
import BuilderInput from './BuilderInput.vue';
import BuilderImageInput from './BuilderImageInput.vue';
import BuilderValue from './BuilderValue.vue';

export default defineComponent({
  name: 'BuilderMediaInput',
  components: { BuilderButton, BuilderInput, BuilderImageInput, BuilderValue },
  props: {
    modelValue: { default: null },
    id: String,
    label: String,
    disabled: Boolean
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const i18n = useTranslation();
    const id = useId();

    function normalize(value) {
      const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      const next = { ...raw };
      if (!next.props || typeof next.props !== 'object' || Array.isArray(next.props)) next.props = {};
      next.type = mediaType(next);
      return next;
    }

    const draft = ref(normalize(props.modelValue));
    watch(() => props.modelValue, value => { draft.value = normalize(value); }, { deep: true });

    const type = computed(() => draft.value.type);
    const propsValue = computed(() => draft.value.props ?? {});
    const surface = computed(() => mediaClassSurface(draft.value));
    const classes = computed(() => {
      if (surface.value === 'elementClasses') {
        return Array.isArray(draft.value.elementClasses) ? draft.value.elementClasses : [];
      }
      return Array.isArray(propsValue.value.imgClasses) ? propsValue.value.imgClasses : [];
    });
    const objectFit = computed(() => {
      const list = classes.value;
      if (list.includes('object-cover')) return 'object-cover';
      if (list.includes('object-contain')) return 'object-contain';
      if (list.includes('object-fill')) return 'object-fill';
      if (list.includes('object-none')) return 'object-none';
      return '';
    });
    const videoSource = computed(() => {
      const list = propsValue.value.srcList;
      return Array.isArray(list) && list.length ? list[0] : { url: '', type: 'video/mp4' };
    });
    const hasFillSpace = computed(() => Object.hasOwn(draft.value, 'fillSpace'));

    const altDraft = ref(propsValue.value.alt ?? '');
    watch(() => propsValue.value.alt, value => { altDraft.value = value ?? ''; });
    const videoUrlDraft = ref(videoSource.value.url ?? '');
    watch(() => videoSource.value.url, value => { videoUrlDraft.value = value ?? ''; });

    function commit(value) {
      if (props.disabled) return;
      draft.value = normalize(value);
      emit('update:modelValue', clone(draft.value));
    }
    function setType(next) {
      commit({ ...draft.value, type: next });
    }
    function setFillSpace(value) {
      commit({ ...draft.value, fillSpace: value });
    }
    function setProp(key, value) {
      commit({ ...draft.value, props: { ...propsValue.value, [key]: value } });
    }
    function setClasses(list) {
      if (surface.value === 'elementClasses') commit({ ...draft.value, elementClasses: list });
      else commit({ ...draft.value, props: { ...propsValue.value, imgClasses: list } });
    }
    function toggleClass(token) {
      setClasses(setClass(classes.value, token, !hasClass(classes.value, token)));
    }
    function changeObjectFit(fit) {
      setClasses(setObjectFit(classes.value, fit));
    }
    function setVideoUrl(url) {
      const list = Array.isArray(propsValue.value.srcList) ? [...propsValue.value.srcList] : [];
      if (!list.length) list.push({ url: '', type: 'video/mp4' });
      list[0] = { ...list[0], url };
      setProp('srcList', list);
    }
    function setVideoType(typeValue) {
      const list = Array.isArray(propsValue.value.srcList) ? [...propsValue.value.srcList] : [];
      if (!list.length) list.push({ url: '', type: 'video/mp4' });
      list[0] = { ...list[0], type: typeValue };
      setProp('srcList', list);
    }
    function commitAlt() {
      setProp('alt', altDraft.value);
    }
    function commitVideoUrl() {
      setVideoUrl(videoUrlDraft.value);
    }
    function applyJson(value) {
      if (!isMediaObject(value)) return;
      commit(value);
    }

    const yesNo = computed(() => [
      { value: 'true', label: i18n.translate('zx_builder_yes') },
      { value: 'false', label: i18n.translate('zx_builder_no') }
    ]);
    const ratioOptions = [
      { value: '', label: i18n.translate('zx_builder_media_none') },
      { value: 'aspect-16-9', label: '16:9' },
      { value: 'aspect-4-3', label: '4:3' },
      { value: 'aspect-1-1', label: '1:1' }
    ];
    const objectFitOptions = [
      { value: '', label: i18n.translate('zx_builder_media_none') },
      { value: 'object-cover', label: i18n.translate('zx_builder_media_cover') },
      { value: 'object-contain', label: i18n.translate('zx_builder_media_contain') }
    ];
    const formatOptions = [
      { value: 'video/mp4', label: 'MP4' },
      { value: 'video/webm', label: 'WebM' },
      { value: 'video/ogg', label: 'Ogg' }
    ];

    return {
      ...i18n,
      id,
      draft,
      type,
      propsValue,
      classes,
      objectFit,
      videoSource,
      hasFillSpace,
      altDraft,
      videoUrlDraft,
      yesNo,
      ratioOptions,
      objectFitOptions,
      formatOptions,
      hasClass,
      setType,
      setFillSpace,
      setProp,
      toggleClass,
      changeObjectFit,
      setVideoUrl,
      setVideoType,
      commitAlt,
      commitVideoUrl,
      applyJson
    };
  }
});
</script>
