const MemeCoin = artifacts.require("./MemeCoin.sol");
const MemeCoinRegister = artifacts.require("./MemeCoinRegister.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");
const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");

const config = require('../config');

module.exports = async function(deployer) { 
  let memeCoin = await MemeCoin.deployed();
  let memeCoinRegister = await MemeCoinRegister.deployed();

  await deployer.deploy(BancorFormula);
  let bancorFormula = await BancorFormula.deployed();
  await bancorFormula.init();
  
  await deployer.deploy(MTokenFactory, memeCoin.address, bancorFormula.address);

  let mTokenFactory = await MTokenFactory.deployed(); 

  await mTokenFactory.setMemeCoinRegsiter(memeCoinRegister.address);
  await memeCoinRegister.setMTokenFactory(mTokenFactory.address);
};
