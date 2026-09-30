/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" bij de build voor GitHub Pages: data komt uit dashboard.json i.p.v. de server. */
  readonly VITE_STATIC?: string;
}
