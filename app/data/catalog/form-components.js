const inputProps = (translate, name) => ({
  name, label: translate('zx_builder_preset_field'), theme: 'light1', size: 'm',
  required: false, disabled: false
});
const choices = translate => [
  { value: 'option-1', label: translate('zx_builder_preset_option', { number: 1 }) },
  { value: 'option-2', label: translate('zx_builder_preset_option', { number: 2 }) }
];

export default [
  { name: 'InputText', createProps: t => ({ ...inputProps(t, 'text'), type: 'text', modelValue: '', placeholder: t('zx_builder_preset_placeholder') }) },
  { name: 'InputTextarea', createProps: t => ({ ...inputProps(t, 'message'), modelValue: '', placeholder: t('zx_builder_preset_placeholder'), attributes: { rows: 4 } }) },
  { name: 'InputSelect', createProps: t => ({ ...inputProps(t, 'select'), modelValue: '', placeholder: t('zx_builder_preset_select'), options: choices(t) }) },
  { name: 'InputMultiSelect', createProps: t => ({ ...inputProps(t, 'multiselect'), modelValue: [], placeholder: t('zx_builder_preset_select'), options: choices(t), filterOptions: false }) },
  { name: 'InputRadioSelect', createProps: t => ({ ...inputProps(t, 'radio-select'), modelValue: '', options: choices(t) }) },
  { name: 'InputRadio', createProps: t => ({ ...inputProps(t, 'radio'), modelValue: '', checkedValue: 'option-1' }) },
  ...['InputCheckbox', 'InputSwitch', 'InputCheckboxCard'].map(name => ({ name,
    createProps: t => ({ ...inputProps(t, name.toLowerCase()), modelValue: false, checked: false, checkedValue: 'yes', ...(name === 'InputCheckboxCard' ? { icon: 'media', helperText: t('zx_builder_preset_excerpt') } : {}) })
  })),
  { name: 'InputFile', createProps: t => ({ ...inputProps(t, 'file'), accept: '', maxSize: null, btnLabel: t('zx_builder_preset_file') }) },
  { name: 'InputRating', createProps: t => ({ ...inputProps(t, 'rating'), initialValue: 0, ratingScale: 5 }) },
  { name: 'ZForm', container: true, props: { name: 'form', action: '', method: 'POST', sendMethod: 'sync', novalidate: false, spinnerTheme: 'light1' } }
];
