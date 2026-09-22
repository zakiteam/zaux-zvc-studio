import packageJson from '../../vendor/zaux/package.json';

// The Zaux core version the builder pins. The project bridge compares this
// against a destination project's package.json#coreVersion before writing.
export const zauxCoreVersion = packageJson.coreVersion ?? packageJson.version;
export const zauxProjectVersion = packageJson.version;
