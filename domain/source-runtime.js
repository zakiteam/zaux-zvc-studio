// Trusted bundled modules only; this registry never enters persisted JSON.
let sources = {};
export function registerSourceModules(modules) { sources = modules; }
export function sourceModule(key) { return sources[key]; }
