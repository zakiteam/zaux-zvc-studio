import { reactive } from 'vue';

// Open/closed state of Inspector sections by id, shared by every node for this
// session: a section the author collapsed stays collapsed while selecting other
// elements. Editor state only; never persisted in workspace JSON.
const openSections = reactive({});

export function useInspectorSections() {
  function isSectionOpen(id, fallback = true) {
    return openSections[id] ?? fallback;
  }
  function setSectionOpen(id, value) {
    openSections[id] = !!value;
  }
  return { isSectionOpen, setSectionOpen };
}
