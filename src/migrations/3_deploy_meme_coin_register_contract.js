const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinRegister = artifacts.require("./MemecoinRegister.sol");

const config = require('../config');

module.exports = async function(deployer) {
  let memecoin = await Memecoin.deployed();

  await deployer.deploy(MemecoinRegister);

  let memecoinRegister = await MemecoinRegister.deployed();

  await memecoinRegister.setReserveCurrency(memecoin.address);
};
