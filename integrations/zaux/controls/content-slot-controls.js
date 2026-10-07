// Components whose `contentSlots` prop renders { name, props } descriptors.
// Each entry lists the slot keys the component reads for its current props;
// the Inspector edits them with catalog components and ZVP partials.
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
