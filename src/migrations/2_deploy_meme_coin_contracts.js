const Memecoin = artifacts.require("./Memecoin.sol");

const config = require('../config');

module.exports = async function(deployer) {

  // 100 000 000 memecoins are initialy minted
  await deployer.deploy(Memecoin, 1e8, "Memecoin", "mCoin");
};
