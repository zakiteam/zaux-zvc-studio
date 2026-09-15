import { nextTick } from 'vue';
import ToastHelper from '@zx_core/common/helpers/toast.helper';

// Toast visibility belongs to its native store. Keep the sample visible while editing.
export function createThemePreviewLifecycle() {
  let shownSignature = null;
  let ownsToast = false;
  function hide() {
    if (!ownsToast) return;
    clearTimeout(ToastHelper.store.timeOutID);
    ToastHelper.store.showLock = false;
    ToastHelper.store.hideToast();
    shownSignature = null;
  }
  return {
    async prepare(message) {
      const node = message.themePreview ? message.instances?.[0]?.definition.tree?.[0] : null;
      if (node?.name !== 'Toast') { hide(); ownsToast = false; return null; }
      const signature = JSON.stringify([node, message.styles?.uiSettings]);
      if (signature === shownSignature) return null;
      ownsToast = true;
      hide();
      // Let the previous component observe dismissal before the new sample mounts.
      await nextTick();
      return () => {
        ToastHelper.notify(node.props, 'permanent');
        shownSignature = signature;
      };
    },
    dispose() { hide(); ownsToast = false; }
  };
}
