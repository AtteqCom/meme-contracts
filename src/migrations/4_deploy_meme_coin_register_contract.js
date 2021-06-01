const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinRegister = artifacts.require("./MemecoinRegister.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");

const config = require('../config');

let MTOKEN_CREATION_PRICE = (new web3.utils.BN(1e6));
let MTOKEN_INITIAL_SUPPLY = (new web3.utils.BN(1e3));
let TEN_AS_BN = (new web3.utils.BN(10));

module.exports = async function(deployer) {
  console.log(`Migrate - creating MTokenRegister`);

  let memecoin = await Memecoin.deployed();
  let mTokenInitialSetting = await MTokenInitialSetting.deployed();

  await deployer.deploy(MemecoinRegister);

  let memecoinRegister = await MemecoinRegister.deployed();

  await memecoinRegister.setReserveCurrency(memecoin.address);

  await memecoinRegister.setMTokenInitialSetting(mTokenInitialSetting.address);

  
};
