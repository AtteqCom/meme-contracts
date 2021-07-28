const csvFormat = require('@fast-csv/format');

const Memecoin = artifacts.require("Memecoin");
const MTokenRegister = artifacts.require("MTokenRegister");
const MToken = artifacts.require("MToken");
const ONE_TO_WEI = web3.utils.toBN("1000000000000000000");

const INVESTMENTS_IN_M_TOKEN_BOUNDARIES = [0, 1, 10000, 75000, 100000, 130000, 260000];

module.exports = async function(callback) {
  try {
    console.log("STARTING SIMULATIONS!\n\n")

    const outputCsvFile = process.argv[4];
    
    const admin = (await web3.eth.getAccounts())[0];
    const investor = (await web3.eth.getAccounts())[1];

    const memecoin = await Memecoin.deployed();
    const mTokenRegister = await MTokenRegister.deployed();
    const mToken = await deployMToken(memecoin, mTokenRegister, `doge-${Date.now()}`, `doge-${Date.now()}`);
    const adminMemWeiBalance = await memecoin.balanceOf(admin);

    // just to be sure we transfer little more than required
    const safeMemAmount = 2 * INVESTMENTS_IN_M_TOKEN_BOUNDARIES[INVESTMENTS_IN_M_TOKEN_BOUNDARIES.length - 1];
    await transferMemFromAdmin(memecoin, investor, safeMemAmount);

    const investorMemWeiBalance = await memecoin.balanceOf(investor);
    console.log(`Admin: ${admin} - balance ${weiToReadable(adminMemWeiBalance)} MEM\nInvestor: ${investor} - balance ${weiToReadable(investorMemWeiBalance)} MEM`);

    const investments = INVESTMENTS_IN_M_TOKEN_BOUNDARIES;
    const data = [];
    let totalInvestment = 0;
    for (let i = 0; i < investments.length; i++) {
      let currentInvestment = i === 0 ? investments[0] : investments[i] - investments[i - 1];
      if (currentInvestment > 0) {
        await buyMTokens(memecoin, mToken, investor, currentInvestment);
      }
      totalInvestment += currentInvestment;

      const mTokenSupplyWei = await mToken.totalSupply();
      const mTokenMemWeiBalance = await memecoin.balanceOf(mToken.address);
      const oneMTokenSellPriceMemWei = await estimateSellShare(mToken, ONE_TO_WEI);
      const oneMTokenWeiSellPriceMemWei = await estimateSellShare(mToken, 1);

      data.push({
        'total_investment_in_MEM': totalInvestment,
        'm_token_total_supply': weiToReadable(mTokenSupplyWei),
        'm_token_sell_price_in_MEM': weiToReadable(oneMTokenSellPriceMemWei),
        'm_token_reserve_token_supply': weiToReadable(mTokenMemWeiBalance),
        'm_token_wei_sell_price_in_MEM_wei': oneMTokenWeiSellPriceMemWei.toString(),
      });
    }

    await writeToCsvFile(outputCsvFile, data, ['total_investment_in_MEM', 'm_token_total_supply', 'm_token_sell_price_in_MEM']);

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

const buyMTokens = async (memecoin, mToken, investor, memAmount) => {
  const investedAmountWei = ONE_TO_WEI.muln(memAmount);
  await memecoin.approve(mToken.address, investedAmountWei, {from: investor});
  const result = await mToken.buy(investedAmountWei, 1, {from: investor});

  const buyLog = result.logs[5].args;
  const gainedMTokens = buyLog.gainedAmountOfMTokens;

  return gainedMTokens;
}

const deployMToken = async (memecoin, mTokenRegister, name, symbol) => {
  // console.log("Deploying MToken contract...")
  const creationPrice = await mTokenRegister.getCreationTotalCosts();
  await memecoin.approve(mTokenRegister.address, creationPrice);

  const mTokenResult = await mTokenRegister.createMToken(name, symbol);
  const mTokenAddress = mTokenResult.logs[2].args.mTokenContract;
  // console.log(`Deployed at ${mTokenAddress}`)
  const mToken = await MToken.at(mTokenAddress);

  return mToken;
}

const estimateSellShare = async (mToken, mTokenWeiAmount) => {
  const memWeiValue = await mToken.calculateSellShareReward(mTokenWeiAmount);
  return memWeiValue;
}

const transferMemFromAdmin = async (memecoin, to, memAmount) => {
  const memAmountWei = ONE_TO_WEI.muln(memAmount);
  await memecoin.transfer(to, memAmountWei);
}

const writeToCsvFile = async (filePath, data, columnsToOutput = null) => {
  columnsToOutput = columnsToOutput !== null ? columnsToOutput : data[0].keys();
  let outputRows = data.map(item => {
        return columnsToOutput.map(columnName => item[columnName]);
      });
  // add column names as a first row
  outputRows.unshift(columnsToOutput);

  const writeableStream = csvFormat.writeToPath(filePath, outputRows, {headers: true});
  return streamToPromise(writeableStream);
}

const streamToPromise = async (writeableStream) => {
  return new Promise((resolve, reject) => {
    writeableStream
    .on('error', err => reject(err))
    .on('finish', () => resolve(true));
  })
}
