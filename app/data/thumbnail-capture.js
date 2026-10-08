// Timing for Library/Elements thumbnail captures (milliseconds).
// Raise settleDelay when captures show unfinished layout (late CSS, fonts or JS-driven components).
// Bump cacheVersion to discard every capture already stored in the browser cache.
export const thumbnailCapture = {
  // Pause after stylesheets, fonts and images are ready, before the capture.
  settleDelay: 1500,
  // Upper bound for each stylesheet <link> to load.
  stylesheetTimeout: 6000,
  // Upper bound for document fonts to finish loading (checked before and after settleDelay).
  fontTimeout: 6000,
  // Upper bound for each image to load.
  imageTimeout: 6000,
  // Upper bound for html-to-image to fetch and embed external resources.
  resourceTimeout: 15000,
  // Whole capture, from iframe creation to the returned image.
  totalTimeout: 60000,
  cacheVersion: 2,
};
