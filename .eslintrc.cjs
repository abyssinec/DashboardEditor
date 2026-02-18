module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks", "import", "unused-imports"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    // главное: убрать мусор
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],

    // чтобы не плодить "any" без нужды
    "@typescript-eslint/no-explicit-any": "off",

    // импорт порядок (чтобы инспекторы не превращались в бардак)
    "import/order": [
      "warn",
      {
        groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
  },
  ignorePatterns: ["dist/", "build/", "node_modules/"],
};
