let catalogRequest;
const previews = new Map();

export function loadTailwindCatalog() {
  if (!catalogRequest) {
    catalogRequest = $fetch('/api/tailwind-assistance', { method: 'POST', body: { catalog: true } })
      .catch(error => { catalogRequest = null; throw error; });
  }
  return catalogRequest;
}

export async function loadTailwindCss(className, signal) {
  if (previews.has(className)) return previews.get(className);
  const { css } = await $fetch('/api/tailwind-assistance', { method: 'POST', body: { className }, signal });
  if (previews.size >= 100) previews.delete(previews.keys().next().value);
  previews.set(className, css);
  return css;
}
