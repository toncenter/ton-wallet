var typescriptTransform = require('i18next-scanner-typescript');

module.exports = {
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    // Use ! to filter out files or directories
    '!src/**/*.spec.{js,jsxts,tsx}',
    '!**/node_modules/**',
  ],
  output: './',
  options: {
    debug: true,
    func: {
      list: ['i18next.t', 'i18n.t', 't'],
      extensions: ['.js', '.jsx']
    },
    trans: {
      component: 'Trans',
      i18nKey: 'i18nKey',
      defaultsKey: 'defaults',
      extensions: ['.jsx'],
      fallbackKey: function(ns, value) {
        value = value.replace(/<(\d+)>{{(\w+)}}<\/\1>/g, '{{$2}}');
        value = value.replace(/\s+/g, ' ');
        return value;
      },
      acorn: {
        ecmaVersion: 10, // defaults to 10
        sourceType: 'module' // defaults to 'module'
        // Check out https://github.com/acornjs/acorn/tree/master/acorn#interface for additional options
      }
    },
    lngs: ['en'],
    ns: [
      'translation',
    ],
    defaultLng: 'en',
    defaultNs: 'translation',
    defaultValue: function (lng, ns, key) {
      return '[' + lng + ']' + key;
    },
    resource: {
      loadPath: 'src/i18n/{{lng}}/{{ns}}.json',
      savePath: 'src/i18n/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineEnding: '\n'
    },
    nsSeparator: false, // namespace separator
    keySeparator: false, // key separator
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    }
  },
  transform: typescriptTransform({
    // default value for extensions
    extensions: [".ts", ".tsx"],
    // optional ts configuration
    tsOptions: {
      target: "es2018",
      jsx: "preserve",
    },
  }),
};
