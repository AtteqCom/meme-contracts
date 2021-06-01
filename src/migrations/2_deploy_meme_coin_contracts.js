const Memecoin = artifacts.require("./Memecoin.sol");

const config = require('../config');

// config.MEMECOIN_INITIAL_SUPPLY

module.exports = async function(deployer) {
  console.log(`Migrate - creating Memecoin`);
  // 100 000 000 memecoins are initialy minted
  await deployer.deploy(Memecoin, config.MEMECOIN_INITIAL_SUPPLY, config.MEMECOIN_NAME, config.MEMECOIN_SYMBOL);
};
