const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
module.exports = {
  entry: './app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'expressDist')
  },
  target: 'node', // 这是最关键的
  plugins: [new CleanWebpackPlugin()]
}
