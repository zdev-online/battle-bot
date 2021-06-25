'use strict';
const path    = require('path');
const Encoder = require('webpack-obfuscator');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    "bot": path.resolve(__dirname, 'dist', 'index.js')
  },
  output: {
    path: path.resolve(__dirname, 'bundle'),
    filename: '[name].e.js',
  },
  target: 'node',
  mode: 'production',
  plugins: [
      new Encoder({
        target: "node",
        stringArray: true,
        shuffleStringArray: true,
        rotateStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArrayEncoding: ["base64"],
        stringArrayIndexShift: true,
        stringArrayWrappersCount: 5,
        stringArrayWrappersChainedCalls: true,    
        stringArrayWrappersParametersMaxCount: 5,
        stringArrayWrappersType: "function",
        stringArrayThreshold: 1,
        compact: true,
        identifierNamesGenerator: "hexadecimal",
        numbersToExpressions: true,
        simplify: true
      }, ['bot.js'])
  ],
  externalsPresets: { node: true }, 
  externals: [nodeExternals()], 
};