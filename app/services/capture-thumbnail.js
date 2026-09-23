import DOMPurify from 'dompurify';

// html-to-image treats xlink:href as a CSS selector. External Zaux sprites must
// become embedded symbols, with modern href references, before cloning the DOM.
async function embedSvgSymbols(stage) {
  const sprites = new Map();
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const xlinkNamespace = 'http://www.w3.org/1999/xlink';
  let index = 0;
  for (const use of stage.querySelectorAll('svg use')) {
    const href = use.getAttribute('href') || use.getAttributeNS(xlinkNamespace, 'href') || use.getAttribute('xlink:href');
    if (!href) continue;
    if (href.startsWith('#')) {
      use.setAttribute('href', href);
    } else {
      const url = new URL(href, document.baseURI);
      const symbolId = decodeURIComponent(url.hash.slice(1));
      url.hash = '';
      if (!symbolId) throw new Error('SVG symbol reference has no fragment');
      const source = url.href;
      if (!sprites.has(source)) {
        sprites.set(source, (async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          try {
            const response = await fetch(source, { signal: controller.signal });
            if (!response.ok) throw new Error(`SVG sprite: HTTP ${response.status}`);
            const markup = DOMPurify.sanitize(await response.text(), { USE_PROFILES: { svg: true, svgFilters: true } });
            return new DOMParser().parseFromString(markup, 'image/svg+xml');
          } finally { clearTimeout(timer); }
        })());
      }
      const sprite = await sprites.get(source);
      const symbol = sprite.getElementById(symbolId);
      if (!symbol) throw new Error(`SVG symbol missing: ${symbolId}`);
      const embedded = document.importNode(symbol, true);
      const id = `zb-thumbnail-symbol-${++index}`;
      embedded.setAttribute('id', id);
      const defs = document.createElementNS(svgNamespace, 'defs');
      defs.appendChild(embedded);
      use.ownerSVGElement.prepend(defs);
      use.setAttribute('href', `#${id}`);
    }
    use.removeAttributeNS(xlinkNamespace, 'href');
    use.removeAttribute('xlink:href');
  }
}

// Runs inside /preview so DOM constructors, styles and fonts share one document.
export async function captureThumbnail() {
  const stage = document.querySelector('.zb-stage');
  if (!stage) throw new Error('Missing thumbnail stage');
  const freeze = document.createElement('style');
  freeze.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
  document.head.appendChild(freeze);
  try {
    stage.style.minHeight = '0';
    const waitFor = (element, ready) => ready() ? Promise.resolve() : new Promise(resolve => {
      const done = () => { clearTimeout(timer); element.removeEventListener('load', done); element.removeEventListener('error', done); resolve(); };
      const timer = setTimeout(done, 4000);
      element.addEventListener('load', done, { once: true });
      element.addEventListener('error', done, { once: true });
    });
    await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(link => waitFor(link, () => !!link.sheet)));
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 4000))]);
    // The capture iframe is offscreen: explicitly reveal lazy images there only.
    for (const source of stage.querySelectorAll('source[data-srcset]')) source.srcset = source.dataset.srcset;
    const images = [...stage.querySelectorAll('img')];
    for (const img of images) {
      img.loading = 'eager';
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      if (img.dataset.src) img.src = img.dataset.src;
      img.classList.remove('lazyload', 'lazyloading');
      img.classList.add('lazyloaded');
    }
    // html-to-image draws active videos onto a canvas, which fails for unloaded
    // or cross-origin media. Capture their poster instead, keeping their geometry.
    for (const video of stage.querySelectorAll('video')) {
      video.pause();
      const poster = document.createElement('img');
      poster.src = video.poster || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
      poster.className = video.className;
      poster.style.cssText = video.style.cssText;
      const bounds = video.getBoundingClientRect();
      poster.style.width = `${bounds.width}px`;
      poster.style.height = `${bounds.height}px`;
      poster.style.objectFit = getComputedStyle(video).objectFit;
      video.replaceWith(poster);
      images.push(poster);
    }
    await Promise.all(images.map(img => waitFor(img, () => img.complete)));
    // Embed the desktop source selected by <picture>, then omit source elements
    // from the clone so their external URLs cannot override the embedded image.
    for (const img of images) if (img.currentSrc) img.src = img.currentSrc;
    // Allow layout-driven components to settle without requiring user interaction.
    await new Promise(resolve => setTimeout(resolve, 250));
    if (stage.querySelector('.zb-preview-failure')) throw new Error('Component render failed');
    await embedSvgSymbols(stage);
    const height = Math.max(160, Math.min(900, Math.ceil(stage.getBoundingClientRect().height)));
    const { toJpeg } = await import('html-to-image');
    const controller = new AbortController();
    const resourceTimer = setTimeout(() => controller.abort(), 15000);
    const options = {
      width: 1200, height, canvasWidth: 480, canvasHeight: Math.round(height * .4),
      pixelRatio: 1, quality: .82, preferredFontFormat: 'woff2',
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      style: { minHeight: '0', overflow: 'hidden' },
      // Each capture has a fresh iframe/cache. Do not alter signed asset URLs.
      includeQueryParams: true, cacheBust: false,
      fetchRequestInit: { signal: controller.signal },
      // Styles have already been copied as computed declarations. Cloning the
      // entire runtime stylesheet again can make the SVG unnecessarily large.
      filter: node => !['SOURCE', 'IFRAME', 'STYLE', 'LINK', 'SCRIPT'].includes(node.tagName),
      imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
    };
    try { return await toJpeg(stage, options); }
    finally { clearTimeout(resourceTimer); }
  } finally { freeze.remove(); }
}
