const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinRegister = artifacts.require("./MemecoinRegister.sol");

const config = require('../config');

let MTOKEN_CREATION_PRICE = (new web3.utils.BN(1e6));
let MTOKEN_INITIAL_SUPPLY = (new web3.utils.BN(1e3));
let TEN_AS_BN = (new web3.utils.BN(10));

module.exports = async function(deployer) {
  let memecoin = await Memecoin.deployed();

  let memecoinDecimals = (await memecoin.decimals()); 

  await deployer.deploy(MemecoinRegister);

  let memecoinRegister = await MemecoinRegister.deployed();

  await memecoinRegister.setReserveCurrency(memecoin.address);

  // initial price to register new mToken is 1 000 000 of memecoins 
  await memecoinRegister.setMTokenCreationPrice(MTOKEN_CREATION_PRICE.mul(TEN_AS_BN.pow(memecoinDecimals)));

  // initial reserve currency supply of new mToken is 1 000 of memecoins
  await memecoinRegister.setMTokenReserveCurrencyInititalSupply(MTOKEN_INITIAL_SUPPLY.mul(TEN_AS_BN.pow(memecoinDecimals)));
};
