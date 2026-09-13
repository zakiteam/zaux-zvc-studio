// UI policy only: filtering never removes authored classes.
// Add an exact scope (e.g. 'md:') to override the default viewport policy.
// sections: null shows everything; a map allows whole sections (true)
// or individual control IDs (arrays). Omitted sections are hidden.
export const styleViewportVisibility = {
  '*': { sections: null, image: true, advanced: true, hint: 'zx_builder_style_hint' },
  /* This enables only these features for "base viewport" if uncommented
  '': {
    sections: { layout: ['overflow'], text: true, fill: true, border: true, rounding: true },
    image: false,
    advanced: false,
    hint: 'zx_builder_style_base_hint'
  }
    */
};

export function styleVisibility(scope) {
  return { ...styleViewportVisibility['*'], ...styleViewportVisibility[scope] };
}

export function visibleStyleSections(sections, policy) {
  if (policy.sections === null) return sections;
  return sections.flatMap(section => {
    const allowed = policy.sections[section.id];
    if (allowed === true) return [section];
    if (!Array.isArray(allowed)) return [];
    const controls = section.controls.filter(control => allowed.includes(control.id));
    if (!controls.length) return [];
    const globalControls = section.globalControls?.filter(control =>
      allowed.includes(control.id) && control.globalSides?.every(side => allowed.includes(side.id))
    );
    return [{ ...section, controls, globalControls: globalControls?.length ? globalControls : undefined }];
  });
}
