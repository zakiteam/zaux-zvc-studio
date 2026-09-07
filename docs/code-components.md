# Code-backed ZVCs

## Adding a base definition

Create a folder under `app/zvc/`. The complete example included in the project is:

```text
app/zvc/starterhero/
  StarterHero.zvc.js
  StarterHero.meta.js
  data/
    StarterHero.defaults.js
```

Loading is automatic: Vite imports every `**/*.zvc.js` file. No manual index is required. Reload the page after changing source files; rebuild the application for production. Base definitions are also added to projects already present in localStorage.

Use the same Zaux syntax:

```js
import ZVCHelper from '@zx_core/common/helpers/zvc.helper';
import meta from './MySection.meta';
import defaults from './data/MySection.defaults';

export default {
  ...meta,
  buildNode(data = {}, params = {}) {
    data = { ...defaults, ...data };
    const gv = path => ZVCHelper.getValue(data, path);
    const nodeObject = {
      meta: { ZVCName: meta.ZVCName },
      node: {
        name: 'Zsection',
        props: {
          size: 'm',
          contained: true,
          content: {
            type: 'component',
            name: 'IntroText',
            props: {
              title: gv('title'),
              ctas: gv('showButton')
                ? [{ label: gv('buttonLabel'), href: '#' }]
                : []
            }
          }
        }
      }
    };
    return ZVCHelper.renderNode(nodeObject, data, params, meta);
  }
};
```

The module must export `ZVCName` and `buildNode`. `label` is the displayed name; `fields` describes the controls. `builder: false` excludes a base definition from the library. The loader recognizes defaults at `data/Name.defaults.js`; for custom paths, expose values through `fields[].default`.

The imported module function is executed as-is, including conditions, composition, and helper calls. Its source is never interpreted or reconstructed. To nest local modules, import them and call their `buildNode`; the original Zaux registry still contains components from the submodule.

## Fields and values

The available Zaux types are `text`, `textarea`, `number`, `switch`, `select`, `json`, `html`, `css-editor`, `button`, `buttongroup`, and `component`. The last three use a small JSON editor; HTML and CSS use a text area. Select option objects preserve the value type.

`showIf` accepts one condition or an array of conditions; all conditions must match. Supported operators are `eq`, `neq`, `gt`, `lt`, `in`, `contains`, and `notEmpty`, matching the Zaux builder. Hiding a control preserves its value, so enabling it again does not discard work.

A file-backed base displays defaults as read-only. You can:

- insert a copy into a template and edit its content;
- create a configurable copy in the library;
- edit the base files directly in the project.

Copies keep independent data, defaults, and metadata. The JavaScript function remains shared through `sourceKey`: changing module code changes the behavior of copies that use it. Changing one copy's content does not change the others.

## Converting to visual editing

`Convert to visual` keeps the rendered structure with its current values. It removes the module link and dynamic fields; conditions and inactive code branches are not included in the result. From then on, you can drag, duplicate, delete, and configure individual nodes.

When starting from a file-backed base, the operation creates a new library entry. When starting from a copy, it converts that copy. The operation is undoable.

The result must be JSON-compatible: component names, properties, and children. Callbacks, Vue objects, and DOM nodes do not belong to the persisted format. `Zsection` with `content.type: 'component'` is represented with a child in the default slot, preserving the same rendering order. Other components' specialized content properties remain configurable as JSON.

## Exporting and moving between machines

For a code-backed ZVC, the JavaScript package contains the original files in its source folder. Conditions remain in the source. The conventional defaults file is updated with the exported configuration; `instance-data.json` contains all values, including values from custom paths. CSS authored in the editor is added to `style/Studio.css`.

Keep required local dependencies in the component folder; imports outside that folder remain dependencies of the destination project. The `@zx_core` and `@zx_project` aliases retain their original Zaux meaning.

Studio JSON stores the relative `sourceKey`, data, and the last rendered tree, without executable code. To continue editing a native component on another installation, also bring its files to `app/zvc/`. If they are missing, the app displays the last result and lets you convert it to a visual definition.

`Zaux JSON` export produces render-ready nodes with resolved values. `Editable JSON` instead preserves the document for reimporting into Studio.

## Drag-and-drop whitelist

Edit `app/data/catalog/palette.js`. Array order is the palette order.

Each entry contains:

- `name`: registered component name;
- `props`: initial configuration for each insertion;
- `container: true`: allows visual insertion into the default slot;
- `html: true`: identifies an HTML element.

The whitelist limits creation from the palette. A component not listed can still be used by a ZVC module or be present in a saved document. Do not add `container: true` to a component that does not expose a default slot.

The catalog registers common and shared core Zaux components. To extend it with project-specific Vue components, import their registry in `app/services/catalog.js` and register them in the Zaux plugin as well.

## References

Syntax was checked against `vendor/zaux/project/components/virtual/fancysection/FancySection.zvc.js`, `core/common/helpers/zvc.helper.js`, and the original builder fields. Automatic loading uses [Vite glob imports](https://vite.dev/guide/features.html#glob-import).