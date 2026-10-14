import contentHooks from '../generated/content-hooks.json';
import { registryEntry } from './hook-registry.js';

// Components whose `contentSlots` prop renders { name, props } descriptors.
// The generated registry (scripts/zaux/prepare.mjs, same scan as upstream
// `gen:content-hooks`) lists the slot keys each Zaux template reads; entries
// below refine it when the keys depend on the current props.
//
// ScrollTopSentinel (vendor/zaux/core/components/utils/scrolltopsentinel) reads
// `content` in default mode and `scrolledContent`/`notScrolledContent` in switch
// mode. In the pinned release the switch branch renders notScrolledContent
// after scrolling and scrolledContent before it; slots keep their Zaux keys.
export const contentSlotControls = {
  ScrollTopSentinel: {
    slots: ({ mode }) => mode === 'switch'
      ? [
          { key: 'scrolledContent', hintKey: 'zx_builder_content_slot_scrolled_hint' },
          { key: 'notScrolledContent', hintKey: 'zx_builder_content_slot_not_scrolled_hint' }
        ]
      : [{ key: 'content' }]
  }
};

// Upstream templates that read a slot but do not render its descriptor correctly:
// Abstract binds an undeclared `beforeIcon` and passes the name as props to beforeCtaList.
const slotWarnings = {
  Abstract: { beforeIcon: 'zx_builder_content_slot_broken_hint', beforeCtaList: 'zx_builder_content_slot_broken_hint' }
};

// Template order of the generated keys is alphabetical; this reading order follows
// the components' markup so the Inspector lists slots top to bottom.
const slotOrder = {
  IntroText: ['beforeEyelet', 'beforeTitle', 'beforeSubtitle', 'beforeExcerpt', 'beforeCtas', 'afterCtas'],
  CardPic: ['beforeMedia', 'mediaContent', 'afterMedia', 'beforeBase', 'afterBase'],
  Card: ['preCardBase', 'afterCardBase'],
  ZButton: ['preLabel', 'afterLabel'],
  Accordion: ['title', 'content'],
  Abstract: ['beforeIcon', 'mainContent', 'beforeCtaList', 'afterCtaList']
};

// Slots of a component for its current props, or null when it has none.
export function contentSlotConfig(name, props = {}) {
  if (!name) return null;
  if (contentSlotControls[name]) return contentSlotControls[name].slots(props);
  const entry = registryEntry(contentHooks, name);
  if (!entry) return null;
  const order = slotOrder[entry.key] ?? [];
  const keys = [...entry.value].sort((a, b) => (order.indexOf(a) + 1 || order.length + 1) - (order.indexOf(b) + 1 || order.length + 1));
  return keys.map(key => ({ key, hintKey: slotWarnings[entry.key]?.[key] }));
}
