// Load only the parser needed by the editor when formatting is requested.
export async function formatCode(source, language, cursorOffset = 0) {
  const prettier = await import('prettier/standalone');
  let parser = language;
  let plugins;
  if (language === 'css') {
    plugins = [await import('prettier/plugins/postcss')];
  } else if (language === 'html') {
    plugins = [await import('prettier/plugins/html')];
  } else if (language === 'vue') {
    parser = 'vue';
    // The Vue printer embeds <script>/<style> and delegates to the JS and CSS
    // parsers, so all four plugins must be registered.
    plugins = await Promise.all([
      import('prettier/plugins/html'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/postcss'),
    ]);
  } else if (language === 'json' || language === 'javascript') {
    parser = language === 'json' ? 'json' : 'babel';
    plugins = await Promise.all([
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
    ]);
  } else {
    throw new Error('Unsupported editor language');
  }
  const options = {
    parser, plugins, cursorOffset,
    tabWidth: 2,
    printWidth: 80,
    htmlWhitespaceSensitivity: 'strict',
    embeddedLanguageFormatting: 'off',
  };
  if (language === 'vue') {
    // Format the embedded <script>/<style> blocks and normalize template
    // whitespace like Prettier does by default for single-file components.
    options.htmlWhitespaceSensitivity = 'css';
    options.embeddedLanguageFormatting = 'auto';
  }
  return prettier.formatWithCursor(source, options);
}
