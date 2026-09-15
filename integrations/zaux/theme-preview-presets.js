// Reviewed against the pinned component templates, props and theme selectors.
// These samples are independent of the insertion palette and never become project data.
export function createThemePreviewPresets(t) {
  const title = t('zx_builder_preset_title');
  const excerpt = t('zx_builder_preset_excerpt');
  const label = t('zx_builder_preset_button');
  const html = '<p>' + excerpt + '</p>';
  const image = { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false };
  const media = { type: 'img', props: image };
  const button = { label, tag: 'button', type: 'button', theme: 'primary', size: 's' };
  const intro = { title, excerpt, ctas: [button] };
  const paragraph = { name: 'Paragraph', props: { contentHTML: html, size: 'm' }, children: [] };
  const componentContent = { type: 'component', name: 'Paragraph', props: { contentHTML: html } };
  const snippet = { title, excerpt, icon: 'media' };
  const options = [1, 2, 3].map(number => ({ value: 'option-' + number, label: t('zx_builder_preset_option', { number }) }));
  const slides = [1, 2, 3].map(number => ({ type: 'component', name: 'ImgBlock',
    props: { img: image, rounded: true }, caption: t('zx_builder_preset_option', { number }) }));
  const input = { theme: 'light1', size: 'm', label: t('zx_builder_preset_field'), helperText: excerpt, state: 'idle', disabled: false, required: false };
  const inputStates = ['idle', 'valid', 'error'];
  const textInput = { props: { ...input, name: 'theme-text', type: 'text', modelValue: '', placeholder: t('zx_builder_preset_placeholder'), readonly: false,
    rounded: true, hasIcon: true, icon: 'media', focused: false, prefixed: false, prefixText: '', suffixed: false, suffixText: '' },
    selects: { state: inputStates, type: ['text', 'email', 'password', 'search', 'number'] } };
  const checkInput = { ...input, checked: true, checkedValue: 'yes', modelValue: '', rounded: true, focused: false };
  const selectInput = { ...input, options, modelValue: 'option-1', rounded: true, focused: false };
  const base = { theme: 'light1', size: 'm' };
  const align = ['left', 'center', 'right'];

  return {
    Buttonstrip: { props: { ...base, contained: false, buttons: [1, 2, 3].map(() => ({ content: snippet, button })), buttonBlockTheme: 'light1' } },
    DisplayBox: { props: { ...base, introText: intro, media, invert: false, microInteractions: false } },
    FeatBannerSection: { props: { ...base, introText: intro, media, contained: false, microInteractions: false } },
    FlowingMenu: { props: { ...base, rounded: true, bordered: true, items: options.map(item => ({ text: item.label, link: '#', image: image.src })) } },
    SectionSplitIntro: { props: { ...base, introText: intro, media, contained: false, flipped: false } },
    SectionSplitWide: { props: { ...base, introText: intro, media, flipped: false } },
    SliderCaptioned: { props: { ...base, slides, contained: false, enableNavBtn: true, overflow: false,
      sliderParams: { slidesPerView: 1, spaceBetween: 16, loop: false } }, sizes: ['m'] },
    Abstract: { props: { ...base, title, text: html, icon: 'media', cta: button } },
    Accordion: { props: { ...base, title, content: html, open: true, type: 'wrapped', boxed: true, noBorder: false, rounded: true,
      titleIcon: 'media', openIcon: 'add', closeIcon: 'remove', richTextTheme: 'light1' }, selects: { type: ['naked', 'wrapped'] } },
    Alert: { props: { theme: 'info', size: 'm', title, content: html, dismissable: true, rounded: true } },
    Banner: { props: { ...base, title, subtitle: html, media, cta: button, overlay: true, rounded: true, orientation: 'horizontal',
      dismissable: true, showDismissBtn: true, buttonDismisses: false }, selects: { orientation: ['horizontal', 'vertical'] } },
    Blockquote: { props: { ...base, excerpt: html, userMeta: { title, qualification: excerpt, media }, rounded: true, showQuotationMarks: true } },
    Breadcrumbs: { props: { theme: 'light1', size: 's', crumbs: [{ label: title, href: '#', icon: 'media' }, { label: excerpt, href: '#' }],
      separator: { type: 'icon', iconName: 'chevron-right' } } },
    ZButton: { props: { theme: 'primary', size: 'm', label, tag: 'button', type: 'button', rounded: true, pilled: false, hasIcon: true,
      iconName: 'edit', iconOnly: false, actionIcon: true, actionIconName: 'chevron-right', invert: false, stacked: false, upperCase: false },
      sizes: ['xs', 's', 'm', 'l'] },
    ButtonBlock: { props: { ...base, content: { ...snippet, size: 'm', layout: 'stacked' }, button, align: 'left', rounded: true }, selects: { align } },
    Card: { props: { ...base, title, subTitle: excerpt, excerpt, eyelet: label, media, cta: button, layout: 'stacked', type: 'default',
      rounded: true, wrapperLink: false, invert: false, enableBlur: false }, selects: { layout: ['stacked', 'horizontal'], type: ['default', 'wrapped', 'alt'] } },
    CardMediaBox: { props: { ...base, title, subtitle: html, eyelet: label, media, ctas: [button], enableOverlay: true, rounded: true, aspectRatio: 'aspect-[4/3]' } },
    CardPic: { props: { ...base, title, excerpt, eyelet: label, media, cta: button, rounded: true, mediaRatio: 'aspect-[4/3]',
      contentJustify: 'justify-end', enableOverlay: true, enableBlur: false, enableScale: false, enableGradientHover: true },
      selects: { contentJustify: ['justify-start', 'justify-center', 'justify-end'] } },
    DecoBox: { props: { ...base, title, subtitle: html, eyelet: label, ctas: [button], hasIcon: true, iconName: 'media', align: 'center' }, selects: { align } },
    Dropdown: { props: { theme: 'light1', size: 's', label, items: options.map(item => ({ type: 'option', title: item.label, excerpt, icon: 'media', value: item.value })),
      startOpen: true, stayOpen: true, hoverMode: false, rounded: true, position: 'bottom' },
      selects: { position: ['bottom', 'top', 'left', 'right'] },
      children: [{ name: 'ZButton', props: { ...button, label: t('zx_builder_preset_open') }, children: [] }] },
    EmptyData: { props: { ...base, title, subtitle: excerpt, ctas: [button], hasIcon: true, iconName: 'media', rounded: true } },
    Headline: { props: { ...base, title, subtitle: html, icon: 'media', separated: true, contained: false } },
    ImgBlock: { props: { ...base, img: image, rounded: true, link: null } },
    Input: textInput,
    InputShared: textInput,
    InputCheckbox: { props: { ...checkInput, name: 'theme-checkbox', grouped: false }, selects: { state: inputStates } },
    InputCheckboxCard: { props: { ...checkInput, name: 'theme-checkbox-card', icon: 'media', grouped: false }, selects: { state: inputStates } },
    InputSwitch: { props: { ...checkInput, name: 'theme-switch', grouped: false, microInteractions: false }, selects: { state: inputStates } },
    InputRadio: { props: { ...input, name: 'theme-radio', type: 'radio', checkedValue: 'option-1', modelValue: 'option-1', rounded: true, focused: false }, selects: { state: inputStates } },
    InputSelect: { props: { ...selectInput, name: 'theme-select', placeholder: t('zx_builder_preset_select'), hasIcon: true, icon: 'media' }, selects: { state: inputStates } },
    InputRadioSelect: { props: { ...selectInput, name: 'theme-radio-select', options: options.map((option, index) => ({ ...option, active: index === 0 })), pilled: false }, selects: { state: inputStates } },
    InputMultiSelect: { props: { ...selectInput, name: 'theme-multiselect', options: options.map((option, index) => ({ ...option, active: index === 0 })),
      modelValue: [], placeholder: t('zx_builder_preset_select'), filterOptions: false, hasIcon: true, icon: 'media', outputMode: 'json' }, selects: { state: inputStates } },
    InputFile: { props: { ...input, name: 'theme-file', btnLabel: t('zx_builder_preset_file'), accept: 'image/*', hasIcon: true,
      rounded: true, readonly: false, focused: false }, selects: { state: inputStates } },
    InputRating: { props: { theme: 'light1', size: 'm', name: 'theme-rating', label: t('zx_builder_preset_field'), initialValue: 3, ratingScale: 5,
      icons: { active: 'star-alt-full', inactive: 'star' }, state: 'idle', disabled: false, required: false, focused: false }, selects: { state: inputStates } },
    IntroDesc: { props: { ...base, title, subtitle: excerpt, eyelet: label, excerpt: html, ctas: [button], disableHead: false, invert: false,
      headAlignment: 'left' }, selects: { headAlignment: align } },
    IntroText: { props: { ...base, ...intro, subtitle: excerpt, eyelet: label, align: 'left', maxWidth: false }, selects: { align } },
    Zlink: { props: { ...base, label, href: '#', tag: 'a', enableUIStates: true } },
    List: { props: { ...base, title, listElements: [snippet, { ...snippet, title: label }] } },
    // Upstream ListColumned imports List.meta: supply its theme hooks in the preview bridge.
    ListColumned: { themeClass: 'c-list-columned', props: { ...base, attributes: { listItem: { class: 'c-list-columned__item' } }, elements: [{ items: [paragraph, paragraph] }, { items: [paragraph, paragraph] }] } },
    LiveBorder: { props: { ...base, content: { type: 'html', html }, rounded: true, borderWidth: 1, defaultPadding: true,
      blurBlob: true, hideWhenOutside: false, respondOnClick: false, proximityRadius: 72 } },
    ZModal: { props: { ...base, modalId: 'theme-modal', title, isOpen: true, rounded: true, noHead: false, noFooter: false, contentPadding: true,
      backdropBlur: true, fullScreen: false, content: componentContent, footerContent: { type: 'component', name: 'ZButton', props: button } } },
    Paragraph: { props: { ...base, title, contentHTML: html } },
    richtext: { props: { ...base, contentHTML: '<h2>' + title + '</h2><p><strong>' + label + '</strong> ' + excerpt + '</p><ul><li>' + excerpt + '</li></ul><blockquote>' + excerpt + '</blockquote>', contained: false } },
    ScrollStrip: { props: { ...base, showScrollButtons: true, scrollBy: 200, btnPilled: false, gradientWidth: '2rem', scrollerClass: ['gap-2'] },
      children: Array.from({ length: 12 }, (_, index) => ({ name: 'ZButton', props: { ...button, label: t('zx_builder_preset_option', { number: index + 1 }), class: 'shrink-0' }, children: [] })) },
    Zsection: { props: { ...base, content: componentContent, contained: false, rounded: true, paddingTop: true, paddingBottom: true, overflowContent: false } },
    Slider: { props: { ...base, title, excerpt, slides, fullViewPort: false, slideRatio: 'aspect-[4/3]', rounded: true, dotsRounded: true,
      enableNavBtn: true, enableBullets: true, paginationPosition: 'out', customSliderParams: { slidesPerView: 1, loop: false, speed: 300 } },
      selects: { paginationPosition: ['in', 'out'] } },
    Snippetlabel: { props: { ...base, ...snippet, suffixIcon: 'chevron-right', layout: 'horizontal', align: 'left', verticalAlign: 'top', href: '#' },
      selects: { layout: ['horizontal', 'stacked'], align, verticalAlign: ['top', 'center'] } },
    Spinner: { props: { theme: 'light1', size: 'm' }, sizes: ['xs', 's', 'm', 'l', 'xl'] },
    ZTable: { props: { ...base, rounded: true, fullWidth: true, type: 'standard', tableData: { headers: [title, label],
      rows: [{ values: [{ content: excerpt }, { content: label }] }, { values: [{ content: title }, { content: excerpt }] }] } } },
    Tag: { props: { ...base, label, tag: 'button', type: 'button', dismissable: true, hasIcon: true, iconName: 'close', separated: true, rounded: true, pilled: false } },
    Toast: { props: { ...base, title, content: excerpt, icon: 'media', ctaGroup: [{ ...button, type: 'dismiss' }], rounded: true, pilled: false,
      blurred: false, dismissable: true, contained: false, position: 'bottom-center', showGradient: false, autoTrigger: false, isAppToast: true },
      selects: { position: ['bottom-left', 'bottom-center', 'bottom-right', 'top-left', 'top-center', 'top-right'] } },
    Usermeta: { props: { ...base, title, qualification: excerpt, media, cta: button, stacked: false, stackMetaInfo: false, circled: true } }
  };
}
