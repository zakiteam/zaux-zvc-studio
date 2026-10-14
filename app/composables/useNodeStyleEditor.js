import { computed, ref, watch } from 'vue';
import { useTranslation } from './useTranslation.js';
import { literalClasses, readStyleClass, positionValueClass, readPositionValue } from '../../domain/node-styles.js';
import { descendingStyles } from '../../integrations/zaux/responsive-styles.js';
import { readResponsiveStyle, readResponsiveImportant, replaceResponsiveStyle, setResponsiveImportant, needsResponsiveBase } from '../../domain/responsive-node-styles.js';
import { nodeStyleSections, styleBreakpoints } from '../../integrations/zaux/controls/node-style-controls.js';

// Headless editor for the control descriptors in node-style-controls.js: reads and writes one
// class list at one breakpoint scope and interaction state through the responsive domain functions. Any surface
// (Inspector Style tab, Quick style) renders descriptors with BuilderStyleControl and this API.
// classes(): class value; scope: ref of the edited scope; state: ref of the edited interaction
// state ('' or a styleStates value such as 'hover:'); disabled(): read-only;
// target(): identity of the styled node (resets the error); onChange(value): commit new classes.
export function useNodeStyleEditor({ classes, scope, state = ref(''), disabled = () => false, target = () => null, onChange }) {
  const { translate } = useTranslation();
  const editError = ref('');
  watch([scope, state, target], () => { editError.value = ''; });
  // Sections with global/side pairs show the global control unless switched to granular.
  const granular = ref({ border: false, rounding: false, padding: false, margin: false });
  const editable = computed(() => literalClasses(classes()) !== null);

  const current = control => readResponsiveStyle(classes(), control, scope.value, state.value).replace(/^!/, '');
  const important = control => readResponsiveImportant(classes(), control, scope.value, state.value);
  // Authored value that differs from the editor baseline (responsive layout defaults read as unset;
  // a state layer has no baseline).
  const isSet = control => { const value = current(control); return !!value && value !== (state.value ? '' : control.responsiveDefault ?? ''); };
  // A section (or Quick style group) holds an authored value: drives the category dots.
  const sectionSet = section => [...section.controls, ...(section.globalControls ?? [])].some(isSet);
  const controlDisabled = control => disabled() || !editable.value || needsResponsiveBase(classes(), control, scope.value, state.value);
  function applyEdit(result) {
    editError.value = result.error || '';
    if (!result.error && result.value !== classes()) onChange(result.value);
  }
  function changeImportant(control, enabled) {
    if (disabled() || !editable.value) return;
    applyEdit(setResponsiveImportant(classes(), control, enabled, scope.value, state.value));
  }
  function change(control, value) {
    if (!editable.value || disabled()) return;
    applyEdit(replaceResponsiveStyle(classes(), control, value, scope.value, state.value));
  }
  function changePositionValue(control, event) {
    const value = positionValueClass(control, event.target.value);
    event.target.setCustomValidity(value === null ? translate(control.invalid ?? (control.nonNegative ? 'zx_builder_style_dimension_invalid' : control.integer ? 'zx_builder_style_integer_invalid' : 'zx_builder_style_length_invalid')) : '');
    if (value === null) {
      event.target.reportValidity();
      return;
    }
    change(control, value);
  }
  // Layout-dependent UI follows the normal state: states rarely change display or direction.
  function inheritedLayoutClass(id) {
    const layout = nodeStyleSections.find(section => section.id === 'layout');
    const control = layout.controls.find(item => item.id === id);
    if (descendingStyles) return readResponsiveStyle(classes(), control, scope.value).replace(/^!/, '');
    const breakpointIndex = styleBreakpoints.findIndex(item => item.value === scope.value);
    const scopes = ['', ...styleBreakpoints.slice(0, breakpointIndex + 1).map(item => item.value)];
    let value = '';
    for (const prefix of scopes) {
      const candidate = readStyleClass(classes(), control, prefix);
      if (candidate && (!value.startsWith('!') || candidate.startsWith('!'))) value = candidate;
    }
    return value.replace(/^!/, '');
  }
  function visibleControls(section) {
    if (section.globalControls) return granular.value[section.id] ? section.controls : section.globalControls;
    if (section.id !== 'layout') return section.controls;
    // Seed flex/grid baselines even when only smaller viewports use that layout.
    if (descendingStyles && !scope.value) return section.controls;
    const display = inheritedLayoutClass('display');
    // Show layout-specific controls only for an authored flex/grid layout.

    const flex = ['flex', 'inline-flex'].includes(display);
    const grid = ['grid', 'inline-grid'].includes(display);
    return section.controls.filter(control => {
      if (['direction', 'wrap'].includes(control.id)) return flex;
      if (control.id === 'columns') return grid;
      if (['align', 'justify', 'gap_x', 'gap_y'].includes(control.id)) return flex || grid;
      return true;
    });
  }
  function alignmentAxis(id) {
    if (!['align', 'justify'].includes(id)) return '';
    const display = inheritedLayoutClass('display');
    const flex = !display || ['flex', 'inline-flex'].includes(display);
    const column = flex && inheritedLayoutClass('direction').startsWith('flex-col');
    return (id === 'align' ? !column : column) ? 'vertical' : 'horizontal';
  }
  function controlLabel(control) {
    if (control.sideLabel) return translate(control.label) + ' · ' + translate(control.sideLabel);
    const axis = alignmentAxis(control.id);
    return translate(axis ? `zx_builder_style_${control.id}_${axis}` : control.label);
  }
  function illustratedOptions(control) {
    const axis = alignmentAxis(control.id);
    const direction = inheritedLayoutClass('direction');
    const reversed = control.id === 'justify' && direction.endsWith('-reverse')
      && ['', 'flex', 'inline-flex'].includes(inheritedLayoutClass('display'));
    return control.options.map(option => {
      let label = translate(option.label);
      if (axis && /-(start|end)$/.test(option.value)) {
        const end = option.value.endsWith('-end') !== reversed;
        const side = axis === 'vertical' ? (end ? 'bottom' : 'top') : (end ? 'right' : 'left');
        label = translate(`zx_builder_style_alignment_${side}`);
      }
      return { ...option, label };
    });
  }
  function alignmentIconClass(id) {
    const display = inheritedLayoutClass('display');
    if (display && !['flex', 'inline-flex'].includes(display)) return '';
    const direction = inheritedLayoutClass('direction');
    if (id === 'align') return direction.startsWith('flex-col') ? '-rotate-90' : '';
    if (id !== 'justify') return '';
    return {
      'flex-row-reverse': '-scale-x-100',
      'flex-col': 'rotate-90',
      'flex-col-reverse': '-rotate-90'
    }[direction] ?? '';
  }
  function controlOptions(control) {
    const value = current(control);
    return [
      { value: '', label: translate(descendingStyles && scope.value ? 'zx_builder_style_responsive_reset' : 'zx_builder_style_unset') },
      ...(value && !control.options.some(option => option.value === value)
        ? [{ value, label: value === '__mixed__' ? translate('zx_builder_style_mixed') : `${translate('zx_builder_style_custom')}: ${value}` }] : []),
      ...control.options.map(option => ({
        ...option,
        label: translate(option.label) + (option.modeLabel ? ' · ' + translate(option.modeLabel) : '')
      }))
    ];
  }
  return {
    scope, state, editError, editable, granular,
    current, important, isSet, sectionSet, controlDisabled, applyEdit, change, changeImportant, changePositionValue, readPositionValue,
    visibleControls, controlLabel, illustratedOptions, alignmentIconClass, controlOptions
  };
}
