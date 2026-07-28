---
title: ESLint 9 completely broke backward compatibility by making "flat config" the default system
status: current
reviewed: 2026-07-28
tags: [standards, best-practices]
audience: developer
---

# ESLint 9 completely broke backward compatibility by making "flat config" the default system

To resolve TypeScript parser issues in this new format, you must transition to the modern typescript-eslint package and update your configuration structure.

## 1. Unified Dependency Management

Instead of managing @typescript-eslint/parser and @typescript-eslint/eslint-plugin separately, the ecosystem has moved to a single typescript-eslint package that bundles both.

    Install: npm install --save-dev eslint typescript typescript-eslint.

## 2. Update Configuration Structure

In flat config, the parser is no longer a string path but a direct reference moved into the languageOptions block.

Use tseslint.config(): This helper function replaces the old extends array and simplifies combining configurations.
Example eslint.config.mjs:

````

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  languageOptions: {
    parserOptions: {
      project: true, // Required for type-aware rules
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
````

## 3. Key Compatibility Fixes

Type-Aware Rules: If you receive errors like parserServices to be generated, you must explicitly provide parserOptions.project. Use project: true in newer versions to automatically find the nearest tsconfig.json.

Legacy Plugins: For plugins that do not yet support flat config, use the FlatCompat utility from @eslint/compat to wrap existing .eslintrc configurations.
File Extensions: Ensure your files array includes all relevant extensions (e.g., .ts, .mts, .tsx) to ensure the parser runs on the correct files.
VS Code Support: Update to version 3.0.10 or later of the ESLint extension to ensure it recognizes the eslint.config.js file without manual flags

To resolve compatibility issues between
ESLint 9 and the TypeScript parser, you should migrate to typescript-eslint version 8 or newer, which provides native support for the "flat" configuration format (eslint.config.js or eslint.config.mjs).

# Key Steps to Fix Compatibility

    Upgrade Dependencies: Install the unified typescript-eslint package, which replaces the separate plugin and parser packages used in older versions.

````bash

    npm install --save-dev eslint typescript typescript-eslint

    Use code with caution.
    Use the Unified Wrapper: Instead of manually configuring languageOptions.parser, use the tseslint.config() helper to simplify the flat config structure.


    ```
```javascript

    // eslint.config.mjs
    import eslint from '@eslint/js';
    import tseslint from 'typescript-eslint';

    export default tseslint.config(
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      {
        rules: {
          // your custom rules
        }
      }
    );

    Use code with caution.
    Address "ParserServices" Errors: If you encounter errors regarding parserServices (common when using type-aware rules), ensure you provide a project value within languageOptions.parserOptions.
    javascript

    {
      languageOptions: {
        parserOptions: {
          projectService: true, // Recommended in v8+ for automatic tsconfig lookup
          tsconfigRootDir: import.meta.dirname,
        },
      },
    }
````

```



## Common Pitfalls

    Old Package Names: Ensure you have uninstalled @typescript-eslint/eslint-plugin and @typescript-eslint/parser, as these are now bundled within typescript-eslint.
    VS Code Settings: If linting isn't appearing in your editor, ensure the ESLint extension is updated to version 3.0.5 or above and that eslint.useFlatConfig is enabled in your settings.
```
