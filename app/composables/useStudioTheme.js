import { useState } from '#imports';
import { readStudioTheme, saveStudioTheme } from '../services/studio-theme.js';

export function useStudioTheme() {
  const theme = useState('studio-theme', () => import.meta.client ? readStudioTheme() : 'dark');
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    saveStudioTheme(theme.value);
  }
  return { theme, toggleTheme };
}
