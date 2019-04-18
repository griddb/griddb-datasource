const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

function resolve(dir) {
  return path.join(__dirname, '..', dir) // nodejs path resolver
}

module.exports = {
  target: 'node',
  context: resolve('src'),
  entry: './module.ts',
  output: {
    filename: "module.js",
    path: resolve('dist'),
    libraryTarget: "amd"
  },
  externals: [ // does not include in bundle.js
    function (context, request, callback) { // not include grafana sdk
      var prefix = 'grafana/';
      console.log(context);
      console.log(request);
      if (request.indexOf(prefix) === 0) {
        return callback(null, request.substr(prefix.length));
      }
      callback();
    },
    {
      lodash: { // not include lodash
        commonjs: 'lodash',
        amd: 'lodash',
        root: '_' // indicates global variable
      },
    },
    {
      angular: { // not include lodash
        commonjs: 'angular',
        amd: 'angular',
        root: 'angular' // indicates global variable
      },
    },
    {
      moment: {
        commonjs: 'moment',
        amd: 'moment',
        root: 'moment'
      },
    }
  ],
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new CopyWebpackPlugin([
      { from: 'plugin.json' },
      { from: 'partials/*' },
      { from: 'img/*' },
      { from: '../README.md' },
      { from: '../QuerySpecialExpression.md' },
    ])
  ],
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loaders: [
          {
            loader: "babel-loader",
            options: { presets: [require.resolve('@babel/preset-env')] }
          },
          "ts-loader"
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        loaders: [
          {
            loader: "babel-loader",
            options: { presets: [require.resolve('@babel/preset-env')] }
          }
        ],
        exclude: /node_modules/,
      }
    ]
  }
}
