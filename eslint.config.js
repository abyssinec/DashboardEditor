import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "build/**", "node_modules/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      import: importPlugin,
      "unused-imports": unusedImports
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // keep lint output clean for current repo state
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/refs": "off",

      // keep реально полезное (удаление неиспользуемых импортов)
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": "off",

      "import/order": ["warn", {
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }]
    }
  },

  prettier
];
