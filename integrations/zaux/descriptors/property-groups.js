// Editorial curation of Zaux props for the Inspector Properties tab.
// Every prop keeps its editor; this module only decides the section it is listed
// in, which props are suggested first in "Add property", and which internal props
// are not offered at all (they stay visible and editable when already authored).
// Reviewed against the props of every palette component in the pinned release.

export const propertyGroups = ['content', 'appearance', 'layout', 'behavior', 'other', 'advanced'];

const names = {
  content: [
    'title', 'label', 'eyelet', 'subtitle', 'subTitle', 'excerpt', 'contentHTML', 'textContent', 'innerHTML', 'html',
    'content', 'text', 'caption', 'alt', 'src', 'fallbackSrc', 'href', 'url', 'link', 'media', 'video', 'icon', 'iconName',
    'titleIcon', 'decoImg', 'cta', 'ctas', 'button', 'btnList', 'linkList', 'items', 'slides', 'author', 'placeholder',
    'helperText', 'options', 'headContent', 'footerContent', 'introText', 'introContent', 'sliderContent', 'btnLabel',
    'prefixText', 'suffixText', 'modelValue', 'checkedValue', 'initialValue', 'poster', 'srcList', 'wrapLink'
  ],
  appearance: [
    'theme', 'size', 'rounded', 'pilled', 'dotsRounded', 'roundedMedia', 'invert', 'upperCase', 'fontWeight', 'bg', 'bgColor',
    'mediaBg', 'blurBg', 'overlay', 'enableBlur', 'enableOverlay', 'enableScale', 'enableGradientHover', 'hoverEffect',
    'noBorder', 'boxed', 'backdrop', 'backdropBlur', 'backdropOpacity', 'transparentBackdrop', 'transparentContent',
    'navButtonTheme', 'richTextTheme', 'spinnerTheme', 'btnTheme', 'disableBoxShadow', 'iconSet', 'hasIcon', 'iconOnly',
    'actionIcon', 'actionIconName', 'actionIconFlip', 'suffixIcon', 'openIcon', 'closeIcon', 'noLabel', 'ctaSize',
    'userMetaSize', 'ctaStyle', 'insetShadow', 'shadowInset', 'inClass', 'outClass', 'revealClass', 'scrolledClasses',
    'unScrolledClasses', 'flipped', 'icons'
  ],
  layout: [
    'layout', 'align', 'verticalAlign', 'contentJustify', 'customContentVerticalAlign', 'btnListAlign', 'position',
    'contained', 'container', 'containerClass', 'maxWidth', 'aspectRatio', 'mediaRatio', 'slideRatio', 'fullScreen',
    'fullViewPort', 'fullHeightClass', 'stretchY', 'stacked', 'paddingTop', 'paddingBottom', 'sidePadding', 'fillSpace',
    'width', 'height', 'overflowContent', 'bodyHugsContent', 'disableDefaultPaddings', 'contentPadding', 'autoOverflow',
    'overflow', 'paginationPosition', 'hideFooter', 'hideCtrls', 'noHead', 'noFooter', 'centerContent', 'prefixed', 'suffixed'
  ],
  behavior: [
    'open', 'isOpen', 'startOpen', 'stayOpen', 'hoverMode', 'autoTrigger', 'autoTriggerTimeout', 'closeOnBodyClick',
    'closeOnOtherActive', 'trapFocus', 'showAboveAll', 'lazyload', 'lazyLoad', 'nativeLazyLoad', 'showControls',
    'enableNavBtn', 'enableBullets', 'loop', 'autoPlay', 'muted', 'required', 'disabled', 'readonly', 'checked', 'mode',
    'threshold', 'enterThreshold', 'exitThreshold', 'thresholdReference', 'thresholdAxis', 'thresholdDirection', 'repeat',
    'delay', 'wait', 'disableBelow', 'honorReducedMotion', 'openDuration', 'wrapperLink', 'contentType', 'offCanvasId',
    'modalId', 'startSelector', 'endSelector', 'endTriggerPosition', 'disableAfter', 'name', 'method', 'action',
    'sendMethod', 'novalidate', 'filterOptions', 'outputMode', 'limit', 'maxSize', 'accept', 'ratingScale', 'target',
    'microInteractions', 'type'
  ],
  advanced: [
    'responsive', 'tag', 'as', 'component', 'baseProps', 'placeHolder', 'customSliderParams', 'overrideDefaultParams',
    'transitions', 'contentTransition', 'transitionName', 'dropdownWrapper', 'customZIndex', 'extraLinkParams', 'id',
    'targetAttr', 'enableUIStates', 'state', 'value', 'validateAs', 'validationLabel', 'explicitValidState', 'actionBtn',
    'grouped', 'tabindex', 'acceptMessage', 'maxSizeMessage', 'btnProps', 'requestParams', 'responseCallBack',
    'formMessages', 'sendLimit', 'resetFormValues', 'formAttributes', 'inputAttributes', 'parallaxSettings',
    'mediaParallaxSettings', 'wrapper', 'rel', 'preContent', 'afterContent', 'beforeEyelet', 'beforeTitle',
    'beforeSubtitle', 'beforeCtas', 'attributes', 'contentSlots'
  ]
};
const groupByName = new Map(Object.entries(names).flatMap(([group, keys]) => keys.map(key => [key, group])));

// Component-specific placements that differ from the shared name lists.
const componentGroups = {
  Card: { type: 'layout' },
  Accordion: { type: 'appearance', content: 'content' },
  Media: { type: 'content', props: 'content' },
  MicroInteraction: { name: 'behavior', props: 'behavior' },
  ZButton: { type: 'advanced', title: 'advanced' },
  Zlink: { title: 'advanced' },
  InputText: { type: 'behavior' },
  ResponsiveProps: { componentName: 'content', baseProps: 'content', responsive: 'layout' },
  HtmlRenderer: { tag: 'content', wrapper: 'advanced' },
  ZRevealOnScroll: { component: 'advanced' },
  // Declared but not read by the pinned templates: kept editable, never suggested.
  Dropdown: { label: 'advanced', icon: 'advanced', stayOpen: 'advanced', rounded: 'advanced' },
  Zsection: { bgColor: 'advanced' },
  IntroDesc: {
    headAlignment: 'layout', invert: 'layout', disableHead: 'layout',
    beforeExcerpt: 'advanced', afterExcerpt: 'advanced', afterCtas: 'advanced'
  },
  Usermeta: { qualification: 'content', circled: 'appearance', stacked: 'layout', stackMetaInfo: 'layout', layout: 'advanced', dotClasses: 'advanced' }
};

// Zaux plumbing never meant for authors: UI-state mocks, function defaults,
// generated placeholders and props owned by another editor.
const internal = new Set([
  'inheritedUIFlags', 'customSpacing', 'componentClass', 'componentClassName', 'placeHolder', 'passAttrs',
  'provideSlotContext', 'focused', 'passes', 'responseCallBack', 'cardSrc', 'parentLayout'
]);

// Props an editor reaches for first, in display order (suggested in "Add property").
const featured = {
  Card: ['eyelet', 'title', 'subTitle', 'excerpt', 'media', 'cta', 'btnList', 'url', 'theme', 'size', 'layout', 'type', 'rounded', 'aspectRatio', 'invert'],
  CardPic: ['eyelet', 'title', 'excerpt', 'media', 'mediaRatio', 'cta', 'url', 'theme', 'size', 'rounded', 'contentJustify', 'enableOverlay', 'enableScale', 'enableGradientHover'],
  Snippetlabel: ['title', 'excerpt', 'icon', 'href', 'theme', 'size', 'layout', 'align', 'verticalAlign', 'suffixIcon'],
  Usermeta: ['title', 'qualification', 'media', 'href', 'theme', 'size', 'circled', 'stacked', 'stackMetaInfo', 'cta'],
  ButtonBlock: ['content', 'button', 'link', 'theme', 'size', 'align', 'rounded'],
  Accordion: ['title', 'content', 'titleIcon', 'open', 'theme', 'size', 'type', 'boxed', 'noBorder', 'rounded', 'openIcon', 'closeIcon'],
  Dropdown: ['items', 'theme', 'size', 'position', 'hoverMode', 'startOpen'],
  OffCanvas: ['title', 'theme', 'size', 'position', 'fullScreen', 'backdrop', 'backdropBlur', 'noHead', 'isOpen', 'closeOnBodyClick'],
  ZModal: ['title', 'theme', 'size', 'fullScreen', 'noHead', 'noFooter', 'footerContent', 'rounded', 'backdropBlur', 'contentPadding', 'autoTrigger'],
  Zsection: ['theme', 'size', 'contained', 'containerClass', 'paddingTop', 'paddingBottom', 'rounded', 'mediaBg', 'overlay'],
  IntroDesc: ['eyelet', 'title', 'subtitle', 'excerpt', 'ctas', 'theme', 'headAlignment', 'invert', 'disableHead', 'titleTag'],
  IntroText: ['eyelet', 'title', 'subtitle', 'excerpt', 'ctas', 'theme', 'size', 'align', 'maxWidth', 'titleTag', 'ctaSize'],
  ZButton: ['label', 'href', 'theme', 'size', 'hasIcon', 'iconName', 'iconOnly', 'actionIcon', 'actionIconName', 'rounded', 'pilled', 'upperCase', 'invert'],
  Zlink: ['label', 'href', 'title', 'theme', 'size'],
  Paragraph: ['title', 'contentHTML', 'titleTag', 'theme', 'size'],
  Zimg: ['src', 'alt', 'aspectRatio', 'lazyload', 'width', 'height'],
  Videoplayer: ['video', 'theme', 'size', 'rounded', 'showControls'],
  Media: ['type', 'props', 'fillSpace'],
  RichText: ['contentHTML', 'theme', 'size', 'contained', 'container'],
  Icon: ['iconName', 'size'],
  Separator: ['theme', 'size'],
  SliderSingle: ['eyelet', 'title', 'subtitle', 'excerpt', 'ctas', 'theme', 'size', 'align', 'slideRatio'],
  SliderMultiple: ['eyelet', 'title', 'subtitle', 'excerpt', 'ctas', 'cta', 'theme', 'size', 'align', 'contained'],
  ZFigure: ['media', 'caption', 'theme', 'size', 'rounded'],
  HtmlRenderer: ['tag', 'html'],
  ZForm: ['name', 'action', 'method', 'sendMethod', 'novalidate']
};
const inputFeatured = ['label', 'placeholder', 'helperText', 'options', 'required', 'disabled', 'theme', 'size', 'rounded', 'name'];

const CLASS_PROPERTY = /(?:^c|C)lass(?:es)?$/;
const TAG_PROPERTY = /.Tag$/;
const TEXT_PROPERTY = /(?:HTML|Html|Text|Title|Label)$/;

// Section of one prop: component placement, shared name lists, then naming patterns.
export function propertyGroup(name, key, descriptor = {}) {
  const placement = componentGroups[name]?.[key] ?? groupByName.get(key);
  if (placement) return placement;
  if (/^(?:aria|data)-/.test(key) || CLASS_PROPERTY.test(key) || TAG_PROPERTY.test(key)) return 'advanced';
  if (TEXT_PROPERTY.test(key)) return 'content';
  if (descriptor.media || descriptor.image) return 'content';
  if (descriptor.type === Boolean || typeof descriptor.default === 'boolean') return 'behavior';
  return 'other';
}

// Not offered in "Add property"; an authored value stays visible and editable.
export function isInternalProperty(key) {
  return internal.has(key);
}

export function featuredProperties(name) {
  return featured[name] ?? (name?.startsWith('Input') ? inputFeatured : []);
}
