// Load only the parser needed by the editor when formatting is requested.
export async function formatCode(source, language, cursorOffset = 0) {
  const prettier = await import('prettier/standalone');
  let parser = language;
  let plugins;
  if (language === 'css') {
    plugins = [await import('prettier/plugins/postcss')];
  } else if (language === 'html') {
    plugins = [await import('prettier/plugins/html')];
  } else if (language === 'json' || language === 'javascript') {
    parser = language === 'json' ? 'json' : 'babel';
    plugins = await Promise.all([
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
    ]);
  } else {
    throw new Error('Unsupported editor language');
  }
  return prettier.formatWithCursor(source, {
    parser, plugins, cursorOffset,
    tabWidth: 2,
    printWidth: 80,
    htmlWhitespaceSensitivity: 'strict',
    embeddedLanguageFormatting: 'off',
  });
}
