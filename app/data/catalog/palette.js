import formComponents from './form-components.js';
import contentComponents from './content-components.js';
import { sliderControls } from '../../../integrations/zaux/slider-controls.js';
// Order and membership of the drag-and-drop palette.
// This does not limit components rendered by hand-written ZVCs or saved JSON.
export default [
  ...contentComponents,
  ...formComponents,
  ...Object.entries(sliderControls).map(([name, config]) => ({ name, props: config.props })),
  { name: 'Zsection', container: true, props: { size: 'm', contained: true } },
  { name: 'IntroText', props: { theme: 'light1', subtitle: '', title: 'Titolo della sezione', excerpt: 'Un nuovo spazio per i tuoi contenuti.', size: 'm' } },
  { name: 'ZButton', props: { label: 'Scopri di più', theme: 'primary', tag: 'a', href: '#', size: 's' } },
  { name: 'Paragraph', props: { contentHTML: '<p>Scrivi qui il tuo testo.</p>', size: 'm' } },
  { name: 'Zimg', props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false, imgClasses: ['w-full'] } },
  { name: 'Videoplayer', props: {
    size: 'm', theme: 'light1', rounded: null, showControls: true,
    video: { srcList: [{ url: '/assets/media/samplevid1.mp4', type: 'video/mp4' }], poster: '/assets/builder/placeholder.svg', autoPlay: false, muted: true, loop: false, activateControls: false, fillSpace: true, captions: [] }
  } },
  { name: 'Media', props: {
    type: 'img', fillSpace: true, containerClasses: '', elementClasses: ['w-full'],
    props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false }
  } },
  { name: 'Icon', props: { iconName: 'media', iconSet: 'zaux', size: 'text-icon-m', ariaHidden: true } },
  { name: 'Separator', props: {} },
  { name: 'a', html: true, createProps: t => ({ textContent: t('zx_builder_preset_link'), href: '#', id: '' }) },
  { name: 'div', container: true, html: true, props: {} },
  { name: 'section', container: true, html: true, props: {} },
  { name: 'nav', container: true, html: true, props: {} },
  {
    name: 'ul', container: true, html: true, props: {}, createChildren: t =>
      [1, 2, 3].map(number => ({ name: 'li', props: { textContent: t('zx_builder_preset_list_item') + ' ' + number } }))
  },
  { name: 'li', html: true, createProps: t => ({ textContent: t('zx_builder_preset_list_item') }) },
  { name: 'h2', html: true, props: { textContent: 'Un nuovo titolo' } },
  { name: 'p', html: true, props: { textContent: 'Un nuovo paragrafo.' } },
  { name: 'span', html: true, props: { textContent: 'Testo' } }
];
