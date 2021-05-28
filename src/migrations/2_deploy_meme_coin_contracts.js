const MemeCoin = artifacts.require("./MemeCoin.sol");

const config = require('../config');

module.exports = async function(deployer) {
  await deployer.deploy(MemeCoin, 1e8, "MemeCoin", "mCoin");
};
