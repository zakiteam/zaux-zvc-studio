// Native Zvideo / Zimg JSON contracts. No editor-only fields enter saved props.
const boolean = { default: false, type: Boolean };
const text = { default: '', type: String };
const image = { ...text, image: true };
const choices = values => ({ options: values.map(value => ({ value, label: String(value) })) });

export const videoProperties = {
  srcList: {
    default: [],
    items: {
      default: { url: '', type: 'video/mp4' },
      properties: {
        url: text,
        type: { ...text, ...choices(['video/mp4', 'video/webm', 'video/ogg']) }
      }
    }
  },
  poster: image,
  autoPlay: boolean,
  muted: { ...boolean, default: true },
  loop: boolean,
  activateControls: boolean,
  pauseOnClick: boolean,
  fillSpace: { ...boolean, default: true },
  captions: {
    default: [],
    items: {
      default: { src: '', kind: 'subtitles', srclang: '', label: '', default: false },
      properties: {
        src: text,
        kind: { ...text, ...choices(['subtitles', 'captions', 'descriptions', 'chapters', 'metadata']) },
        srclang: text,
        label: text,
        default: boolean
      }
    }
  }
};

export const imageProperties = {
  src: image,
  alt: text,
  fallbackSrc: image,
  lazyload: { ...boolean, default: true },
  nativeLazyLoad: { ...boolean, default: true },
  aspectRatio: text,
  width: { default: null },
  height: { default: null },
  srcList: { default: false },
  imgClasses: { default: null }
};
