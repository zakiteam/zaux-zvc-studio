# Slider editor

The Elements palette includes SliderSingle and SliderMultiple. Select a slider to edit its slides, responsive layout and navigation in Properties. Slide count comes from the list; slides per view is a separate layout setting. Reordering uses explicit up/down buttons.

## File map

- `app/data/catalog/slide-components.js`: allowed slide content, initial props, translated labels, field paths. Includes Zimg, Card and CardPic. Card themes come from the upstream component metadata.
- `integrations/zaux/controls/slider-controls.js`: slider presets, supported controls and Zaux breakpoints.
- `app/components/builder/BuilderSlider.vue`: connects controls to the selected node and existing builder mutations.
- `BuilderSliderSlides.vue`: list, add, duplicate, remove, reorder and selected slide form.
- `BuilderSliderFields.vue`: shared rendering of configured fields.
- `domain/slider.js`: pure JSON path updates, binding checks.
- `app/data/catalog/palette.js`: exposes the two sliders as elements.
- `inspector/BuilderInspectorPropertiesTab.vue`: mounts the panel for supported sliders.

All components above live under `app/components/builder/` unless an absolute project-relative path is given.

## Add a slide content type

Add an entry to slide-components.js with:
- `name`: an already registered Zaux component.
- `label`: a key in both locale dictionaries.
- `props`: JSON defaults cloned for every new slide.
- `fields`: objects with `path`, translated `label`, optional `type` and `options`.
The slide list displays the component name and action controls, without thumbnails.

Paths can be nested, such as `media.props.src`. Field types reuse BuilderValue; numeric fields also support minimum and integer constraints. Adding a new content type does not require branches in the editor. Register unavailable Vue components through the existing project integration first. The catalog is independent of the top-level drag palette.

An existing slide keeps its component type; add the new type and remove the old slide to replace it. Imported types outside the catalog remain available through the slide JSON editor. Unknown properties are preserved.

## Data and persistence

The editor writes native `props.slides` entries:
`{ type: 'component', name, props }`.
Slider behavior stays in `customSliderParams`. No parallel document schema, functions or Vue objects are persisted. Changes use `useBuilder.updateNode`, retaining undo, project permissions, persistence and exports. Instances remain independent.

Guided breakpoint fields edit one numeric, minimum-width breakpoint at a time. Empty numeric fields remove the override; the placeholder displays the Base value when present. The current viewport supplies the initial scope and updates it when the viewport changes. Imported numeric breakpoint entries are also listed.

New Multiple sliders use `overrideDefaultParams: true` to avoid hidden upstream layout defaults. Existing sliders using native default merging, bound settings or container-based or ratio breakpoints keep advanced property editing instead of being silently rewritten. Bound field values are not overwritten by guided controls.

The advanced params editor retains unsupported settings. Only controls supported by the local slider modules are offered; autoplay is not exposed.

## Preview and verification

The existing preview boundary is keyed by instance data, so edits already recreate the slider and its setup-time parameters. No additional remount mechanism or vendor change is needed. Slide forms select content in the inspector; they do not navigate the preview to a particular slide.

Source review only. No automated tests, browser checks, validators or production builds were run, following project instructions. Manual checks should cover image/card rendering, slide operations and undo, responsive settings, navigation, and export/reimport.
