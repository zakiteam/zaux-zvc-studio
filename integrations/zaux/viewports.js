import breakpoints from '../../vendor/zaux/style/tokens/breakpoints.json';

const screens = Object.entries(breakpoints)
  .map(([name, value]) => ({ name, width: Number.parseFloat(value) }))
  .sort((a, b) => a.width - b.width);

export const viewports = screens.map((screen, index) => ({
  name: screen.name,
  // A zero minimum is a range, not a usable iframe width.
  width: screen.width > 0 ? screen.width : Math.max(1, (screens[index + 1]?.width ?? 1) - 1)
}));
