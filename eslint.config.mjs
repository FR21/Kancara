import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The service worker Serwist builds from app/sw.ts.
    "public/sw.js",
    "public/swe-worker-*.js",
    // Local AI tooling, kept out of git. Its scripts are not part of the app.
    ".claude/**",
    ".agents/**",
    ".impeccable/**",
  ]),
]);

export default eslintConfig;
