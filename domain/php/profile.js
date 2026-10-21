// PHP export profile: the one place to retouch how the PHP export is composed.
// The output follows the component structure of the zaux-wp-core parent theme
// (and its child themes, e.g. zaux-wp-project), so it relies on what that theme
// already provides instead of shipping its own helpers:
//   - components/base/{name}/{Name}.zvc.php defines ZVC{Name}($data = [], $params = []),
//     components/_partials/{name}/{Name}.zvp.php defines ZVP{Name}(...), both autoloaded
//     by ZauxComponentsHelper::autoLoadComponents() (no require);
//   - {Name}.meta.php and data/{Name}.defaults.php return arrays read with
//     ZauxComponentsHelper::getMeta() / getDefaults();
//   - $gv reads $data with ZauxComponentsHelper::getValue(), the node is returned by
//     ZauxComponentsHelper::renderNode() ({ ...meta, ...node }, as ZVCHelper.renderNode);
//   - pages print their nodes with ZauxComponentsHelper::printComponentsList().
// Naming, file layout and the text of each file live here; the model (model.js),
// the value printer (printer.js) and the assembly (index.js) do not need changes
// to reshape the output. A profile is code configuration (functions allowed),
// never persisted data.

// Template helpers receive `p` (pieces prepared by emit.js):
//   p.version, p.fn (ZVCHero), p.name (component and file name, Hero), p.exportName, p.label,
//   p.kind ('zvc'|'zvp'), p.native, p.snapshot, p.root (node with markers and partial calls),
//   p.php(value, depth) (JSON -> PHP literal, $bind/$spread -> $gv reads),
//   p.data(value, depth) (literal data, markers kept), p.string(value) (quoted PHP string),
//   p.comment(lines, levels) (docblock), p.indent(text, levels);
//   meta/defaults: p.value; page: p.label, p.entries ([{ code, label }]).
export const DEFAULT_PHP_PROFILE = {
  // Bump when the generated contract changes; printed in every file header.
  version: 2,
  // Literal used for empty JSON objects, so wp_json_encode() keeps `{}` instead of `[]`.
  emptyObject: '(object) []',
  indent: '    ',
  // Text domain of the theme for translatable labels (meta files); empty keeps plain strings.
  textDomain: 'zaux',

  naming: {
    // Component name: folder (lowercase), file base name and function suffix.
    // zaux-wp-core calls strtoupper(type) . Name, so it must be a plain identifier.
    component: model => {
      const name = String(model.exportName ?? '').replace(/^ZV[CP]/, '').replace(/[^A-Za-z0-9]+/g, '');
      return /^[A-Za-z]/.test(name) ? name : 'Component' + name;
    },
    // ZVC{Name} / ZVP{Name}, as ZauxComponentsHelper::loadComponent() expects.
    function: (model, name) => model.kind.toUpperCase() + name,
    // Template (page) name, from the template title.
    page: template => {
      const name = String(template.name ?? '').replace(/[^A-Za-z0-9]+/g, '');
      return /^[A-Za-z]/.test(name) ? name : 'Template' + name;
    }
  },

  // Export layout (user choice, 2026-10-21): one folder per ZVC at the root,
  // ready for the theme components/base/ folder; ZVPs in _partials/ (their
  // place is components/_partials/); page templates in page-templates/ (theme root).
  paths: {
    componentDir: (model, name) => `${model.kind === 'zvp' ? '_partials/' : ''}${name.toLowerCase()}/`,
    entry: (model, name) => `${name}.${model.kind}.php`,
    meta: (model, name) => `${name}.meta.php`,
    defaults: (model, name) => `data/${name}.defaults.php`,
    // Studio CSS of the component: the theme does not load it, move it into the Zaux bundle.
    css: (model, name) => `style/${name}.css`,
    // ACF Flexible Content bridge read by ZauxACFHelper (ZVC only).
    acf: (model, name) => `${name}.acf.php`,
    // Page templates selectable in WordPress (Template Name header, one level deep).
    page: name => `page-templates/${name.toLowerCase()}.php`,
    readme: () => 'README.md'
  },

  // Value reads inside the component function. `key` is a quoted PHP string,
  // `base` the printed fallback props or null.
  expressions: {
    bind: key => `$gv(${key})`,
    // Whole-props binding: the object field is merged over the fallback props.
    spread: (key, base) => base === null
      ? `(is_array($gv(${key})) ? $gv(${key}) : (object) [])`
      : `array_replace(${base}, is_array($gv(${key})) ? $gv(${key}) : [])`
  },

  // Metadata file content, as `<Name>.meta.js` in the JS export and the
  // zaux-wp-core meta files. `t(text)` wraps a label for translation.
  meta: (model, name, t) => ({
    label: t(model.label),
    [model.kind === 'zvp' ? 'ZVPName' : 'ZVCName']: model.kind.toUpperCase() + name,
    meta: { version: 1 },
    fields: model.fields.map(field => ({ ...field, label: t(field.label) }))
  }),

  // ACF bridge ({Name}.acf.php): one sub field per component field, named like
  // the $data key, so an ACF row becomes $data; `map` adapts the values ACF
  // returns. `fields[type](field, x)` returns { field, map?, uses? } or null
  // (field not editable in ACF: it keeps its default). `x`: x.k (quoted key),
  // x.t(label), x.code(php), x.default(fallback) ($defaults[key] ?? fallback),
  // x.choices(options), x.php(value, depth) (literal), x.themes (button themes available),
  // x.field(type) (another type mapping), x.ctaFields() (CTA sub fields).
  acf: {
    // ZButton themes for the CTA selects, provided by the app from the Zaux
    // release (app/services/php-export.js); empty keeps a text field.
    buttonThemes: [],
    fields: {
      text: (field, x) => ({ field: { type: 'text', default_value: x.default("''") } }),
      textarea: (field, x) => ({ field: { type: 'textarea', new_lines: '', default_value: x.default("''") } }),
      html: (field, x) => ({ field: { type: 'wysiwyg', default_value: x.default("''") } }),
      number: (field, x) => ({
        field: { type: 'number', default_value: x.default("''") },
        map: `//ACF returns numbers as strings, an empty value keeps the default
if ( isset( $data[${x.k}] ) && is_numeric( $data[${x.k}] ) ) {
    $data[${x.k}] = 0 + $data[${x.k}];
} else {
    unset( $data[${x.k}] );
}`
      }),
      switch: (field, x) => ({
        field: { type: 'true_false', ui: 1, default_value: x.code(`(int) ! empty( $defaults[${x.k}] )`) },
        map: `$data[${x.k}] = ! empty( $data[${x.k}] );`
      }),
      boolean: (field, x) => x.field('switch'),
      select: (field, x) => {
        const options = (field.options ?? []).map(option => option && typeof option === 'object' ? option : { value: option, label: option });
        const typed = options.filter(option => typeof option.value !== 'string');
        return {
          field: { type: 'select', choices: x.choices(options), allow_null: 1, default_value: x.default("''") },
          map: `//An empty choice keeps the default
if ( ( $data[${x.k}] ?? '' ) === '' ) {
    unset( $data[${x.k}] );
}${typed.length ? ` else {
    //Choices are strings in ACF: restore the typed values
    $data[${x.k}] = ${x.php(Object.fromEntries(typed.map(option => [String(option.value), option.value])), 1)}[ $data[${x.k}] ] ?? $data[${x.k}];
}` : ''}`
        };
      },
      image: (field, x) => ({
        field: { type: 'image', return_format: 'url' },
        map: `//An empty image would replace the default one, so drop it
if ( empty( $data[${x.k}] ) ) {
    unset( $data[${x.k}] );
}`
      }),
      // Media fields hold a Media.vue { type, props } object: the image URL replaces the default src.
      media: (field, x) => ({
        field: { type: 'image', return_format: 'url' },
        map: `//Image URL => media object over the default one, an empty image keeps the default
if ( empty( $data[${x.k}] ) ) {
    unset( $data[${x.k}] );
} else {
    $data[${x.k}] = array_replace_recursive( (array) ( $defaults[${x.k}] ?? [] ), [ "type" => "img", "props" => [ "src" => $data[${x.k}] ] ] );
}`
      }),
      button: (field, x) => ({
        field: { type: 'group', layout: 'block', sub_fields: x.ctaFields() },
        uses: ['cta'],
        map: `//Link, theme and icon => ZButton props over the default CTA, no link keeps the default
$data[${x.k}] = $cta( $data[${x.k}] ?? [], $defaults[${x.k}] ?? [] );
if ( $data[${x.k}] === null ) {
    unset( $data[${x.k}] );
}`
      }),
      buttongroup: (field, x) => ({
        field: { type: 'repeater', layout: 'block', button_label: x.t('Add CTA'), sub_fields: x.ctaFields() },
        uses: ['cta'],
        map: `//Repeater rows => ZButton props. Rows without a link are skipped, an empty repeater means no CTAs
$data[${x.k}] = array_values( array_filter( array_map( $cta, is_array( $data[${x.k}] ?? null ) ? $data[${x.k}] : [] ) ) );`
      })
    },
    // Sub fields of one CTA (button and buttongroup fields).
    ctaFields: x => [
      { name: 'link', label: x.t('Link'), type: 'link', return_format: 'array' },
      x.themes
        ? { name: 'theme', label: x.t('Theme'), type: 'select', choices: x.code('array_combine( $themes, $themes )'), allow_null: 1 }
        : { name: 'theme', label: x.t('Theme'), type: 'text' },
      { name: 'iconName', label: x.t('Icon'), type: 'select', choices: x.code('array_combine( $icons, $icons )'), allow_null: 1, ui: 1 }
    ],
    // Shared by the CTA maps: ACF link + theme + icon row => ZButton props.
    cta: `//ACF link, theme and icon => ZButton props over $base, null without a link
$cta = function( $row, $base = [] ){

    $link = is_array( $row["link"] ?? null ) ? $row["link"] : [];

    if ( empty( $link["url"] ) ) {
        return null;
    }

    $cta = array_replace( is_array( $base ) ? $base : [], [
        "label" => ! empty( $link["title"] ) ? $link["title"] : $link["url"],
        "href"  => $link["url"],
    ] );

    if ( ! empty( $row["theme"] ) ) {
        $cta["theme"] = $row["theme"];
    }

    if ( ! empty( $row["iconName"] ) ) {
        $cta["hasIcon"] = true;
        $cta["iconName"] = $row["iconName"];
    }

    if ( ( $link["target"] ?? "" ) === "_blank" ) {
        $cta["target"] = "_blank";
        $cta["rel"] = "noopener";
    }

    return $cta;

};`
  },

  // Node built by the function, before renderNode: the ZVC root mirrors
  // `componentFiles` (ComponentsRenderer over the tree), a ZVP returns its only
  // node or a ComponentsRenderer wrapper.
  shape: {
    zvc: (model, nodes) => ({ name: 'ComponentsRenderer', props: { components: nodes } }),
    zvp: (model, nodes) => nodes.length === 1 ? nodes[0] : { name: 'ComponentsRenderer', props: { components: nodes } },
    // A ZVP reference becomes the call of its function, wrapped like the JS
    // resolvePartials does (sliders keep the whole tree in props.components).
    partial: call => ({ type: 'component', name: 'ComponentsRenderer', props: { components: [call] } })
  },

  templates: {
    // Entry file: the PHP counterpart of `<Name>.zvc.js` / `<Name>.zvp.js`.
    component: p => `<?php

    defined("ABSPATH") || exit;

${p.comment([
  `${p.label} (${p.fn}): PHP counterpart of ${p.name}.${p.kind}.js for zaux-wp-core.`,
  ...(p.exportName !== p.fn ? [`Exported from ${p.exportName}.`] : []),
  ...(p.native ? [] : []),
  ...(p.snapshot ? ['Module unavailable: static snapshot with literal values.'] : []),
  '',
  `Generated by Zaux Studio — PHP export profile v${p.version}.`
], 1)}
    function ${p.fn}($data = [], $params = []){

${p.kind === 'zvc' ? `        $meta = ZauxComponentsHelper::getMeta(${p.string(p.name)});\n` : ''}        $data = array_merge(ZauxComponentsHelper::getDefaults(${p.string(p.name)}), $data);
        $gv = function ($path) use ($data) {
            return ZauxComponentsHelper::getValue($data, $path);
        };

        $nodeObject = [
${p.kind === 'zvc' ? `            "meta" => [
                "ZVCName" => $meta['ZVCName']
            ],
` : ''}            "node" => ${p.php(p.root, 3)}
        ];

        return ZauxComponentsHelper::renderNode($nodeObject, $data, $params);

    };
`,

    // Metadata and defaults files: plain `return` of a PHP array.
    meta: p => `<?php

    defined("ABSPATH") || exit;

    // ${p.label} (${p.fn}): metadata, read with ZauxComponentsHelper::getMeta(${p.string(p.name)}).
    return ${p.data(p.value, 1)};
`,
    defaults: p => `<?php

    defined("ABSPATH") || exit;

    // ${p.label} (${p.fn}): default field values, read with ZauxComponentsHelper::getDefaults(${p.string(p.name)}).
    return ${p.data(p.value, 1)};
`,

    // ACF bridge, as zaux-wp-project SplitSection.acf.php: layout sub fields and
    // the map applied to each flexible content row before ZVC{Name}().
    acf: p => `<?php

    defined("ABSPATH") || exit;

${p.comment([
  `${p.label} (${p.fn}): ACF Flexible Content bridge, read by ZauxACFHelper (layout "${p.name.toLowerCase()}").`,
  'Sub fields are named like the component $data keys; "map" adapts the values ACF returns.',
  ...(p.skipped.length ? [`Fields kept from the defaults (no ACF field): ${p.skipped.join(', ')}.`] : []),
  'Field conditions (showIf) are not converted.',
  '',
  `Generated by Zaux Studio — PHP export profile v${p.version}.`
], 1)}
    $defaults = ZauxComponentsHelper::getDefaults(${p.string(p.name)});
${p.prelude.length ? '\n' + p.indent(p.prelude.join('\n'), 1) + '\n' : ''}
    return [
        "layout" => [
            "sub_fields" => ${p.data(p.subFields, 3)},
        ],
        "map" => function( $data, $context ) use ( $defaults ){

${p.maps.length ? p.indent(p.maps.join('\n\n'), 3) + '\n\n' : ''}            return $data;

        },
    ];
`,

    // Page template: every component of the template with the data configured
    // in the Studio, printed like the zaux-wp-project index.php.
    page: p => `<?php
/**
 * Template Name: ${p.label}
 *
 * Generated by Zaux Studio — PHP export profile v${p.version}: the components of the template, in order.
 */

    defined("ABSPATH") || exit;

    get_header();

    $components = [
${p.entries.map(entry => `        ${entry.code}, // ${entry.label}`).join('\n')}
    ];

    ZauxComponentsHelper::printComponentsList( $components );

    get_footer();
`
  }
};

export function phpProfile(overrides = {}) {
  const result = { ...DEFAULT_PHP_PROFILE };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    const base = DEFAULT_PHP_PROFILE[key];
    result[key] = base && typeof base === 'object' && !Array.isArray(base) && value && typeof value === 'object' && !Array.isArray(value)
      ? { ...base, ...value }
      : value;
  }
  return result;
}
