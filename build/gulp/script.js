const { resolve } = require('path');
const webpack = require('webpack');

const script = (buildDest, done) => {
    webpack({
        mode: 'none',
        entry: {
            Controller: './src/js/Controller.js',
            View: './src/js/view/View.js'
        },
        plugins: [new webpack.DefinePlugin({
            TONCENTER_API_KEY_WEB_MAIN: `'${process.env.TONCENTER_API_KEY_WEB_MAIN}'`,
            TONCENTER_API_KEY_WEB_TEST: `'${process.env.TONCENTER_API_KEY_WEB_TEST}'`,
            TONCENTER_API_KEY_EXT_MAIN: `'${process.env.TONCENTER_API_KEY_EXT_MAIN}'`,
            TONCENTER_API_KEY_EXT_TEST: `'${process.env.TONCENTER_API_KEY_EXT_TEST}'`
        })],
        optimization: {
            concatenateModules: true,
            minimize: false
        },
        output: {
            filename: '[name].js',
            path: resolve(process.cwd(), `./${buildDest}/js`)
        },
    }, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats));

        done();
    });
};

module.exports = script;
