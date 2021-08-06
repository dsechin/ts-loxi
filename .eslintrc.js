module.exports = {
    'env': {
        'node': true,
    },
    'overrides': [
      {
        'files': [
          '*.ts',
        ],
        'parserOptions': {
          'project': 'tsconfig.json',
          'sourceType': 'module',
          'createDefaultProgram': true,
        },
        'parser': '@typescript-eslint/parser',
        'plugins': [
          'eslint-plugin-import',
          'eslint-plugin-jsdoc',
          '@typescript-eslint',
          '@typescript-eslint/tslint',
          'import',
          'jsdoc',
          'prefer-arrow',
        ],
        'extends': [
          'eslint:recommended',
          'plugin:@typescript-eslint/recommended',
        ],
        'rules': {
          '@typescript-eslint/consistent-type-definitions': 'error',
          '@typescript-eslint/dot-notation': 'off',
          '@typescript-eslint/explicit-member-accessibility': [
            'off',
            {
              'accessibility': 'explicit',
            },
          ],
          // Marks multiline union type declarations as invalid
          // @see https://github.com/typescript-eslint/typescript-eslint/issues/880
          '@typescript-eslint/indent': [
            'off',
            2, { ignoredNodes: ['ObjectExpression'], SwitchCase: 1 },
          ],
          '@typescript-eslint/member-delimiter-style': [
            'error',
            {
              'multiline': {
                'delimiter': 'semi',
                'requireLast': true,
              },
              'singleline': {
                'delimiter': 'semi',
                'requireLast': false,
              },
            },
          ],
          '@typescript-eslint/no-empty-function': 'off',
          '@typescript-eslint/no-empty-interface': 'error',
          '@typescript-eslint/no-inferrable-types': [
            'error',
            {
              'ignoreParameters': true,
            },
          ],
          '@typescript-eslint/no-misused-new': 'error',
          '@typescript-eslint/no-non-null-assertion': 'error',
          '@typescript-eslint/no-unused-expressions': 'error',
          '@typescript-eslint/prefer-function-type': 'error',
          '@typescript-eslint/quotes': [
            'error',
            'single',
          ],
          '@typescript-eslint/semi': [
            'error',
            'always',
          ],
          '@typescript-eslint/type-annotation-spacing': 'error',
          '@typescript-eslint/unified-signatures': 'error',
          'brace-style': [
            'error',
            '1tbs',
          ],
          'constructor-super': 'error',
          'curly': 'error',
          'eol-last': 'error',
          'eqeqeq': [
            'error',
            'smart',
          ],
          'guard-for-in': 'error',
          'id-blacklist': 'off',
          'id-match': 'off',
          'import/no-deprecated': 'warn',
          'jsdoc/no-types': 'error',
          'max-len': [
            'error',
            {
              'code': 140,
            },
          ],
          'no-bitwise': 'error',
          'no-caller': 'error',
          'no-console': [
            'error',
            {
              'allow': [
                'log',
                'dirxml',
                'warn',
                'error',
                'dir',
                'timeLog',
                'assert',
                'clear',
                'count',
                'countReset',
                'group',
                'groupCollapsed',
                'groupEnd',
                'table',
                'Console',
                'markTimeline',
                'profile',
                'profileEnd',
                'timeline',
                'timelineEnd',
                'timeStamp',
                'context',
              ],
            },
          ],
          'no-debugger': 'error',
          'no-duplicate-imports': 'error',
          'no-empty': 'off',
          'no-eval': 'error',
          'no-fallthrough': 'error',
          'no-new-wrappers': 'error',
          'no-restricted-imports': [
            'error',
            'rxjs/Rx',
          ],
          'no-throw-literal': 'error',
          'no-trailing-spaces': 'error',
          'no-undef-init': 'error',
          'no-underscore-dangle': 'off',
          'no-unused-labels': 'error',
          'no-var': 'error',
          'prefer-const': 'error',
          'radix': 'error',
          'spaced-comment': [
            'error',
            'always',
            {
              'markers': [
                '/',
              ],
            },
          ],
          '@typescript-eslint/tslint/config': [
            'error',
            {
              'rules': {
                'import-spacing': true,
                // TODO: reenable once implemented
                // 'use-host-property-decorator': true,
                // 'use-input-property-decorator': true,
                // 'use-life-cycle-interface': true,
                // 'use-output-property-decorator': true,
                'whitespace': [
                  true,
                  'check-branch',
                  'check-decl',
                  'check-operator',
                  'check-separator',
                  'check-type',
                ],
              },
            },
          ],

          // ADDITIONAL RULES

          '@typescript-eslint/no-unsafe-assignment': 'off',
          'arrow-body-style': ['off', 'as-needed'],
          '@typescript-eslint/ban-types': ['off'],
          'quote-props': ['warn', 'consistent-as-needed'],
          'prefer-arrow/prefer-arrow-functions': ['off'],
          'object-shorthand': 'off',
          'quotes': ['error', 'single'],

          // @see https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-shadow.md
          'no-shadow': 'off',
          '@typescript-eslint/no-shadow': ['error'],

          'object-curly-spacing': ['error', 'never'],

          '@typescript-eslint/explicit-module-boundary-types': ['off'], // TODO: reenable
          'padding-line-between-statements': [
            'warn',
            { blankLine: 'always', prev: '*', next: 'return' },
            { blankLine: 'always', prev: 'block-like', next: 'const' },
            { blankLine: 'always', prev: 'block-like', next: 'let' },
            // Always require blank lines before and after every sequence of variable declarations and export
            { blankLine: 'always', prev: '*', next: ['const', 'let', 'var', 'export'] },
            { blankLine: 'always', prev: ['const', 'let', 'var', 'export'], next: '*' },
            { blankLine: 'any',    prev: ['const', 'let', 'var', 'export'], next: ['const', 'let', 'var', 'export'] },
            // Always require blank lines before and after class declaration, if, do/while, switch, try
            { blankLine: 'always', prev: '*', next: ['if', 'class', 'for', 'do', 'while', 'switch', 'try'] },
            { blankLine: 'always', prev: ['if', 'class', 'for', 'do', 'while', 'switch', 'try'], next: '*' },
          ],
          'no-useless-escape': 'off',
          '@typescript-eslint/unbound-method': [
            'error',
            {
              'ignoreStatic': true,
            },
          ],
          'comma-dangle': ['error', {
            'arrays': 'always-multiline',
            'objects': 'always-multiline',
            'imports': 'always-multiline',
            'functions': 'always-multiline',
          }],
          '@typescript-eslint/restrict-template-expressions': 'off',
          '@typescript-eslint/consistent-type-assertions': 'off',
          'one-var': [
            'off',
          ],
          '@typescript-eslint/prefer-regexp-exec': 'off',
        },
      },
    ],
};
