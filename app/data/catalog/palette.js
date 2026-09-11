// Order and membership of the drag-and-drop palette.
// This does not limit components rendered by hand-written ZVCs or saved JSON.
export default [
  { name: 'Zsection', container: true, props: { size: 'm', contained: true } },
  { name: 'IntroText', props: { title: 'Titolo della sezione', excerpt: 'Un nuovo spazio per i tuoi contenuti.', size: 'm' } },
  { name: 'ZButton', props: { label: 'Scopri di più', theme: 'primary', tag: 'a', href: '#', size: 's' } },
  { name: 'Paragraph', props: { contentHTML: '<p>Scrivi qui il tuo testo.</p>', size: 'm' } },
  { name: 'Zimg', props: { src: '/assets/builder/placeholder.svg', alt: '', lazyload: false, imgClasses: ['w-full'] } },
  { name: 'Separator', props: {} },
  { name: 'div', container: true, html: true, props: {} },
  { name: 'section', container: true, html: true, props: {} },
  { name: 'h2', html: true, props: { textContent: 'Un nuovo titolo' } },
  { name: 'p', html: true, props: { textContent: 'Un nuovo paragrafo.' } },
  { name: 'span', html: true, props: { textContent: 'Testo' } }
];
