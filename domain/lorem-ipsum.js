// Placeholder copy for the rich text editor. Plain strings only; the editor builds the nodes.
const opening = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const words = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua '
  + 'enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in '
  + 'reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa '
  + 'qui officia deserunt mollit anim id est laborum').split(' ');

// sentences: per paragraph; paragraphs: 0 returns a single inline sentence.
export const loremLengths = [
  { id: 'sentence', paragraphs: 0, sentences: 1 },
  { id: 'paragraph', paragraphs: 1, sentences: 4 },
  { id: 'paragraphs_3', paragraphs: 3, sentences: 4 },
  { id: 'paragraphs_5', paragraphs: 5, sentences: 5 }
];

function sentence(random) {
  const length = 8 + Math.floor(random() * 9);
  const picked = Array.from({ length }, () => words[Math.floor(random() * words.length)]);
  // An occasional comma keeps longer sentences readable.
  if (length > 11) picked[Math.floor(length / 2)] += ',';
  const text = picked.join(' ');
  return text[0].toUpperCase() + text.slice(1) + '.';
}

export function loremIpsum(lengthId, random = Math.random) {
  const length = loremLengths.find(item => item.id === lengthId) ?? loremLengths[0];
  const paragraph = first => Array.from({ length: length.sentences }, (_, index) =>
    first && index === 0 ? opening : sentence(random)).join(' ');
  if (!length.paragraphs) return [paragraph(true)];
  return Array.from({ length: length.paragraphs }, (_, index) => paragraph(index === 0));
}
