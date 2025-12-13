import {defineConfig} from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import markdown from "@eslint/markdown";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
    {
        files: ["**/*.js", "**/*.mjs"],
        languageOptions: {
            ecmaVersion: "latest",
            globals: {
                ...globals.browser,
                ...globals.node,
                Log: "readonly",
                Module: "readonly"
            }
        },
        plugins: {js, stylistic},
        extends: ["js/all", "stylistic/all"],
        rules: {
            "@stylistic/array-element-newline": ["error", "consistent"],
            "@stylistic/function-call-argument-newline": ["error", "consistent"],
            "@stylistic/newline-per-chained-call": ["error", {ignoreChainWithDepth: 3}],
            "@stylistic/indent": ["error", 4],
            "@stylistic/lines-around-comment": ["error", {beforeBlockComment: false}],
            "@stylistic/object-property-newline": ["error", {allowAllPropertiesOnSameLine: true}],
            "@stylistic/padded-blocks": ["error", "never"],
            "@stylistic/quote-props": ["error", "as-needed"],
            "capitalized-comments": "off",
            "max-statements": ["error", 20],
            "no-magic-numbers": "off",
            "no-ternary": "off",
            "one-var": ["error", "never"],
            "sort-keys": "off"
        }
    },
    {files: ["**/*.md"], plugins: {markdown}, language: "markdown/gfm", extends: ["markdown/recommended"]}
]);
