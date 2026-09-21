// ZLightbox integration for the builder palette and Inspector.
//
// ZLightbox (vendor/zaux/core/components/shared/lightbox/ZLightbox.vue) renders a
// hidden gallery of images and, on mount, wires every element carrying
// `data-zlightbox-trigger` whose `data-zlightbox-id` matches its own `id` prop.
// Those triggers open the gallery, optionally at a specific image index through
// `data-index`.
//
// This module only describes the builder data model; it never changes vendor code.

export const TRIGGER_ATTR = 'data-zlightbox-trigger';
export const LIGHTBOX_ID_ATTR = 'data-zlightbox-id';
export const LIGHTBOX_INDEX_ATTR = 'data-index';

// Descriptors injected into every component's "Add properties" list so a trigger
// can be authored on any element (button, a, div, ZButton, Zimg, …) instead of
// being baked into a single palette preset. Adding the marker activates the
// dedicated trigger editor, which manages data-zlightbox-id and data-index.
export const lightboxTriggerDescriptors = {
  [TRIGGER_ATTR]: { type: String, default: '' }
};

// Each lightbox item is a plain object spread onto the gallery <a> via v-bind.
// data-img feeds the visible thumbnail; href is the enlarged image used by
// bigger-picture. data-caption and data-alt are optional metadata.
export function defaultLightboxItem() {
  return {
    'data-img': '/assets/builder/placeholder.svg',
    href: '/assets/builder/placeholder.svg',
    'data-caption': '',
    'data-alt': ''
  };
}

export const lightboxControls = {
  ZLightbox: {
    props: {
      id: 'lightboxGallery',
      options: {},
      items: [defaultLightboxItem(), defaultLightboxItem()]
    }
  }
};

// A trigger is any node whose authored props carry the marker attribute. The
// trigger is opt-in: any element can be marked, and the dedicated Inspector
// editor then manages the target gallery id and optional index.
export function isLightboxTrigger(node) {
  return !!(node && node.props && Object.hasOwn(node.props, TRIGGER_ATTR));
}

export function lightboxIndex(node) {
  const value = node?.props?.[LIGHTBOX_INDEX_ATTR];
  return typeof value === 'string' && value !== '' ? value : null;
}
