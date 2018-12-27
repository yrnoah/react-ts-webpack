import 'dotenv/config';
import * as webpack from 'webpack';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';

const isProd = process.env.NODE_ENV === 'production';
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const config: webpack.Configuration = {
  mode: isProd ? 'production' : 'development',
  devtool: 'source-map',
  entry: {
    app: ['./src/index.tsx'],
  },
  output: {
    path: path.join(__dirname, 'dist'),
    pathinfo: false,
    filename: '[name].[hash:7].js',
    chunkFilename: '[name].[chunkhash:7].js',
    publicPath: '/',
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'initial',
          // reuseExistingChunk: true,
        },
      },
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  resolveLoader: {
  },
  watchOptions: {
    ignored: /node_modules|dist/,
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        loader: 'json-loader',
        type: 'javascript/auto',
      },
      {
        test: /\.scss$/,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.tsx?$/,
        // loader: 'awesome-typescript-loader',
        loader: 'ts-loader',
        options: isProd ? {
          configFile:  'tsconfig.web.json',
          // useBabel: true,
        } : undefined,
      },
      {
        test: /\.(ttf|woff2?|svg|png|jpe?g|gif|eot)$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
        },
      },
    ],
  },
  plugins: [
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src/index.html'),
      filename: path.join(__dirname, 'dist/index.html'),
      chunksSortMode: 'none',
      minify: isProd ? {
        removeComments: true,
        useShortDoctype: true,
        collapseWhitespace: true,
        collapseInlineTagWhitespace: true,
        sortAttributes: true,
        sortClassName: true,
        minifyCSS: true,
        minifyJS: (source: string) => {
          return source ?
            require('google-closure-compiler-js').compile({jsCode: [{src: source}]}).compiledCode :
            '';
        },
      } : undefined,
    }),
  ],
  devServer: {
    host: '0.0.0.0',
    hot: true,
    historyApiFallback: true,
  },
  performance: {
    hints: false,
  },
};

const RELEASE_ID = isProd ? process.env.RELEASE_ID : undefined;

const env = {
  'process.env': {
    NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
    RELEASE_ID: RELEASE_ID ? JSON.stringify(RELEASE_ID) : 'undefined',
  },
};

if (isProd) {
  const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
  const ClosurePlugin = require('closure-webpack-plugin');
  const OptimizeCssPlugin = require('optimize-css-assets-webpack-plugin');
  const CleanWebpackPlugin = require('clean-webpack-plugin');
  const extractor = new MiniCssExtractPlugin({
    filename: 'style.css',
    // allChunks: true,
  });
  config.optimization = {
    ...config.optimization,
    minimizer: [
      new ClosurePlugin({mode: 'STANDARD'}, {
        charset: 'utf-8',
        create_source_map: true,
        language_in: 'ECMASCRIPT5_STRICT',
        language_out: 'ECMASCRIPT5_STRICT',
      }),
    ],
  };
  config.plugins = [
    ...config.plugins!,
    new CleanWebpackPlugin(['dist'], {root: __dirname, verbose:  true, dry: false}),
    new webpack.DefinePlugin(env),
    new webpack.HashedModuleIdsPlugin(),
    new OptimizeCssPlugin(),
    extractor,
    new webpack.LoaderOptionsPlugin({
      minimize: true,
    }),
    new BundleAnalyzerPlugin({
      // analyzerMode: 'static',
      analyzerMode: 'disabled',
      // generateStatsFile: true,
      // statsFilename: 'stats.json',
    }),
    // new CopyWebpackPlugin([
    //   {
    //     from: path.join(__dirname, 'assets'),
    //     to: path.join(__dirname, 'dist'),
    //     ignore: ['.*'],
    //   },
    // ]),
  ];
  // if (RELEASE_ID !== 'undefined') {
  //   config.plugins.push(new SentryPlugin({
  //     organization: process.env.SENTRY_ORGANIZATION,
  //     project: process.env.SENTRY_PROJECT,
  //     apiKey: process.env.SENTRY_API_KEY,
  //     baseSentryURL: process.env.SENTRY_BASE_URL,
  //     release: RELEASE_ID,
  //   }));
  //   console.log(`upload source-map of release ${RELEASE_ID}`);
  // } else {
  //   console.log('RELEASE_ID is missing, skip sentry procedure.')
  // }
} else {
  const entry: any = config.entry;
  const module: any = config.module;
  module.rules = [
    {
      test: /\.css?$/,
      use: [
        {loader: 'style-loader'},
        {loader: 'css-loader', options: {importLoaders: 1}},
        {loader: 'postcss-loader'},
      ],
    },
    ...module.rules,
  ];
  config.plugins = [
    ...config.plugins!!,
    new webpack.DefinePlugin(env),
    new webpack.NamedModulesPlugin(),
  ];
  if (entry instanceof Object) {
    Object.keys(entry).filter(key => key !== 'vendor').forEach(key => {
      entry[key] = ['react-hot-loader/patch', ...entry[key]];
    });
  }
}

export default config;
