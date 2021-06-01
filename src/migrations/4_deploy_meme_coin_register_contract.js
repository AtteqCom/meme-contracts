const Memecoin = artifacts.require("./Memecoin.sol");
const MTokenRegister = artifacts.require("./MTokenRegister.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");


module.exports = async function(deployer) {
  console.log(`Migrate - creating MTokenRegister`);

  let memecoin = await Memecoin.deployed();
  let mTokenInitialSetting = await MTokenInitialSetting.deployed();

  await deployer.deploy(MTokenRegister);

  let memecoinRegister = await MTokenRegister.deployed();

  await memecoinRegister.setReserveCurrency(memecoin.address);

  await memecoinRegister.setMTokenInitialSetting(mTokenInitialSetting.address);

  
};
