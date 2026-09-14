import cardMeta from '@zx_core/components/shared/card/Card.meta.js';
// Add registered Zaux components here; the slide editor reads this catalog.
export default [
  {
    name: 'Zimg', label: 'zx_builder_slide_image',
    props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false, aspectRatio: 'aspect-16-9', imgClasses: ['w-full', 'h-full', 'object-cover'] },
    fields: [
      { path: 'src', label: 'zx_builder_slide_image_url' },
      { path: 'alt', label: 'zx_builder_slide_alt' },
      { path: 'aspectRatio', label: 'zx_builder_slide_ratio', type: 'select', options: [{ value: 'aspect-16-9', label: '16:9' }, { value: 'aspect-4-3', label: '4:3' }, { value: 'aspect-1-1', label: '1:1' }] }
    ]
  },
  {
    name: 'Card', label: 'zx_builder_slide_card',
    props: { theme : 'light1', title: 'Lorem ipsum', excerpt: 'dolor sit', url: '#card-url-sample', wrapperLink: true, media: { type: 'img', props: { src: '/assets/builder/placeholder.svg', alt: '' } } },
    fields: [
      { path: 'theme', label: 'zx_builder_slide_theme', type: 'select', default: 'light1', options: cardMeta.default.themes.map(value => ({ value, label: value })) },
      { path: 'eyelet', label: 'zx_builder_slide_eyelet' },
      { path: 'title', label: 'zx_builder_slide_title' },
      { path: 'subTitle', label: 'zx_builder_slide_subtitle' },
      { path: 'excerpt', label: 'zx_builder_slide_text', type: 'textarea' },
      { path: 'url', label: 'zx_builder_slide_link' },
      { path: 'media.props.src', label: 'zx_builder_slide_image_url' },
      { path: 'media.props.alt', label: 'zx_builder_slide_alt' }
    ]
  },
  {
    name: 'CardPic', label: 'zx_builder_slide_card_pic',
    props: { theme: 'light1', title: '', excerpt: '', url: '', mediaRatio: 'aspect-4-3', media: { type: 'img', props: { src: '/assets/builder/placeholder.svg', alt: '' } } },
    fields: [
      { path: 'eyelet', label: 'zx_builder_slide_eyelet' },
      { path: 'title', label: 'zx_builder_slide_title' },
      { path: 'excerpt', label: 'zx_builder_slide_text', type: 'textarea' },
      { path: 'url', label: 'zx_builder_slide_link' },
      { path: 'media.props.src', label: 'zx_builder_slide_image_url' },
      { path: 'media.props.alt', label: 'zx_builder_slide_alt' },
      { path: 'mediaRatio', label: 'zx_builder_slide_ratio', type: 'select', options: [{ value: 'aspect-16-9', label: '16:9' }, { value: 'aspect-4-3', label: '4:3' }, { value: 'aspect-1-1', label: '1:1' }] }
    ]
  }
];
