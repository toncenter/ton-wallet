const path = require('path');

module.exports = {
    entry: {
        Controller: './src/js/Controller.js',
        'view/View': './src/js/view/View.js'
    },
    optimization: {
        concatenateModules: true,
        minimize: true,
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build/js/'),
    },
};