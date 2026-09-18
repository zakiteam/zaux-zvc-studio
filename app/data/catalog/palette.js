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
  {
    name: 'IntroText',
    props: {
      size: 'm',
      theme: 'light1',
      eyelet : "Lorem ipsum",
      subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      title: 'Lorem ipsum',
      excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      ctas: [
        {
          href: "#lorem-ipsum",
          label: "Lorem ipsum",
        },
        {
          theme: "secondary",
          href: "#lorem-ipsum",
          label: "Lorem ipsum",
        },
      ],
    }
  },
  {
    name: 'ZButton',
    props: {
      label: 'Scopri di più',
      theme: 'primary',
      tag: 'a',
      href: '#',
      size: 's'
    }
  },
  { name: 'Paragraph', props: { contentHTML: '<p>Your text here</p>', size: 'm' } },
  { name: 'Zimg', props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false, imgClasses: ['w-full'] } },
  {
    name: 'Videoplayer', props: {
      size: 'm', theme: 'light1', rounded: null, showControls: true,
      video: { srcList: [{ url: '/assets/media/samplevid1.mp4', type: 'video/mp4' }], poster: '/assets/builder/placeholder.svg', autoPlay: false, muted: true, loop: false, activateControls: false, fillSpace: true, captions: [] }
    }
  },
  {
    name: 'Media', props: {
      type: 'img', fillSpace: true, containerClasses: '', elementClasses: ['w-full'],
      props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false }
    }
  },
  { name : "RichText" },
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
  {
    name : "HtmlRenderer",
    container : true,
    props : {
      tag : "div",
      html : "Your content here"
    }
  },
  { name: 'li', html: true, container : true },
  { name: 'h1', html: true, props: { class : 'text-display-l', textContent: 'Heading 1' } },
  { name: 'h2', html: true, props: { class : 'text-display-m', textContent: 'Heading 2' } },
  { name: 'h3', html: true, props: { class : 'text-display-s', textContent: 'Heading 3' } },
  { name: 'h4', html: true, props: { class : 'text-display-xs', textContent: 'Heading 4' } },
  { name: 'h5', html: true, props: { class : 'text-display-xs', textContent: 'Heading 5' } },
  { name: 'h6', html: true, props: { class : 'text-display-xs', textContent: 'Heading 6' } },
  { name: 'header', container: true, html: true, props : { id : "#zx-app-header"} },
  { name: 'footer', container: true, html: true, props : { id: "#zx-app-footer"} },
  { name: 'p', html: true, props: { textContent: 'A new paragraph' } },
  { name: 'span', html: true, props: { textContent: 'Span text' } }
];
