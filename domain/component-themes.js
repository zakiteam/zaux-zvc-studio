import postcss from 'postcss';

export function parseThemeCss(css) {
  if (typeof css !== 'string' || css.length > 500000) throw new Error('zx_builder_theme_invalid_css');
  try { return postcss.parse(css, { from: undefined }); }
  catch { throw new Error('zx_builder_theme_invalid_css'); }
}

export function validateComponentThemes(entries) {
  if (!Array.isArray(entries) || entries.length > 200) throw new Error('zx_builder_theme_invalid_css');
  const names = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.component !== 'string' || !/^[\w-]+$/.test(entry.component) || names.has(entry.component)) throw new Error('zx_builder_theme_invalid_css');
    names.add(entry.component);
    parseThemeCss(entry.css);
  }
}

export function componentThemesCss(entries = [], component) {
  return entries.filter(entry => (!component || entry.component === component) && entry.css.trim())
    .map(entry => `/* ${entry.component} */\n${entry.css}`).join('\n\n');
}

export function ruleConditions(rule) {
  const conditions = [];
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type !== 'atrule') return null;
    conditions.unshift({ name: parent.name, params: parent.params });
  }
  return conditions;
}

function matchingRules(root, target) {
  const rules = [];
  root.walkRules(rule => {
    if (rule.selector === target.selector && JSON.stringify(ruleConditions(rule)) === JSON.stringify(target.conditions ?? [])) rules.push(rule);
  });
  return rules;
}

export function themeVariableOverrides(css, target) {
  const values = {};
  for (const rule of matchingRules(parseThemeCss(css), target)) {
    for (const decl of rule.nodes ?? []) {
      if (decl.type !== 'decl' || !decl.prop.startsWith('--')) continue;
      if (values[decl.prop]?.important && !decl.important) continue;
      values[decl.prop] = { value: decl.value + (decl.important ? ' !important' : ''), important: decl.important };
    }
  }
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value.value]));
}

// Keep comments, unrelated declarations and custom at-rules from the CSS editor.
export function setThemeVariable(css, target, name, value) {
  if (!/^--[\w-]+$/.test(name)) throw new Error('zx_builder_theme_invalid_css');
  const root = parseThemeCss(css);
  const rules = matchingRules(root, target);
  let declaration;
  if (value !== undefined) {
    const parsed = parseThemeCss(`a { ${name}: ${value}; }`);
    declaration = parsed.first?.nodes?.[0];
    if (parsed.nodes.length !== 1 || parsed.first.nodes.length !== 1 || declaration?.type !== 'decl' || declaration.prop !== name) throw new Error('zx_builder_theme_invalid_css');
  }
  for (const rule of rules) {
    for (const decl of [...rule.nodes]) if (decl.type === 'decl' && decl.prop === name) decl.remove();
  }
  if (declaration) {
    let rule = rules.at(-1);
    if (!rule) {
      let parent = root;
      for (const condition of target.conditions ?? []) {
        const atRule = postcss.atRule(condition);
        parent.append(atRule);
        parent = atRule;
      }
      rule = postcss.rule({ selector: target.selector });
      parent.append(rule);
    }
    rule.append(declaration.clone());
  }
  for (const rule of rules) {
    let empty = rule;
    while (empty?.type !== 'root' && empty?.nodes?.length === 0) {
      const parent = empty.parent;
      empty.remove();
      empty = parent;
    }
  }
  return root.toString();
}
