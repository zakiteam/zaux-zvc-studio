export default {
  ZVPName: 'ZVPProjectCard',
  label: 'Project Card',
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'excerpt', label: 'Description', type: 'html' },
    { key: 'size', label: 'Text size', type: 'select', options: ['s', 'm', 'l'] },
    { key: 'showImage', label: 'Show image', type: 'switch' },
    { key: 'image', label: 'Image', type: 'text', showIf: { field: 'showImage', value: true } },
    { key: 'showButton', label: 'Show button', type: 'switch' },
    { key: 'button', label: 'Button', type: 'button', showIf: { field: 'showButton', value: true } },
    { key: 'class', label: 'Classes', type: 'text' }
  ]
};
