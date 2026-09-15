const modules = import.meta.glob('../../vendor/zaux/{core,project}/components/virtual/**/*.{zvc,zvp}.js', { eager: true, import: 'default' });
const defaults = import.meta.glob('../../vendor/zaux/{core,project}/components/virtual/**/data/*.defaults.js', { eager: true, import: 'default' });
const rawFiles = import.meta.glob([
  '../../vendor/zaux/{core,project}/components/virtual/**/*.{js,json,css,scss}',
  '!../../vendor/zaux/**/docs/**',
  '!../../vendor/zaux/**/*.stories.js'
], { eager: true, query: '?raw', import: 'default' });

export const zauxSources = Object.fromEntries(Object.entries(modules).map(([path, module]) => {
  const directory = path.slice(0, path.lastIndexOf('/') + 1);
  const name = path.split('/').at(-1).replace(/\.zv[cp]\.js$/, '');
  const key = path.replace('../../vendor/zaux/', 'zaux/');
  return [key, {
    module: { ...module, ZVCName: module.ZVCName ?? module.meta?.ZVCName ?? 'ZVC' + name },
    defaults: defaults[directory + 'data/' + name + '.defaults.js'] ?? {},
    files: Object.fromEntries(Object.entries(rawFiles)
      .filter(([file]) => file.startsWith(directory))
      .map(([file, source]) => [file.slice(directory.length), source]))
  }];
}));
