const Memecoin = artifacts.require("./Memecoin.sol");
const MTokenRegister = artifacts.require("./MTokenRegister.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");
const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");

const config = require('../config');

module.exports = async function(deployer) {
  console.log(`Migrate - creating MTokenFactory`);

  let memecoin = await Memecoin.deployed();
  let memecoinRegister = await MTokenRegister.deployed();
  let mTokenInitialSetting = await MTokenInitialSetting.deployed();

  await deployer.deploy(BancorFormula);
  let bancorFormula = await BancorFormula.deployed();
  await bancorFormula.init();
  
  await deployer.deploy(MTokenFactory, memecoin.address, mTokenInitialSetting.address, bancorFormula.address);

  let mTokenFactory = await MTokenFactory.deployed(); 

  await mTokenFactory.setMemecoinRegsiter(memecoinRegister.address);
  await memecoinRegister.setMTokenFactory(mTokenFactory.address);
};
