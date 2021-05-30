const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinRegister = artifacts.require("./MemecoinRegister.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");
const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");

const config = require('../config');

module.exports = async function(deployer) { 
  let memecoin = await Memecoin.deployed();
  let memecoinRegister = await MemecoinRegister.deployed();

  await deployer.deploy(BancorFormula);
  let bancorFormula = await BancorFormula.deployed();
  await bancorFormula.init();
  
  await deployer.deploy(MTokenFactory, memecoin.address, bancorFormula.address);

  let mTokenFactory = await MTokenFactory.deployed(); 

  await mTokenFactory.setMemecoinRegsiter(memecoinRegister.address);
  await memecoinRegister.setMTokenFactory(mTokenFactory.address);
};
