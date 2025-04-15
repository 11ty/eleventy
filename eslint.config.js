import globals from "globals";
import pluginJs from "@eslint/js";
import stylisticJs from "@stylistic/eslint-plugin-js";
import prettier from "eslint-config-prettier";

export default [
  {
    name: "11ty/setup/js",
    ...pluginJs.configs.recommended,
  },
  {
    name: "11ty/rules/project-specific",
    plugins: {
      "@stylistic/js": stylisticJs,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-async-promise-executor": "warn",
      "no-prototype-builtins": "warn",
      "no-unused-vars": "warn",
      "@stylistic/js/space-unary-ops": "error",
    },
  },
  {
    name: "11ty/setup/prettier",
    ...prettier,
  },
];
