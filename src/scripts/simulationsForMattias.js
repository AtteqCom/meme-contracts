/*
Simulations of these scenarios:

a) what happens to a person that invests 1000 MEM when started and when 130k is invested. 
b) what happens to a person that invests 1000 MEM after 130k invested and the number of invested goes down to 100k and 75k. 
c) what happens to a person that invests 1000 MEM after 130k invested and the number of invested goes up to 200k and 260k.
*/

const Memecoin = artifacts.require("Memecoin");
const MTokenRegister = artifacts.require("MTokenRegister");
const MToken = artifacts.require("MToken");

const ONE_TO_WEI = web3.utils.toBN("1000000000000000000");


module.exports = async function(callback) {
  try {
    console.log("STARTING SIMULATIONS!\n\n")

    const admin = (await web3.eth.getAccounts())[0];
    const investor = (await web3.eth.getAccounts())[1];
    console.log(`Admin: ${admin}\nInvestor: ${investor}`);

    const memecoin = await Memecoin.deployed();
    const mTokenRegister = await MTokenRegister.deployed();

    await transferMemFromAdmin(memecoin, investor, 5000);
    await mTokenSummaryAfterCreation(memecoin, mTokenRegister);

    await simulationA(memecoin, mTokenRegister, admin, investor);
    await simulationB(memecoin, mTokenRegister, admin, investor);
    await simulationC(memecoin, mTokenRegister, admin, investor);

    callback();
  } catch (e) {
    console.error("ERROR :(")
    console.error(e);
    callback(e);
  }
}

weiToReadable = (weiValue) => {
  if (weiValue.toString() == '0') {
    return 0;
  }

  const a = weiValue.div(ONE_TO_WEI.divn(1000));
  const b = parseFloat(a.toString());

  return b / 1000;
}

transferMemFromAdmin = async (memecoin, to, memAmount) => {
  const memAmountWei = ONE_TO_WEI.muln(memAmount);
  await memecoin.transfer(to, memAmountWei);
}

const buyMTokens = async (memecoin, mToken, investor, memAmount) => {
  const investedAmountWei = ONE_TO_WEI.muln(memAmount);
  await memecoin.approve(mToken.address, investedAmountWei, {from: investor});
  const result = await mToken.buy(investedAmountWei, 1, {from: investor});

  const buyLog = result.logs[5].args;
  const gainedMTokens = buyLog.gainedAmountOfMTokens;

  return gainedMTokens;
}

const sellShare = async (mToken, investor, mTokenWeiAmount) => {
  await mToken.sellShare(mTokenWeiAmount, 1, {from: investor});
}

const estimateSellShare = async (mToken, mTokenWeiAmount) => {
  const memWeiValue = await mToken.calculateSellShareReward(mTokenWeiAmount);
  return memWeiValue;
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

const simulationA = async (memecoin, mTokenRegister, admin, investor) => {
  const mToken = await deployMToken(memecoin, mTokenRegister, `simulation-A-${Date.now()}`, `xsa-${Date.now()}`);

  const gainedMTokensAtStart = await buyMTokens(memecoin, mToken, investor, 1000);
  await buyMTokens(memecoin, mToken, admin, 130000);
  const gainedMTokensAfter130k = await buyMTokens(memecoin, mToken, investor, 1000);
  console.log(
`
\n\nSIMULATION A - what happens to a person that invests 1000 MEM when started and when 130k is invested.

Gained mTokens at start: ${weiToReadable(gainedMTokensAtStart)}
Gained mTokens after 130k: ${weiToReadable(gainedMTokensAfter130k)}
`);

}

const simulationB = async (memecoin, mTokenRegister, admin, investor) => {
  const mToken = await deployMToken(memecoin, mTokenRegister, `simulation-B-${Date.now()}`, `xsb-${Date.now()}`);

  await buyMTokens(memecoin, mToken, admin, 75000);
  const from75kTo100kGainedMTokens = await buyMTokens(memecoin, mToken, admin, 25000);
  const from100kTo130kGainedMTokens = await buyMTokens(memecoin, mToken, admin, 30000);
  const investorMTokens = await buyMTokens(memecoin, mToken, investor, 1000);

  const memWeiValueAfterInvestment = await estimateSellShare(mToken, investorMTokens);
  const balanceAfter131kInvestment = await memecoin.balanceOf(mToken.address);
  await sellShare(mToken, admin, from100kTo130kGainedMTokens.add(investorMTokens));
  const balanceAfterWithdrawalTo100k = await memecoin.balanceOf(mToken.address);
  const memWeivalueAt100k = await estimateSellShare(mToken, investorMTokens)

  await sellShare(mToken, admin, from75kTo100kGainedMTokens);
  const balanceAfterWithdrawalTo75k = await memecoin.balanceOf(mToken.address);
  const memWeivalueAt75k = await estimateSellShare(mToken, investorMTokens);

  console.log(
`
\nSIMULATION B - what happens to a person that invests 1000 MEM after 130k invested and the number of invested goes down to 100k and 75k.

Gained mToken amount: ${weiToReadable(investorMTokens)}
Investment value at 130k (right after purchase): ${weiToReadable(memWeiValueAfterInvestment)} MEM
Investment value at 100k: ${weiToReadable(memWeivalueAt100k)} MEM
Investment value at 75k: ${weiToReadable(memWeivalueAt75k)} MEM
`);

//   console.log(`
//   mToken MEM balance after 131k investments: ${weiToReadable(balanceAfter131kInvestment)} MEM
//   mToken MEM balance after withdrawal to 100k: ${weiToReadable(balanceAfterWithdrawalTo100k)} MEM
//   mToken MEM balance after withdrawal to 75k: ${weiToReadable(balanceAfterWithdrawalTo75k)} MEM
// `);
}

const simulationC = async (memecoin, mTokenRegister, admin, investor) => {
  const mToken = await deployMToken(memecoin, mTokenRegister, `simulation-C-${Date.now()}`, `xsc-${Date.now()}`);

  await buyMTokens(memecoin, mToken, admin, 130000);
  const investorMTokens = await buyMTokens(memecoin, mToken, investor, 1000);
  const memWeiValueAfterInvestment = await estimateSellShare(mToken, investorMTokens);
  const balanceAfter131kInvestment = await memecoin.balanceOf(mToken.address);

  await buyMTokens(memecoin, mToken, admin, 69000);
  const memWeivalueAt200k = await estimateSellShare(mToken, investorMTokens)
  const balanceAfter200kInvestment = await memecoin.balanceOf(mToken.address);

  await buyMTokens(memecoin, mToken, admin, 60000);
  const memWeivalueAt260k = await estimateSellShare(mToken, investorMTokens)
  const balanceAfter260kInvestment = await memecoin.balanceOf(mToken.address);

  console.log(
`
\nSIMULATION C - what happens to a person that invests 1000 MEM after 130k invested and the number of invested goes up to 200k and 260k.

Gained mToken amount: ${weiToReadable(investorMTokens)}
Investment value at 131k (right after purchase): ${weiToReadable(memWeiValueAfterInvestment)} MEM
Investment value at 200k: ${weiToReadable(memWeivalueAt200k)} MEM
Investment value at 260k: ${weiToReadable(memWeivalueAt260k)} MEM
`);

// console.log(`
// mToken MEM balance after 131k investments: ${weiToReadable(balanceAfter131kInvestment)} MEM
// mToken MEM balance after 200k investments: ${weiToReadable(balanceAfter200kInvestment)} MEM
// mToken MEM balance after 260k investments: ${weiToReadable(balanceAfter260kInvestment)} MEM
// `);

}

const mTokenSummaryAfterCreation = async (memecoin, mTokenRegister) => {
  const mToken = await deployMToken(memecoin, mTokenRegister, `doge-${Date.now()}`, `xgd-${Date.now()}`);

  const currentSupply = await mToken.totalSupply();
  const memecoinBalance = await memecoin.balanceOf(mToken.address);
  const transactionFee = await mToken.transactionFee();
  const reserveWeight = await mToken.reserveWeight();
  console.log(`mToken initial total supply: ${weiToReadable(currentSupply)}`);
  console.log(`mToken initial MEM balance: ${weiToReadable(memecoinBalance)} MEM`);
  console.log(`mToken reserve weight: ${reserveWeight}`);
  console.log(`mToken transaction fee: ${transactionFee / 100}%`);
}
