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
  ]),
  {
    rules: {
      // Product art is generated locally as SVG, so the Next image optimizer adds
      // no value and would need SVG-specific remote configuration.
      "@next/next/no-img-element": "off",
      // This client app uses effects to synchronise URL/localStorage data and to
      // run cancellable API fetches, which is exactly what these effects are for.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
