const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path')

module.exports = {
  webpack: {
    configure: (webpackConfig, {env, paths}) => {
      const htmlWebpackPluginInstance = webpackConfig.plugins.find(
        webpackPlugin => webpackPlugin instanceof HtmlWebpackPlugin
      );
      if (htmlWebpackPluginInstance) {
        htmlWebpackPluginInstance.userOptions.inject = false;
      }
      paths.appBuild = webpackConfig.output.path = path.resolve('./docs');
      return {
        ...webpackConfig,
        entry: {
          main: paths.appIndexJs,
          contentscript: './src/chrome/contentscript.ts',
          backgroundController: './src/chrome/backgroundController.ts',
          tonProvider: './src/chrome/tonProvider.ts',
        },
        output: {
          ...webpackConfig.output,
          filename: 'static/js/[name].js',
        },
        optimization: {
          ...webpackConfig.optimization,
          runtimeChunk: false,
        }
      }
    },
  }
}
