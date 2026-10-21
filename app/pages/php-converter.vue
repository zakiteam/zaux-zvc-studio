<template>
  <div class="flex flex-col min-h-full">
    <!-- PHP conversion of a components/virtual folder (ZIP or file system folder), with the same PHP export as the Studio ZVC/ZVPs. -->
    <header class="sticky top-0 z-20 border-b-slim border-zaux-light-grey bg-zaux-light">
      <div class="flex min-h-[52px] flex-wrap items-center gap-1 px-3 pb-2 pt-2 max-[700px]:px-1.5">
        <div class="flex items-baseline min-w-0 gap-1 mr-auto">
          <h1 tabindex="-1" class="truncate text-[16px] font-semibold">{{ translate('zx_builder_php_convert') }}</h1>
          <span v-if="result" class="text-[11px] text-zaux-dark-grey">{{ result.components.length }}</span>
        </div>
        <!-- Folders and repositories are read again, so changes made in the project are picked up. -->
        <BuilderButton v-if="source && source.kind !== 'zip'" size="xs" variant="light" icon="refresh" :label="translate('zx_builder_php_convert_reload')" :disabled="busy" @click="convert" />
        <BuilderButton v-if="result" size="xs" variant="light" icon="close" :label="translate('zx_builder_php_convert_reset')" :disabled="busy" @click="reset" />
        <BuilderPhpThemeWrite v-if="hasFiles" :files="result.files" :disabled="busy" />
        <BuilderButton v-if="hasFiles" size="xs" variant="primary" icon="download" :label="translate('zx_builder_download_php')" :disabled="busy" @click="download" />
      </div>
    </header>

    <div class="flex-1 px-3 py-2 max-[700px]:px-1.5">
      <p class="mb-1 max-w-[880px] text-[12px] leading-[1.7] text-zaux-dark-grey">{{ translate('zx_builder_php_convert_intro') }}</p>
      <p class="mb-2 max-w-[880px] rounded-xs bg-utility-warning/15 p-1.5 text-[11px] leading-[1.7] text-zaux-dark">{{ translate('zx_builder_php_convert_trust') }}</p>

      <!-- Source: ZIP or file system folder, or a GitHub repository (read only). -->
      <div class="mb-1.5 flex w-fit gap-[2px] rounded-xxs bg-zaux-white p-[2px]" role="group" :aria-label="translate('zx_builder_php_convert_source')">
        <button v-for="option in ['files', 'github']" :key="option" type="button"
          class="rounded-xxs px-1 py-0.25 text-[11px] font-semibold focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
          :class="mode === option ? 'bg-zaux-light text-zaux-dark' : 'text-zaux-dark-grey hover:text-zaux-dark'"
          :aria-pressed="mode === option" :disabled="busy" @click="mode = option">
          {{ translate('zx_builder_php_convert_source_' + option) }}
        </button>
      </div>
      <!-- v-show keeps the token, repositories and selection when switching sources. -->
      <BuilderGithubSource v-show="mode === 'github'" :disabled="busy" @convert="use" />
      <div v-show="mode === 'files'">
      <label
        class="flex max-w-[880px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border-dashed border-slim p-4 text-center focus-within:outline focus-within:outline-2 focus-within:outline-zaux-accent"
        :class="dragging ? 'border-zaux-accent bg-zaux-accent/10' : 'border-zaux-light-grey bg-zaux-white hover:border-zaux-accent'"
        :aria-busy="busy"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="drop"
      >
        <Icon iconName="upload" size="text-icon-s" class="text-zaux-accent" aria-hidden="true" />
        <span class="text-[12px] font-semibold">{{ translate(busy ? 'zx_builder_php_convert_running' : 'zx_builder_php_convert_pick') }}</span>
        <span class="text-[11px] text-zaux-dark-grey">{{ sourceName || translate('zx_builder_php_convert_pick_hint') }}</span>
        <input type="file" accept=".zip,application/zip" class="sr-only" :disabled="busy" @change="pick" />
      </label>
      <div class="mt-1 flex max-w-[880px] flex-wrap items-center gap-1">
        <BuilderButton size="xs" variant="primary" icon="folder" :label="translate('zx_builder_php_convert_folder')" :disabled="busy" @click="pickFolder" />
        <span class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_php_convert_folder_hint') }}</span>
        <!-- Fallback where the File System Access API is missing: the browser reads the chosen folder once. -->
        <input ref="folderInput" type="file" webkitdirectory class="sr-only" tabindex="-1" aria-hidden="true" :disabled="busy" @change="pickFiles" />
      </div>
      </div>
      <p v-if="source" class="mt-1 text-[11px] text-zaux-dark-grey" role="status">
        {{ translate(busy ? 'zx_builder_php_convert_running' : 'zx_builder_php_convert_current') }} <code class="text-[10px]">{{ sourceName }}</code>
      </p>

      <div class="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[12px]">
        <label class="flex w-fit cursor-pointer items-center gap-1">
          <input v-model="acf" type="checkbox" class="!w-auto accent-zaux-accent" :disabled="busy" />
          {{ translate('zx_builder_php_include_acf') }} <code class="text-[10px] text-zaux-dark-grey">&lt;Name&gt;.acf.php</code>
        </label>
        <label class="flex w-fit cursor-pointer items-center gap-1">
          <input v-model="readme" type="checkbox" class="!w-auto accent-zaux-accent" :disabled="busy" />
          {{ translate('zx_builder_php_include_readme') }} <code class="text-[10px] text-zaux-dark-grey">README.md</code>
        </label>
      </div>

      <p v-if="error" role="alert" class="mt-2 max-w-[880px] rounded-xs bg-utility-error/10 p-1.5 text-utility-error">{{ translate(error) }}</p>

      <template v-if="result">
        <section class="mt-3">
          <h2 class="mb-1 text-[13px] font-semibold">{{ translate('zx_builder_php_convert_result') }}</h2>
          <p class="mb-1 text-[11px] text-zaux-dark-grey" role="status">
            {{ translate('zx_builder_php_convert_summary', { zvc: count('zvc'), zvp: count('zvp'), errors: result.errors.length }) }}
            <template v-if="result.root"> · <code class="text-[10px]">{{ result.root }}</code></template>
          </p>
          <ul v-if="result.components.length" role="list" class="m-0 mb-2 grid list-none grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-0.5 p-0">
            <li v-for="item in result.components" :key="item.entry" class="min-w-0 rounded-xxs bg-zaux-white px-1 py-0.5">
              <button type="button" class="block w-full min-w-0 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent" @click="selectedFile = item.entry">
                <span class="mr-0.5 rounded-xxs bg-zaux-light px-0.5 font-mono text-[9px] font-semibold text-zaux-dark-grey">{{ item.kind.toUpperCase() }}</span>
                <span class="font-mono text-[11px] font-semibold">{{ item.fn }}()</span>
                <span class="block truncate font-mono text-[9px] text-zaux-dark-grey" :title="item.key">{{ item.key }}</span>
              </button>
            </li>
          </ul>
          <div v-if="result.errors.length" class="mb-2 rounded-xs bg-utility-error/10 p-1.5">
            <h3 class="mb-0.5 text-[11px] font-semibold text-utility-error">{{ translate('zx_builder_php_convert_failed') }}</h3>
            <ul role="list" class="m-0 list-none p-0 text-[11px] leading-[1.7]">
              <li v-for="item in result.errors" :key="item.key + item.message">
                <code class="text-[10px]">{{ item.key }}</code>: {{ message(item.message) }}
              </li>
            </ul>
          </div>
        </section>
        <BuilderFileExplorer v-if="hasFiles" :files="result.files" v-model:selected="selectedFile" />
      </template>
    </div>
  </div>
</template>
<script>
import { computed, defineComponent, ref, watch } from 'vue';
import { useTranslation } from '../composables/useTranslation.js';
import { downloadZip } from '../services/files.js';
import { canPickDirectory, convertVirtualSource, pickVirtualDirectory, virtualSources } from '../services/php-converter.js';
import { phpExportOptions } from '../services/php-export.js';

definePageMeta({ layout: 'hub' });
export default defineComponent({
  setup() {
    const { translate } = useTranslation();
    // { kind: 'zip' | 'directory' | 'files' | 'github', name, read }; never persisted.
    const source = ref(null);
    const mode = ref('files');
    const folderInput = ref(null);
    const readme = ref(false);
    const acf = ref(true);
    const busy = ref(false);
    const dragging = ref(false);
    const error = ref('');
    const result = ref(null);
    const selectedFile = ref('');
    const sourceName = computed(() => source.value ? (['directory', 'files'].includes(source.value.kind) ? source.value.name + '/' : source.value.name) : '');
    const hasFiles = computed(() => !!result.value && Object.keys(result.value.files).length > 0);
    const count = kind => result.value?.components.filter(item => item.kind === kind).length ?? 0;
    // Studio error keys are translated; JavaScript errors of the uploaded modules are shown as they are.
    const message = text => typeof text === 'string' && text.startsWith('zx_') ? translate(text) : text;
    async function convert() {
      if (!source.value || busy.value) return;
      busy.value = true; error.value = '';
      try {
        const next = await convertVirtualSource(source.value, phpExportOptions({ readme: readme.value, acf: acf.value }));
        result.value = next;
        if (!Object.hasOwn(next.files, selectedFile.value)) selectedFile.value = next.components[0]?.entry ?? Object.keys(next.files)[0] ?? '';
      } catch (exception) {
        result.value = null;
        error.value = typeof exception?.message === 'string' && exception.message.startsWith('zx_') ? exception.message : 'zx_builder_php_convert_error';
      } finally { busy.value = false; }
    }
    function use(next) {
      source.value = next;
      convert();
    }
    function accept(next) {
      if (!next) return;
      if (!/\.zip$/i.test(next.name)) { error.value = 'zx_builder_php_convert_zip_invalid'; return; }
      use(virtualSources.zip(next));
    }
    function pick(event) {
      accept(event.target.files?.[0]);
      event.target.value = '';
    }
    async function pickFolder() {
      if (busy.value) return;
      if (!canPickDirectory()) { folderInput.value?.click(); return; }
      try { use(virtualSources.directory(await pickVirtualDirectory())); }
      catch (exception) { if (exception?.name !== 'AbortError') error.value = 'zx_builder_php_convert_folder_error'; }
    }
    function pickFiles(event) {
      const files = event.target.files;
      if (files?.length) use(virtualSources.files(files));
      event.target.value = '';
    }
    // A dropped folder is read through its handle (Chromium); otherwise only ZIP files are accepted.
    async function drop(event) {
      dragging.value = false;
      if (busy.value) return;
      const item = [...(event.dataTransfer?.items ?? [])].find(entry => entry.kind === 'file');
      const pending = item?.getAsFileSystemHandle?.();
      const file = event.dataTransfer?.files?.[0];
      const handle = pending ? await pending.catch(() => null) : null;
      if (handle?.kind === 'directory') use(virtualSources.directory(handle));
      else accept(file);
    }
    function reset() {
      source.value = null; result.value = null; error.value = ''; selectedFile.value = '';
    }
    async function download() {
      if (!hasFiles.value) return;
      const base = (source.value?.name ?? '').replace(/\.zip$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-') || 'components';
      await downloadZip(`${base}-php.zip`, result.value.files);
    }
    // ACF bridges and README are part of the conversion result.
    watch([readme, acf], () => { if (source.value) convert(); });
    return { translate, source, mode, use, folderInput, readme, acf, busy, dragging, error, result, selectedFile, sourceName, hasFiles, count, message, convert, pick, pickFolder, pickFiles, drop, reset, download };
  }
});
</script>
