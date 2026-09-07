import { ref } from 'vue';
import it from '../data/locale/it.json';
import en from '../data/locale/en.json';
const language = ref('it');
const dictionaries = { it, en };
export function useTranslation() {
  function translate(key, values = {}) {
    const text = dictionaries[language.value]?.[key] ?? it[key] ?? key;
    return Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), text);
  }
  function setLanguage(value) {
    language.value = value === 'en' ? 'en' : 'it';
    document.documentElement.lang = language.value;
    try { localStorage.setItem('zx_builder_language', language.value); } catch { /* Workspace save status handles unavailable storage. */ }
  }
  return { language, translate, setLanguage };
}
