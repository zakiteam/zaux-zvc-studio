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

Loading is automatic: Vite imports every `**/*.zvc.js` and `**/*.zvp.js` file from `app/zvc` and from `vendor/zaux/{core,project}/components/virtual`. No manual index is required. Reload the page after changing source files; rebuild the application for production. Base definitions are also added to projects already present in localStorage.

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

A ZVC module must export `ZVCName` and `buildNode`. ZVP modules only require `buildNode`; optional metadata supplies `ZVPName`, `label` and `fields`. See [virtual partials](virtual-partials.md). The Zaux adapter also accepts upstream `meta.ZVCName`, falling back to the conventional `ZVC` + filename registration name. `label` is the displayed name; `fields` describes the controls. `builder: false` excludes a base definition from the library. The loader recognizes defaults at `data/Name.defaults.js`; for custom paths, expose values through `fields[].default`.

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

Relative JavaScript/JSON imports within `app/zvc` are bundled automatically, including imports from `_partials`. Package imports, aliases, computed import paths and dependencies outside the available source catalog remain destination-project dependencies. The `@zx_core` and `@zx_project` aliases retain their original Zaux meaning.

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
## Content, form and overlay palette presets

The palette includes the registered `Snippetlabel` (SnippetLabel), ButtonBlock, Accordion, all eleven public Input components, ZForm, OffCanvasTrigger, OffCanvas, ZModal (Modal) and ZModalTrigger. Content presets live in `app/data/catalog/content-components.js`; form presets live in `form-components.js`. Preset factories materialize localized strings and plain JSON only when inserting a node. New input names and panel IDs are unique; panel IDs remain editable. Copying existing nodes retains their authored properties, so duplicated panels may need distinct IDs and corresponding trigger references.

The shared property adapter exposes the actual size/theme sets from Vue templates, SCSS and metadata through `integrations/zaux/component-options.js`. Custom values remain editable. InputText also exposes native HTML input types. ZForm has method, sendMethod and spinnerTheme selects; ZForm and the trigger components have no theme/size props of their own. ButtonBlock's size control reads and updates `content.size`, which drives its layout in this Zaux version, while also updating its declared size prop.

ZForm accepts children in its default slot. Accordion, OffCanvas and ZModal accept children in the content slot. OffCanvas must use `contentType: default` to display those children; other content modes remain available. Both triggers accept dropped children and start with a real ZButton. Select a trigger's offCanvasId/modalId from the panels present in the template (or enter a custom ID), then use Preview for interaction. Editing mode captures clicks for selection. Closed and teleported panel content can be selected and edited from Structure.

`integrations/zaux/slot-renderer.js` adapts the saved JSON tree to those slots and passes direct child VNodes to native trigger components. Multiple trigger children are grouped under one inline wrapper, and an empty trigger remains a drop target in editing mode. The bridge uses registered Zaux components and does not alter vendor code. The preview imports it locally; ordinary Zaux registrations are unchanged.

Visual JavaScript ZIP exports that use these components include StudioComponentsRenderer.js and registration instructions. Register that adapter after Zaux setup in the destination app, including when rendering their runtime JSON exports. It depends only on Vue and registered Zaux components, not Studio services. The persisted workspace schema remains unchanged.

Source and diffs were reviewed only. No automated tests, browser checks, validators or production builds were run; runtime verification remains with the user.

## Imported and project library categories

The library selector separates **Imported** source bases (`app/zvc`, Zaux core and Zaux project) from **Project** definitions created, copied, converted or added as editable JSON in Studio. Search filters the selected category by display name, export name and source path, ignoring case. Selecting a newly created definition switches to its category automatically.

`integrations/zaux/source-library.js` discovers upstream sources read-only; `app/services/source-zvc.js` merges them into existing workspaces using stable `zaux/core/...` and `zaux/project/...` source keys. Existing `app/zvc` keys stay unchanged. Source bases retain their defaults and metadata, and insertion keeps independent instance configuration. JavaScript exports and source previews also support upstream folders; dependencies outside an exported folder still require the destination Zaux project.

ZVP files are separate imported library definitions. Local partials live under `app/zvc/_partials`. Project partials can also be authored visually with **New ZVP**. They can be inserted as atomic nodes and selected in slider content; the owner captures independent dependencies and resolves `{ name, props }` descriptors before rendering. Direct source imports with `buildNode(data, params)` remain supported. See [virtual partials](virtual-partials.md) for fields, examples and export details. No vendor file or revision is changed.

Source review only. Tests, builds and browser verification were not run; runtime verification remains with the user.

### Duplicate native field metadata

Some upstream modules (including `IntroTextSect`) declare the same field key twice. Native metadata is normalized to one control per key, with later properties taking precedence and existing defaults retained when not overridden. The same normalization repairs native definitions already saved in local or remote documents at validation time. It preserves instance values and independent configuration; visual definitions still reject duplicate keys.

Remote loading prepares and validates the complete source-enriched workspace before replacing the active document. Builder format errors retain their translated message instead of being reported as access failures. This correction was reviewed in source only; runtime verification remains manual.
