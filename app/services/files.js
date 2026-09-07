import JSZip from 'jszip';
export function downloadText(name, text, type = 'application/json') {
  downloadBlob(name, new Blob([text], { type }));
}
export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadZip(name, files) {
  const zip = new JSZip();
  Object.entries(files).forEach(([path, content]) => zip.file(path, content));
  downloadBlob(name, await zip.generateAsync({ type: 'blob' }));
}
