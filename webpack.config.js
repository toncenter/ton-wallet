const path = require('path');

const all = {
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

const firefox = {
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
        path: path.resolve(__dirname, 'build-firefox/js/'),
    },
};

module.exports = [all, firefox];