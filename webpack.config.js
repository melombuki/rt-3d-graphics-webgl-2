const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'development',
  devtool: 'inline-source-maps',
  devServer: {
    contentBase: './dist',
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
    ]
  }
};