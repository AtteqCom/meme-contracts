const HDWalletProvider = require("@truffle/hdwallet-provider");

require('dotenv').config();  // Store environment-specific variable from '.env' to process.env

module.exports = {
  networks: {
    development: {
      host: "ganache",
      port: 8545,
      network_id: "*",
    },
    mainnet: { // must be a web3-1.0.0, otherwise truffle commands may hang in CI
      provider: () => new HDWalletProvider(process.env.WALLET_PASSWORD, "https://mainnet.infura.io/v3/" + process.env.INFRURA_KEY),
      network_id: 1, 
      gasPrice: 60000000000,
      gas: 901238
    },
    matic: { // must be a web3-1.0.0, otherwise truffle commands may hang in CI
      provider: () => new HDWalletProvider(process.env.WALLET_PASSWORD, "https://rpc-mainnet.maticvigil.com"),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      gasPrice: 1000000000,
      skipDryRun: true
    },
    goerli: { // must be a web3-1.0.0, otherwise truffle commands may hang in CI
      provider: () => new HDWalletProvider(process.env.WALLET_PASSWORD, "https://goerli.infura.io/v3/" + process.env.INFURA_KEY),
      network_id: 5,
    },
    mumbai: { // must be a web3-1.0.0, otherwise truffle commands may hang in CI
      provider: () => new HDWalletProvider(process.env.WALLET_PASSWORD, "https://rpc-mumbai.maticvigil.com"),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
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
