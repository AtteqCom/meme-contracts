const Memecoin = artifacts.require("./Memecoin.sol");
const MasterFarm = artifacts.require("./farm/MasterFarm.sol");

const config = require('../config');

module.exports = async function(deployer) {
  console.log(`Migrate - creating MasterFarm`);

  let memecoin = await Memecoin.deployed();
  // 1 MEM per block == 1000000000000000000weis
  await deployer.deploy(MasterFarm, memecoin.address, '0x3C47f1DeE211caA7616102042EF9BE18Da858574', '0x3C47f1DeE211caA7616102042EF9BE18Da858574', '1000000000000000000');
};
