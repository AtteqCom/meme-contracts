const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinRegister = artifacts.require("./MemecoinRegister.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");


module.exports = async function(deployer) {
  console.log(`Migrate - creating MTokenRegister`);

  let memecoin = await Memecoin.deployed();
  let mTokenInitialSetting = await MTokenInitialSetting.deployed();

  await deployer.deploy(MemecoinRegister);

  let memecoinRegister = await MemecoinRegister.deployed();

  await memecoinRegister.setReserveCurrency(memecoin.address);

  await memecoinRegister.setMTokenInitialSetting(mTokenInitialSetting.address);

  
};
