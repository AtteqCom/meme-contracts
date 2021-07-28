const Memecoin = artifacts.require("Memecoin");
const MTokenRegister = artifacts.require("MTokenRegister");
const MTokenInitialSetting = artifacts.require("MTokenInitialSetting");
const MToken = artifacts.require("MToken");


const ONE_TO_WEI = web3.utils.toBN("1000000000000000000");
const MEMECOIN_ADDRESS = "0x7CC0250C80BeE3aE0B3a12792b7e7DFB32E5Ad81";
const M_TOKEN_REGISTER_ADDRESS = "0x4407Ed9BeBdE67A0C6A80e6F81d75B1d0a9BEb35";

module.exports = async function(callback) {
  try {
    console.log("DEPLOYING M TOKENS\n");

    const mTokenRegisterOwner = (await web3.eth.getAccounts())[0];

    // const creationPrice = ONE_TO_WEI;
    const initialSupply = ONE_TO_WEI;
    const reserveCurrencyInitialSupply = ONE_TO_WEI;
    const fee = 250;
    const feeLimit = 1000;

    const cw5ReserveCurrencyWeight = 669000;
    const cw8ReserveCurrencyWeight = 573000;
    const cw10ReserveCurrencyWeight = 527000;

    const memecoin = await Memecoin.at(MEMECOIN_ADDRESS);
    const mTokenRegister = await MTokenRegister.at(M_TOKEN_REGISTER_ADDRESS);

    // const memecoin = await Memecoin.deployed();
    // const mTokenRegister = await MTokenRegister.deployed();

    const initialSettingAddress = await mTokenRegister.mTokenInitialSetting();
    const initialSetting = await MTokenInitialSetting.at(initialSettingAddress);
    // await initialSetting.setCreationPrice(creationPrice);
    await initialSetting.setInitialSupply(initialSupply);
    await initialSetting.setInitialFee(fee);
    await initialSetting.setInitialFeeLimit(feeLimit);
    await initialSetting.setReserveCurrencyInitialSupply(reserveCurrencyInitialSupply);


    // await initialSetting.setReserveCurrencyWeight(cw5ReserveCurrencyWeight);
    // const cw5MToken1 = await deployMToken(memecoin, mTokenRegister, `mAlbert 1`, "MAL 1");
    // const cw5MToken2 = await deployMToken(memecoin, mTokenRegister, `mBeatrix 1`, "MBX 1");
    // const cw5MToken3 = await deployMToken(memecoin, mTokenRegister, `mCharlotte 1`, "MCHT 1");
    // await logDeployedMTokens(memecoin, 'cw5', [cw5MToken1, cw5MToken2, cw5MToken3]);

    await initialSetting.setReserveCurrencyWeight(cw8ReserveCurrencyWeight);
    const cw8MToken1 = await deployMToken(memecoin, mTokenRegister, `mDaniel 2`, "MDL 2");
    const cw8MToken2 = await deployMToken(memecoin, mTokenRegister, `mEric 2`, "MEC 2");
    const cw8MToken3 = await deployMToken(memecoin, mTokenRegister, `mFrederic 2`, "MFC 2");
    await logDeployedMTokens(memecoin, 'cw8',[cw8MToken1, cw8MToken2, cw8MToken3]);

    await initialSetting.setReserveCurrencyWeight(cw10ReserveCurrencyWeight);
    const cw10MToken1 = await deployMToken(memecoin, mTokenRegister, `mGeorge 3`, "MGRG 3");
    const cw10MToken2 = await deployMToken(memecoin, mTokenRegister, `mJenny 3`, "MJN 3");
    const cw10MToken3 = await deployMToken(memecoin, mTokenRegister, `mSophy 3`, "MSY 3");
    await logDeployedMTokens(memecoin, 'cw10', [cw10MToken1, cw10MToken2, cw10MToken3]);

    callback();
  } catch (e) {
    console.error("ERROR :(");
    console.error(e);
    callback(e);
  }
}

const weiToReadable = (weiValue) => {
  if (weiValue.toString() == '0') {
    return 0;
  }

  const a = weiValue.div(ONE_TO_WEI.divn(1000));
  const b = parseFloat(a.toString());

  return b / 1000;
}

const deployMToken = async (memecoin, mTokenRegister, name, symbol) => {
  console.log(`Deploying MToken contract ${name} (${symbol})`);
  const creationPrice = await mTokenRegister.getCreationTotalCosts();
  await memecoin.approve(mTokenRegister.address, creationPrice);

  const mTokenResult = await mTokenRegister.createMToken(name, symbol);
  const mTokenAddress = mTokenResult.logs[2].args.mTokenContract;
  console.log(`Deployed at ${mTokenAddress}\n`);
  const mToken = await MToken.at(mTokenAddress);

  return mToken;
}

const logDeployedMTokens = async (memecoin, mTokenType, mTokens) => {
    console.log(`\n\n${mTokenType} mTokens`);
    const mToken0 = mTokens[0];
    const currentSupply = await mToken0.totalSupply();
    const memecoinBalance = await memecoin.balanceOf(mToken0.address);
    const transactionFee = await mToken0.transactionFee();
    const reserveWeight = await mToken0.reserveWeight();
    console.log(`mToken initial total supply: ${weiToReadable(currentSupply)}`);
    console.log(`mToken initial MEM balance: ${weiToReadable(memecoinBalance)} MEM`);
    console.log(`mToken reserve weight: ${reserveWeight}`);
    console.log(`mToken transaction fee: ${transactionFee / 100}%`);
  
    for (const mToken of mTokens) {
      console.log(`mToken deployed at ${mToken.address}`);
    }
}
