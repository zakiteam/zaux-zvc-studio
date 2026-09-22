# Inspector property decorators

## Entry point

Add property editor rules to [property-decorators.js](../integrations/zaux/descriptors/property-decorators.js),
in **propertyDecorators**. Keys are the registered component name and actual prop
name. **Icon** is the catalog/JSON name of Zaux's Icon.vue.

A rule is either a descriptor patch or a synchronous function returning a patch:

    Icon: {
      iconSet: selectOptions(Object.keys(iconSets)),
      iconName: ({ props }) => {
        const set = props.iconSet === undefined ? 'zaux' : props.iconSet;
        return selectOptions(typeof set === 'string' && Object.hasOwn(iconSets, set) ? iconSets[set] : []);
      },
      size: selectOptions(iconSizes)
    }

**selectOptions(values)** accepts primitive values or objects with value/label
and produces a select descriptor with typed options. Static rules can also use
image: true or an existing text control such as control: 'textarea'.
This registry configures existing editors; it does not register arbitrary Vue controls.

Functions receive an object containing:

- **props**: selected node's authored JSON props, without evaluated bindings or
  automatically executed component defaults.
- **trees**: arrays of root nodes from the active library definition or all
  instances of the active template.
- **descriptor**: metadata assembled for this property before decoration.
- **name**, **property**: the component and property being decorated.

Functions must be synchronous and read-only. Use explicit fallbacks for absent
props when the source default is relevant. Do not resolve bindings as literals,
fetch data, mutate nodes or store functions in workspace JSON.

## How it is connected

1. [palette.js](../app/data/catalog/palette.js) controls insertion and initial JSON props.
2. [catalog.js](../app/services/catalog.js), propertyInfo(name, context), looks up
   the Vue component and calls propertyDescriptors(name, component.props, context).
3. [property-descriptors.js](../integrations/zaux/descriptors/property-descriptors.js) copies
   Vue prop declarations and adds upstream builder metadata and size/theme variants.
4. decorateProperties() applies the registry last, merging patches over existing
   descriptors. Rules may also describe HTML attributes with no Vue declaration.
5. [BuilderInspectorPropertiesTab.vue](../app/components/builder/inspector/BuilderInspectorPropertiesTab.vue)
   supplies current props and trees inside a computed. Changing an icon set or a
   referenced panel ID recomputes the relevant options.
6. [BuilderProperty.vue](../app/components/builder/fields/BuilderProperty.vue)
   renders options through BuilderInput. Custom values use BuilderValue; fallback
   types come from domain/properties.js.
7. User edits follow setProperty -> useBuilder.updateNode for undo, persistence
   and preview updates.

A descriptor does not add a saved prop. Authored props appear in the main list;
other descriptor keys appear under **Add properties**. To show a prop immediately
on insertion, include it in the palette preset too.

## Control reference

This is the complete list of editors available for a prop in the Inspector's
**Properties** tab. The editor is chosen by
`propertyValueType(property, value, descriptor)` in
[domain/properties.js](../domain/properties.js) and rendered by
[BuilderProperty.vue](../app/components/builder/fields/BuilderProperty.vue) and
[BuilderValue.vue](../app/components/builder/fields/BuilderValue.vue). Descriptors
only configure these existing editors; they never register a new Vue control.
See [code-components.md](code-components.md) for the separate ZVC **field** types
used in the Fields/Data tab.

### Scalar editors

| Editor | Trigger |
| --- | --- |
| `text` | string value, or no rule (fallback) |
| `number` | numeric value, or `type: Number` / numeric `default` |
| `switch` | boolean value, or `type: Boolean` / boolean `default` |
| `textarea` | `control: 'textarea'`, or a long-text prop (`excerpt`, `contentHTML`, `innerHTML`, `paragraph`, `textContent`) |
| `html` | `control: 'html'` (source / rich text / HTML) |
| `css-editor` | `control: 'css-editor'` |
| `json` | `null`, object or array value, or `type: Object` / `type: Array` |
| `select` | `selectOptions([...])` → `control: 'select'` + `options` |
| `buttongroup` | `control: 'buttongroup'` |

### Pickers and structured editors

| Editor | Trigger |
| --- | --- |
| `image` | `image: true` (and value is `null` or a string) → [BuilderImageInput.vue](../app/components/builder/fields/BuilderImageInput.vue): URL + media library |
| `media` | `media: true` → [BuilderMediaInput.vue](../app/components/builder/fields/BuilderMediaInput.vue): compact `{ type, props }` editor |
| object | `properties: { key: descriptor }` → nested fields plus an advanced JSON view |
| array | `items: { default, properties }` → add / edit / remove rows |

### Decision order

`propertyValueType` resolves in this order:

1. `null` or object/array value → `json`
2. boolean value → `switch`
3. numeric value → `number`
4. `descriptor.control` in `text`, `textarea`, `html`, `css-editor` → that editor
5. string value: long-text prop name → `textarea`, otherwise `text`
6. `descriptor.type === Boolean` or boolean `default` → `switch`
7. `descriptor.type === Number` or numeric `default` → `number`
8. `descriptor.type === Object` or `Array` → `json`
9. fallback → `text`

`BuilderProperty` then intercepts, before the scalar fallback, in this order:
bindings, `media: true`, `properties` (object), `items` (array), `buttongroup`,
then a `select` when `options` is non-empty, and finally `BuilderValue`
(passing `image: true` through when set).

### How a select is built

`selectOptions(values)` accepts primitives or `{ value, label }` objects and
returns `{ control: 'select', options: [...] }`. A rule may also return the
options dynamically, for example `iconName: ({ props }) => selectOptions(...)`.
Out-of-list values keep a "custom value" entry and remain editable.

## Existing examples

- Icon.iconName: actual bundled SVG symbol IDs.
- Icon.iconSet: bundled asset folders; unknown sets retain custom editing. Since Zaux 2.4.0 the global `uiSettings.global.iconSet` setting wins over this per-instance prop when they differ; the Studio UI settings panel exposes that global value.
- Icon.size: fontSize token keys from vendor/zaux/style/tokens/icons.json, prefixed with text- (for example text-icon-m). Icon.vue applies size directly as a CSS class; raw icon-m is not a utility.
- Zimg.src, Zimg.fallbackSrc, img.src, video.poster: image picker metadata.
- OffCanvasTrigger.offCanvasId, ZModalTrigger.modalId: options from the current
  trees, deduplicated by ID.
- a.target: static select; a.href, a.id, a.rel: HTML attribute descriptors.

[icon-options.js](../integrations/zaux/options/icon-options.js) reads symbol-defs.svg
files through a Vite raw glob. These assets remain read-only. Added source asset
sets are picked up when Vite reloads/rebuilds, not through runtime uploads.

Static component choices stay source-backed in options/component-options.js and enter
the registry through selectOptions. Size/theme metadata stays in the descriptor
adapter. Prefer upstream metadata where available; put explicit project overrides
in the decorator registry.

## Add another decoration

Inspect the component's Vue declaration and metadata first. Then add a rule:

    SomeComponent: {
      alignment: selectOptions(['start', 'center', 'end']),
      imageUrl: { image: true },
      variant: ({ props }) => selectOptions(
        props.compact === true ? ['small'] : ['small', 'large']
      )
    }

This is illustrative: use only values supported by the real component. Merge
rules under an existing component key rather than declaring it twice. Explicit
prop rules override componentSelects for that prop; other props keep their
existing choices.

No component-name branch belongs in the Inspector for descriptor enrichment.
Specialized editors coordinating several fields, such as slide CRUD, stay separate.

## Preserved behavior

Decorators change editor metadata only. They do not change component defaults,
rewrite instances, or restrict runtime/exported values. Selects retain bindings
and offer a custom editor for out-of-list values. Switching an icon set does not
silently replace iconName: an incompatible name stays custom until changed.

The HTML a preset includes translated link text, href '#' and an empty id.
Use href '#section-id' for a fragment link and id on its destination.
target and rel are available under Add properties.

## Verification

Source reviewed only. Per project instructions, no tests, browser automation,
validators or production builds were run. Manual checks should cover insertion
of a and Icon, icon/size selection, unknown sets/names, bindings, undo and existing
overlay trigger selects.
## Nested media controls

The Zaux palette includes `Videoplayer` (the exact upstream registered name) and
`Media`. The player preset uses the bundled `/assets/media/samplevid1.mp4` and a
local poster; Media starts as an image. No dependency files are changed.

`descriptors/media-properties.js` describes the native nested contracts:

- `Videoplayer.video`: source URL/MIME rows, poster picker, autoplay, mute, loop,
  native controls, fill-space, and caption track rows. Outer properties expose
  size, theme, inherited/explicit roundness and the player's custom controls.
  `pauseOnClick` is not suggested because Videoplayer forces it on its child.
- `Media.type`: `img` or `video`; `Media.props` receives the matching image/video
  descriptors. Image controls include source/fallback pickers, alt text and lazy
  loading. Changing type updates the editors without rewriting existing props.
- Video sources are URLs; the existing image library is used for images/posters.

The generic `BuilderProperty` supports descriptor `properties` for object fields
and `items` for arrays. An item descriptor includes `default` for its Add action.
Nested fields reuse the usual typed values, selects, image picker and bindings.
Missing fields display descriptor defaults without persisting them until edited.
Each change emits the complete owning JSON property through the existing Inspector
mutation, preserving sibling keys. Unsupported values keep their ordinary editor;
object editors retain an advanced JSON view. Labels reuse existing translations.

Only source review was performed; insertion, playback, type switching, nested
editing and undo remain for manual browser verification.

## Compact media editor

`BuilderMediaInput.vue` is the reusable, descriptor-driven control for a media
field. A descriptor marked `media: true` makes `BuilderProperty` render it
instead of the generic object editor; the value is a Media.vue-style object
`{ type: 'img'|'video', props: { ... } }` with optional root props (`fillSpace`,
`containerClasses`, `elementClasses`) preserved. It offers a type toggle, image
selection from the media library, alt, aspect ratio, lazy loading, behavior
toggles (full width, full height, object fit, and fill-space when the object
carries it), video URL/format/poster and playback flags, plus a JSON fallback.

The opt-in list lives in `propertyDecorators` (`media: { media: true }`):
Card, CardMediaBox, CardPic, ZFigure, Usermeta, DisplayBox, FeatBannerSection,
SectionSplit, SectionSplitIntro and SectionSplitWide. The `Media` component
itself keeps its flat `type` + `props` + behavior props, so it uses the thin
`BuilderMedia.vue` Inspector panel instead; that panel reuses `BuilderMediaInput`
bound to the whole node props and commits through `useBuilder.updateNode`.

## Initially visible palette properties

Add a key to the owning palette preset to expose it immediately on new nodes.
For IntroText, `app/data/catalog/palette.js` includes `theme: 'light1'` and
`subtitle: ''`. Theme options already come from upstream metadata; the subtitle
textarea is defined in `propertyDecorators.IntroText`.

Presets are copied by `catalogNode()`, so saved nodes are not migrated. Existing
IntroText nodes can add these fields through Add properties. Preserve authored
values and bindings; a request to expose fields on existing nodes requires a
separate visibility change, not a silent rewrite of their props.

The repository skill [`zaux-palette-props`](../.agents/skills/zaux-palette-props/SKILL.md) documents this workflow and its distinction
from property decoration. These project instructions remain the portable reference
for other agents.
