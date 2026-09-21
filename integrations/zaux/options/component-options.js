import card from '../../../vendor/zaux/core/components/shared/card/Card.meta.js';
import input from '../../../vendor/zaux/core/components/shared/input/Input.meta.js';

// Source: each component's Vue template, theme SCSS and input stories.
// The pinned multiselect metadata lists outlined-light2, but its SCSS implements outlined-dark1 instead.
const textThemes = ['light1', 'light2', 'dark1', 'underline1', 'underline1-dark', 'outlined-light1', 'outlined-dark1', 'outlined-dark2'];
const choiceThemes = ['light1', 'light2', 'dark1', 'outline1', 'outline2'];
export const componentVariants = {
  Card: { sizes: ['m', 'l'], themes: card.default.themes },
  // CardPic implements only light1; its content uses the fixed CardBaseDefault light2 theme.
  CardPic: { sizes: ['m', 'l'], themes: ['light1'] },
  Snippetlabel: { sizes: ['s', 'm', 'l'], themes: ['light1', 'light2', 'dark1', 'dark2'] },
  ButtonBlock: { sizes: ['s', 'm', 'l'], themes: ['light1', 'dark1', 'transparent1', 'transparent2'] },
  Accordion: { sizes: ['s', 'm', 'l'], themes: ['light1', 'dark1'] },
  OffCanvas: { sizes: ['s', 'm'], themes: ['light1', 'lightblur1', 'darkblur1', 'transparent'] },
  ZModal: { sizes: ['s', 'm'], themes: ['light1', 'dark1', 'lightblur1', 'darkblur1'] },
  InputText: { sizes: ['m', 'l'], themes: textThemes },
  InputTextarea: { sizes: ['m', 'l'], themes: textThemes },
  InputSelect: { sizes: ['m', 'l'], themes: textThemes },
  InputMultiSelect: { sizes: ['m', 'l'], themes: [...input.multiselect.themes.filter(theme => theme !== 'outlined-light2'), 'outlined-dark1'] },
  InputRadioSelect: { sizes: ['s', 'm'], themes: [...choiceThemes, 'outline-dark1'] },
  InputRadio: { sizes: ['s', 'm', 'l'], themes: choiceThemes },
  InputCheckbox: { sizes: ['s', 'm'], themes: choiceThemes },
  InputSwitch: { sizes: ['s', 'm'], themes: [...choiceThemes, 'outlined-dark1'] },
  InputCheckboxCard: { sizes: ['s', 'm'], themes: ['light1', 'light2', 'dark1', 'outline1'] },
  InputFile: { sizes: ['m', 'l'], themes: ['light1', 'light2', 'dark1'] },
  InputRating: { sizes: ['s', 'm', 'l'], themes: ['light1', 'light2', 'dark1', 'outline1'] }
};
export const componentSelects = {
  Card: { layout: ['stacked', 'horizontal'], type: ['default', 'alt', 'wrapped'] },
  CardPic: { contentJustify: ['justify-start', 'justify-center', 'justify-end'] },
  Snippetlabel: { layout: ['horizontal', 'stacked'], align: ['left', 'center', 'right'], verticalAlign: ['top', 'center', 'bottom'] },
  ButtonBlock: { align: ['left', 'center', 'right'] },
  Accordion: { type: ['naked', 'wrapped'] },
  OffCanvas: { position: ['left', 'right', 'top', 'bottom'], contentType: ['default', 'html', 'component', 'teleport-html'] },
  InputText: { type: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'datetime-local', 'time', 'month', 'week', 'color', 'range', 'hidden'] },
  InputMultiSelect: { outputMode: ['json', 'classic'] },
  ZForm: { method: ['GET', 'POST'], sendMethod: ['sync', 'async'], spinnerTheme: ['light1', 'light2', 'light3', 'light4'] }
};
