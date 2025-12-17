/**
 * PostCSS plugin to add !important to all declarations
 * This ensures child app styles override parent app styles in microfrontend
 */
export default function postcssForceImportant(opts = {}) {
  const exclude = opts.exclude || [];

  return {
    postcssPlugin: 'postcss-force-important',
    Declaration(decl) {
      // Skip if already has !important
      if (decl.important) return;

      // Skip CSS variables (custom properties)
      if (decl.prop.startsWith('--')) return;

      // Skip excluded properties
      if (exclude.includes(decl.prop)) return;

      // Skip @keyframes animations
      if (decl.parent?.type === 'atrule' && decl.parent?.name === 'keyframes') return;

      // Skip @font-face
      if (decl.parent?.type === 'atrule' && decl.parent?.name === 'font-face') return;

      // Add !important
      decl.important = true;
    }
  };
}

postcssForceImportant.postcss = true;
