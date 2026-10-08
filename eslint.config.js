/**
 * ESLint (flat config) — Svelte + TypeScript for ALPIERCING.
 * Run: npm run lint  (targets .svelte files; extend to .ts/.astro as needed).
 */
import eslintPluginSvelte from "eslint-plugin-svelte";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "dist/**", ".astro/**", ".specify/**", "public/**"],
  },
  // Svelte recommended rules (includes the a11y checks that surfaced in AdminCalendar).
  ...eslintPluginSvelte.configs["flat/recommended"],
  {
    files: ["**/*.svelte"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.browser },
      parser: tsParser,
    },
  },
];