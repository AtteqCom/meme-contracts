const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");

const config = require('../config');

let MTOKEN_CREATION_PRICE = (new web3.utils.BN(1e6));
let MTOKEN_INITIAL_SUPPLY = (new web3.utils.BN(1e3));
//let MTOKEN_CREATION_PRICE = (new web3.utils.BN(1e6));
//let MTOKEN_INITIAL_SUPPLY = (new web3.utils.BN(1e3));
let TEN_AS_BN = (new web3.utils.BN(10));


module.exports = async function(deployer) {
  console.log(`Migrate - creating MTokenInitialSetting`);

  await deployer.deploy(
    MTokenInitialSetting, 
    config.MTOKEN_CREATION_PRICE, 
    config.MTOKEN_INITIAL_SUPPLY, 
    config.MTOKEN_FEE,
    config.MTOKEN_FEE_LIMIT,
    config.MTOKEN_RESERVE_CURRENCY_WEIGHT,
    config.MTOKEN_RESERVE_CURRENCY_INITAL_SUPPLY
  );
};
