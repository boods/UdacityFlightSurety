// const path = require("path");
// const CopyWebpackPlugin = require("copy-webpack-plugin");

// module.exports = {
//   mode: 'development',
//   entry: "./app/dapp/index.js",
//   output: {
//     filename: "index.js",
//     path: path.resolve(__dirname, "dist"),
//   },
//   plugins: [
//     new CopyWebpackPlugin([{ from: "./app/dapp/index.html", to: "index.html" }]),
//   ],
//   devServer: { contentBase: path.join(__dirname, "dist"), compress: true },
// };

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: ['babel-polyfill', path.join(__dirname, "app/dapp")],
  output: {
    path: path.join(__dirname, "prod/dapp"),
    filename: "bundle.js"
  },
  module: {
    rules: [
    {
        test: /\.(js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.html$/,
        use: "html-loader",
        exclude: /node_modules/

      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ 
      template: path.join(__dirname, "app/dapp/index.html")
    })
  ],
  resolve: {
    extensions: [".js"]
  },
  devServer: {
    contentBase: path.join(__dirname, "dapp"),
    port: 8000,
    stats: "minimal"
  }
};
