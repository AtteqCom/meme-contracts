const HDWalletProvider = require("@truffle/hdwallet-provider");

require('dotenv').config();  // Store environment-specific variable from '.env' to process.env

module.exports = {
  networks: {
    development: {
      host: "ganache",
      port: 8545,
      network_id: "*",
    }
  },

  compilers: {
    solc: {
      version: "0.8.0",
      settings: {
        //Note: The default solc version is *not* set here!
        //It's set in compilerSupplier/index.js in compile-solidity
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  }
};
