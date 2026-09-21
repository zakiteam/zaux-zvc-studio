import { defineComponent, h, resolveDynamicComponent } from 'vue';

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
