import { defineComponent, h, resolveDynamicComponent } from 'vue';
import { useTranslation } from '../../../app/composables/useTranslation.js';

const EMPTY_REPEATER_STYLE = 'display: flex; align-items: center; justify-content: center; min-height: 56px; padding: 8px;'
  + ' border: 1px dashed currentColor; border-radius: 4px; opacity: .55; font: 12px/1.4 sans-serif;';

// Adapt the Studio JSON tree to the actual slots of registered Zaux components.
// Direct slot VNodes let native triggers attach their click handler to the child.
export default defineComponent({
  name: 'ComponentsRenderer',
  props: { components: { default: () => [] } },
  setup(props) {
    function render(node, index) {
      if (!node) return null;
      const component = resolveDynamicComponent(node.name);
      const attributes = { ...node.props, key: index };
      const children = () => (node.children ?? []).map(render);
      // textContent and innerHTML are DOM properties: assigning them removes every
      // child element, and Vue never re-creates the already mounted children.
      // Elements that accept dropped nodes render authored text/markup as children.
      function elementChildren() {
        const list = children();
        if (!list.length) return list;
        const text = attributes.textContent;
        if (text != null && typeof text !== 'object') {
          delete attributes.textContent;
          const value = String(text);
          return value ? [value, ...list] : list;
        }
        const html = attributes.innerHTML;
        if (typeof html === 'string') {
          delete attributes.innerHTML;
          return html ? [h('span', { innerHTML: html }), ...list] : list;
        }
        return list;
      }
      const trigger = ['OffCanvasTrigger', 'ZModalTrigger'].includes(node.name);
      if (trigger && !node.children?.length) {
        return h('span', { 'data-zb-node': attributes['data-zb-node'], draggable: attributes.draggable, class: 'inline-block min-h-[24px] min-w-[48px]' });
      }
      // Editor canvas only: a Repeater (ComponentsRenderer node) renders no element of its own, so a
      // layout-neutral wrapper carries its node id; when empty it is a visible drop area.
      if (node.name === 'ComponentsRenderer' && attributes['data-zb-node']) {
        const items = Array.isArray(node.props?.components) ? node.props.components : [];
        const wrapper = { key: index, 'data-zb-node': attributes['data-zb-node'], 'data-zb-repeater': '', draggable: attributes.draggable };
        if (!items.length) return h('div', { ...wrapper, style: EMPTY_REPEATER_STYLE }, useTranslation().translate('zx_builder_repeater_empty'));
        return h('div', { ...wrapper, style: 'display: contents' }, [h(component, { components: items })]);
      }
      const slot = ['Accordion', 'OffCanvas', 'ZModal'].includes(node.name) ? 'content' : 'default';
      const slots = node.children?.length ? { [slot]: children } : undefined;
      if (trigger) {
        // One trigger can contain a button or a group; the native trigger expects one VNode.
        slots.default = () => node.children.length === 1 ? children() : [h('span', { class: 'inline-flex' }, children())];
        const editorId = attributes['data-zb-node'];
        delete attributes['data-zb-node'];
        delete attributes.draggable;
        const result = h(component, attributes, slots);
        return editorId ? h('span', { 'data-zb-node': editorId, draggable: true, class: 'inline-block' }, [result]) : result;
      }
      return h(component, attributes, typeof component === 'string' ? elementChildren() : slots);
    }
    return () => (props.components ?? []).map(render);
  }
});
