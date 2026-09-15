import cardMeta from '@zx_core/components/shared/card/Card.meta.js';
// Add registered Zaux components here; the slide editor reads this catalog.
export default [
  {
    name: 'HeroSection', label: 'zx_builder_slide_hero',
    props: {
      innerClasses: 'min-h-[480px]', fullViewPort: false, contentPosition: 'center', contained: true,
      bg: { type: 'img', props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false } },
      introText: { title: '', excerpt: '', align: 'center', theme: 'dark1', ctas: [] }
    },
    fields: [
      { path: 'bg.props.src', label: 'zx_builder_slide_image_url' },
      { path: 'bg.props.alt', label: 'zx_builder_slide_alt' },
      { path: 'introText.eyelet', label: 'zx_builder_slide_eyelet' },
      { path: 'introText.title', label: 'zx_builder_slide_title' },
      { path: 'introText.subTitle', label: 'zx_builder_slide_subtitle' },
      { path: 'introText.excerpt', label: 'zx_builder_slide_text', type: 'textarea' },
      { path: 'introText.ctas', label: 'zx_builder_slide_ctas', type: 'json', default: [] },
      {
        path: 'introText.align', label: 'zx_builder_slide_align', type: 'select', default: 'center', options: [
          { value: 'left', labelKey: 'zx_builder_slide_left' }, { value: 'center', labelKey: 'zx_builder_slide_center' }, { value: 'right', labelKey: 'zx_builder_slide_right' }
        ]
      },
      {
        path: 'contentPosition', label: 'zx_builder_slide_position', type: 'select', default: 'center', options: [
          { value: 'top', labelKey: 'zx_builder_slide_top' }, { value: 'center', labelKey: 'zx_builder_slide_center' }, { value: 'bottom', labelKey: 'zx_builder_slide_bottom' }
        ]
      },
      { path: 'contained', label: 'zx_builder_slide_contained', type: 'switch', default: true },
      { path: 'innerClasses', label: 'zx_builder_slide_classes' }
    ]
  },
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
    props: { theme: 'light1', title: 'Lorem ipsum', excerpt: 'dolor sit', url: '#card-url-sample', wrapperLink: true, media: { type: 'img', props: { src: '/assets/builder/placeholder.svg', alt: '' } } },
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
