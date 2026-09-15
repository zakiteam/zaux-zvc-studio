const paragraph = translate => ({ name: 'Paragraph', props: { contentHTML: '<p>' + translate('zx_builder_preset_excerpt') + '</p>', size: 'm' } });
const button = translate => ({ name: 'ZButton', props: { label: translate('zx_builder_preset_open'), tag: 'button', type: 'button', theme: 'primary', size: 's' } });

export default [
  {
    name: 'Card', createProps: t => ({
      title: t('zx_builder_preset_title'), excerpt: t('zx_builder_preset_excerpt'),
      theme: 'light1', size: 'm', layout: 'stacked', type: 'default', rounded: true,
      url: '#', cta: { label: t('zx_builder_preset_button'), href: '#' },
      media: { type: 'img', props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false } }
    })
  },
  {
    name: 'CardPic', createProps: t => ({
      title: t('zx_builder_preset_title'), excerpt: t('zx_builder_preset_excerpt'),
      theme: 'light1', size: 'm', rounded: true, mediaRatio: 'aspect-[4/3]', contentJustify: 'justify-end',
      enableOverlay: true, enableScale: false, enableGradientHover: true,
      url: '#', cta: { label: t('zx_builder_preset_button'), href: '#' },
      media: { type: 'img', props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false } }
    })
  },
  { name: 'Snippetlabel', createProps: t => ({ title: t('zx_builder_preset_title'), excerpt: t('zx_builder_preset_excerpt'), icon: 'media', theme: 'light1', size: 'm', layout: 'horizontal', align: 'left', href: false }) },
  {
    name: 'ButtonBlock', createProps: t => ({
      theme: 'light1', size: 'm', align: 'left', rounded: true,
      content: { title: t('zx_builder_preset_title'), excerpt: t('zx_builder_preset_excerpt'), size: 'm', layout: 'stacked' },
      button: { label: t('zx_builder_preset_button'), tag: 'a', href: '#' }
    })
  },
  { name: 'Accordion', container: true, createProps: t => ({ title: t('zx_builder_preset_title'), theme: 'light1', size: 'm', type: 'naked', open: false, boxed: true, noBorder: false, content: '' }), createChildren: t => [paragraph(t)] },
  { name: 'OffCanvasTrigger', container: true, props: { offCanvasId: 'offcanvas', autoTrigger: false }, createChildren: t => [button(t)] },
  { name: 'OffCanvas', container: true, createProps: t => ({ offCanvasId: 'offcanvas', title: t('zx_builder_preset_title'), theme: 'light1', size: 'm', position: 'right', isOpen: false, fullScreen: false, backdrop: true, noHead: false, autoOverflow: true, contentType: 'default' }), createChildren: t => [paragraph(t)] },
  { name: 'ZModalTrigger', container: true, props: { modalId: 'modal' }, createChildren: t => [button(t)] },
  { name: 'ZModal', container: true, createProps: t => ({ modalId: 'modal', title: t('zx_builder_preset_title'), theme: 'light1', size: 'm', isOpen: false, fullScreen: false, noHead: false, noFooter: true, backdropBlur: true, contentPadding: true }), createChildren: t => [paragraph(t)] }
];
