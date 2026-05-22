// Shim for @opentelemetry/api — Cenaiva does NOT use OpenTelemetry in the
// React Native bundle, but supabase-js (≥ 2.106) ships a dynamic
// `import('@opentelemetry/api')` for optional Node tracing. Hermes (RN's
// JS engine) can't compile the dynamic-import expression with bundler
// magic comments (webpackIgnore/turbopackIgnore/vite-ignore), and the
// EAS production build fails with:
//   error: Invalid expression encountered
//   import(/* webpackIgnore: true */ ... OTEL_PKG)
//
// Metro's resolver (metro.config.js) maps `@opentelemetry/api` to this
// file, so the dynamic import resolves to an empty default export and
// supabase-js's `.catch(() => null)` path is taken at runtime. Tracing
// is silently disabled — exactly what we want on mobile.
module.exports = {};
module.exports.default = {};
