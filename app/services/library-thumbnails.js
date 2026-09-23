import { runtimeNodes } from '../../domain/nodes.js';


// Optional browser cache: failures must never prevent rendering or workspace saves.
async function cacheEntry(key, entry) {
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      let expired = false;
      const timeout = setTimeout(() => { expired = true; reject(new Error('Thumbnail cache timed out')); }, 2000);
      const request = indexedDB.open('zaux-studio-thumbnails', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'key' });
      request.onsuccess = () => { clearTimeout(timeout); if (expired) request.result.close(); else resolve(request.result); };
      request.onerror = () => { clearTimeout(timeout); reject(request.error); };
      request.onblocked = () => { expired = true; clearTimeout(timeout); reject(new Error('Thumbnail cache blocked')); };
    });
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('images', entry ? 'readwrite' : 'readonly');
      const timeout = setTimeout(() => transaction.abort(), 2000);
      const store = transaction.objectStore('images');
      let result;
      if (entry) {
        store.put({ key, ...entry, createdAt: Date.now() });

      } else {
        const request = store.get(key);
        request.onsuccess = () => { result = request.result; };
      }
      transaction.oncomplete = () => { clearTimeout(timeout); resolve(result); };
      transaction.onerror = () => { clearTimeout(timeout); reject(transaction.error); };
      transaction.onabort = () => { clearTimeout(timeout); reject(transaction.error); };
    });
  } catch { return null; }
  finally { db?.close(); }
}

export function createLibraryThumbnailRenderer() {
  let queue = Promise.resolve();
  let disposed = false;
  let cancelCapture;

  function capture(state, force) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      const requestId = crypto.randomUUID();
      frame.src = '/preview';
      frame.title = 'Thumbnail renderer';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      // Keep the frame inside the viewport so IntersectionObserver-driven content
      // can initialize. Opacity hides it without suppressing layout or intersections.
      frame.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:800px;border:0;pointer-events:none;opacity:0;z-index:-1;';
      let sent = false;
      const timer = setTimeout(() => finish(new Error('Thumbnail timed out')), 60000);
      const cancel = () => finish(new Error('Thumbnail cancelled'));
      cancelCapture = cancel;
      function finish(error, url) {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        frame.remove();
        if (cancelCapture === cancel) cancelCapture = null;
        if (error) reject(error); else resolve(url);
      }
      function receive(event) {
        if (event.origin !== window.location.origin || event.source !== frame.contentWindow || event.data?.channel !== 'zaux-studio') return;
        if (event.data.type === 'ready' && !sent) {
          sent = true;
          frame.contentWindow.postMessage({ ...state, channel: 'zaux-studio', type: 'state', thumbnailRequest: requestId, thumbnailRefresh: force }, window.location.origin);
        }
        if (event.data.type === 'thumbnail' && event.data.requestId === requestId) {
          const url = event.data.url;
          if (typeof url !== 'string' || !url.startsWith('data:image/jpeg;base64,') || url.length > 500000) finish(new Error(event.data.error || 'Thumbnail capture failed'));
          else finish(null, url);
        }
      }
      window.addEventListener('message', receive);
      document.body.appendChild(frame);
    });
  }

  return {
    async render(key, state, { force = false, isCurrent = () => true } = {}) {
      const checkCurrent = () => {
        if (disposed || !isCurrent()) throw new Error('Thumbnail request superseded');
      };
      // Cache reads bypass the rendering queue: existing images appear immediately.
      const cached = await cacheEntry(key);
      checkCurrent();
      if (!force && cached?.url) return cached.url;
      if (!force && cached?.error) throw new Error(cached.error);
      const task = queue.then(async () => {
        checkCurrent();
        try {
          const css = await $fetch('/api/preview-css', {
            method: 'POST', timeout: 20000,
            body: { content: JSON.stringify({ rendered: state.instances.map(item => runtimeNodes(item.definition, item.data)), instances: state.instances, uiSettings: state.styles?.uiSettings }) },
          });
          checkCurrent();
          const url = await capture({ ...state, css: css.css }, force);
          checkCurrent();
          await cacheEntry(key, { url });
          return url;
        } catch (error) {
          // Remember the first attempt, including failure; retry is always manual.
          if (!disposed && isCurrent() && !cached?.url) await cacheEntry(key, { error: error.message || 'Thumbnail capture failed' });
          if (cached?.url) error.thumbnailUrl = cached.url;
          throw error;
        }
      });
      queue = task.catch(() => {});
      return task;
    },
    dispose() { disposed = true; cancelCapture?.(); },
  };
}
