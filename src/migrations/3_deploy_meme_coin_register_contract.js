const MemeCoin = artifacts.require("./MemeCoin.sol");
const MemeCoinRegister = artifacts.require("./MemeCoinRegister.sol");

const config = require('../config');

module.exports = async function(deployer) {
  let memeCoin = await MemeCoin.deployed();

  await deployer.deploy(MemeCoinRegister);

  let memeCoinRegister = await MemeCoinRegister.deployed();

  await memeCoinRegister.setReserveCurrency(memeCoin.address);
};
