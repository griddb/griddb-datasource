const commonConfig = require('./webpack.base.config');
const productionConfig = require('./webpack.product.config');
const developmentConfig = require('./webpack.dev.config');

const merge = require("webpack-merge"); // just to merge 2 object

module.exports = (env, argv) => {

  // if (argv.mode === 'development') {
  // }
  let config = {};

  if (argv.mode === 'production') {
    console.log('run webpack in product mode');
    config = merge(commonConfig, productionConfig, { "mode": argv.mode });
  } else {
    console.log('run webpack in dev mode');
    config = merge(commonConfig, developmentConfig, { "mode": argv.mode });
  }

  // console.log(config.mode);
  // console.log(config.watch);

  return config;
};