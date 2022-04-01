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
            __TONCENTER_API_KEY_WEB_MAIN__: `'${process.env.TONCENTER_API_KEY_WEB_MAIN}'`,
            __TONCENTER_API_KEY_WEB_TEST__: `'${process.env.TONCENTER_API_KEY_WEB_TEST}'`,
            __TONCENTER_API_KEY_EXT_MAIN__: `'${process.env.TONCENTER_API_KEY_EXT_MAIN}'`,
            __TONCENTER_API_KEY_EXT_TEST__: `'${process.env.TONCENTER_API_KEY_EXT_TEST}'`
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
