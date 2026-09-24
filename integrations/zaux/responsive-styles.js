import breakpoints from '../../vendor/zaux/style/tokens/breakpoints.json';

// Authoring policy only. Stored classes and Zaux keep their native min-width model.
// Set to 'min-width' to restore the original editor behavior, without migrating data.
export const responsiveStylePolicy = 'max-width';
export const descendingStyles = responsiveStylePolicy === 'max-width';

export const styleScreens = Object.entries(breakpoints)
  .map(([name, width]) => ({ value: `${name}:`, name, width: Number.parseFloat(width) }))
  .sort((a, b) => a.width - b.width);

export const styleBreakpoints = styleScreens.map((screen, index) => ({
  value: screen.value,
  label: descendingStyles
    ? `${screen.name} ${styleScreens[index + 1] ? '≤ ' + styleScreens[index + 1].width + ' px' : '≥ ' + screen.width + ' px'} ↓`
    : `${screen.name} ≥ ${screen.width}px`
}));
