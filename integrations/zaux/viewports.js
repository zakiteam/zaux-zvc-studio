import breakpoints from '../../vendor/zaux/style/tokens/breakpoints.json';

const screens = Object.entries(breakpoints)
  .map(([name, value]) => ({ name, width: Number.parseFloat(value) }))
  .sort((a, b) => a.width - b.width);

export const simpleViewports = [
  { value: 'auto', label: 'zx_builder_viewport_auto', width: null },
  ...[
    ['desktop_l', 'xxl'],
    ['desktop_s', 'xl'],
    ['tablet_l', 'lg'],
    ['tablet_s', 'md'],
    ['mobile_l', 'sm'],
    ['mobile_s', 'xs']
  ].map(([value, breakpoint]) => ({
    value,
    label: 'zx_builder_' + value,
    minWidth: Number.parseFloat(breakpoints[breakpoint]),
    width: breakpoint === 'xs' ? 365 : Number.parseFloat(breakpoints[breakpoint])
  }))
];

export function styleScopeForWidth(width) {
  if (!Number.isFinite(width) || width <= 0) return '';
  const screen = screens.findLast(screen => screen.width <= width);
  return screen ? screen.name + ':' : '';
}

export const viewports = screens.map((screen, index) => ({
  name: screen.name,
  // A zero minimum is a range, not a usable iframe width.
  width: screen.width > 0 ? screen.width : Math.max(1, (screens[index + 1]?.width ?? 1) - 1)
}));
