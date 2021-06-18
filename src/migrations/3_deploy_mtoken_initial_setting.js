const web3 = require('web3');
const BN = web3.utils.BN;
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");
const config = require('../config');

let ONE_COIN = (new BN(10)).pow(new BN(18));
let MTOKEN_CREATION_PRICE = (new BN(config.MTOKEN_CREATION_PRICE)).mul(ONE_COIN);
let MTOKEN_INITIAL_SUPPLY = (new BN(config.MTOKEN_INITIAL_SUPPLY)).mul(ONE_COIN);
let MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY = (new BN(config.MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY)).mul(ONE_COIN);

module.exports = async function(deployer) {

  await deployer.deploy(
    MTokenInitialSetting, 
    MTOKEN_CREATION_PRICE, 
    MTOKEN_INITIAL_SUPPLY, 
    config.MTOKEN_FEE,
    config.MTOKEN_FEE_LIMIT,
    config.MTOKEN_RESERVE_CURRENCY_WEIGHT,
    MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY
  );
};
