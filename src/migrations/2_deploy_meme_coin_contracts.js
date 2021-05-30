const Memecoin = artifacts.require("./Memecoin.sol");

const config = require('../config');

module.exports = async function(deployer) {
  await deployer.deploy(Memecoin, 1e8, "Memecoin", "mCoin");
};
