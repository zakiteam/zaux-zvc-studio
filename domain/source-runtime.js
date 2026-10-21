// Trusted bundled modules only; this registry never enters persisted JSON.
let sources = {};
export function registerSourceModules(modules) { sources = modules; }
export function sourceModule(key) { return sources[key]; }
// Runs `run` synchronously with extra modules (e.g. a components/virtual folder
// the user uploaded for the PHP conversion), then restores the registry.
export function withSourceModules(modules, run) {
  const previous = sources;
  sources = { ...previous, ...modules };
  try { return run(); } finally { sources = previous; }
}
