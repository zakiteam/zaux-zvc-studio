// Read the iframe cascade at its actual responsive width.
export function createOutlineVisibility(publish) {
  let frame = null;
  let observer;
  let request = null;
  let previous = '';
  function measure() {
    frame = null;
    if (request === null) return;
    const hidden = [];
    const cache = new Map();
    function isHidden(element) {
      if (!element) return false;
      if (!cache.has(element)) cache.set(element, getComputedStyle(element).display === 'none' || isHidden(element.parentElement));
      return cache.get(element);
    }
    const nodes = new Map();
    for (const element of document.querySelectorAll('[data-zb-instance] [data-zb-node]')) {
      const key = JSON.stringify([element.closest('[data-zb-instance]').dataset.zbInstance, element.dataset.zbNode]);
      // Components can forward the same marker to multiple roots.
      nodes.set(key, (nodes.get(key) ?? true) && isHidden(element));
    }
    for (const [key, value] of nodes) if (value) hidden.push(key);
    hidden.sort();
    const signature = JSON.stringify([request, hidden]);
    if (signature === previous) return;
    previous = signature;
    publish({ type: 'outline-visibility', request, hidden });
  }
  function schedule() {
    if (request !== null && frame === null) frame = requestAnimationFrame(measure);
  }
  return {
    update(id) { request = id ?? null; schedule(); },
    mount() {
      observer = new MutationObserver(records => {
        if (records.some(record => {
          const element = record.target instanceof Element ? record.target : record.target.parentElement;
          return element && (element.closest('[data-zb-instance]') || element.matches('.zb-stage, style, link, body, html'));
        })) schedule();
      });
      observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
      window.addEventListener('resize', schedule);
      document.addEventListener('load', schedule, true);
    },
    dispose() {
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      document.removeEventListener('load', schedule, true);
      if (frame !== null) cancelAnimationFrame(frame);
    }
  };
}
