const Memecoin = artifacts.require("Memecoin");
const MTokenRegister = artifacts.require("MTokenRegister");
const MToken = artifacts.require("MToken");

const ONE_TO_WEI = web3.utils.toBN("1000000000000000000");


module.exports = async function(callback) {
  try {
    console.log("STARTING SIMULATIONS!\n\n")

    const walletAddress = (await web3.eth.getAccounts())[0];
    console.log(`Wallet: ${walletAddress}`);

    const dataSize = process.argv.length > 4? parseInt(process.argv[4]) : 100;
    const investmentTxPercentage = process.argv.length > 5? parseInt(process.argv[5]) / 100 : 0.7;
    const minInvestmentAmount = process.argv.length > 6? parseInt(process.argv[6]) : 1;
    const maxInvestmentAmount = process.argv.length > 7? parseInt(process.argv[7]) : 1000;
    console.log(`Data size: ${dataSize}`)
    console.log(`Investment tx percentage: ${investmentTxPercentage*100}%`)
    console.log(`Minimal invested amount: ${minInvestmentAmount} $MEM`)
    console.log(`Maximal invested amount: ${maxInvestmentAmount} $MEM`)
    
    console.log("Retrieving contracts...")
    const memecoin = await Memecoin.deployed();
    console.log(`Deployed Memecoin... (${memecoin.address})`)

    const mTokenRegister = await MTokenRegister.deployed()
    console.log(`Deployed MTokenRegister... (${mTokenRegister.address})\n`)


    console.log("Deploying MToken contract...")
    const creationPrice = await mTokenRegister.getCreationTotalCosts();
    await memecoin.approve(mTokenRegister.address, creationPrice);
    const mTokenNumber = Math.random();
    const mTokenResult = await mTokenRegister.createMToken(`mTestToken-${mTokenNumber}`, `MTT-${mTokenNumber}`);
    const mTokenAddress = mTokenResult.logs[2].args.mTokenContract;
    console.log(`Deployed at ${mTokenAddress}`)
    const mToken = await MToken.at(mTokenAddress);
    
    console.log(`Simulating transactions...`)
    const data = [];
    let lastAveragePrice = web3.utils.toBN(0);

    for (let i = 0; i < dataSize; i++) {
      data.push({
        x: i,
        y_contract: await mToken.calculateSellShareReward(ONE_TO_WEI),
        y_average: lastAveragePrice,
      })

      const isInvest = Math.random() <= investmentTxPercentage;
      if (isInvest) {
        const investedAmount = Math.floor(Math.random() * (maxInvestmentAmount - minInvestmentAmount) + minInvestmentAmount);
        const investedAmountWei = web3.utils.toBN(ONE_TO_WEI.muln(investedAmount));
        await memecoin.approve(mToken.address, investedAmountWei);

        const result = await mToken.invest(investedAmountWei, web3.utils.toBN('0'))

        const investLog = result.logs[5].args;
        const totalPrice = investLog.investmentInReserveCurrency.add(investLog.feeInReserveCurrency);
        const averagePriceInWei = totalPrice.div(investLog.gainedAmountOfMTokens);
        lastAveragePrice = averagePriceInWei.mul(ONE_TO_WEI);
      } else {
        const soldPercentage = Math.floor(Math.random() * 10000);
        const soldAmount = (await mToken.balanceOf(walletAddress)).muln(soldPercentage).divn(10000);

        const result = await mToken.sellShare(soldAmount, web3.utils.toBN('0'))

        const investLog = result.logs[3].args;
        const totalPrice = investLog.revenueInReserveCurrency.add(investLog.feeInReserveCurrency);
        const averagePriceInWei = totalPrice.div(investLog.amountSoldOfMTokens);
        lastAveragePrice = averagePriceInWei.mul(ONE_TO_WEI);
      }
      if (i % 50 == 0) {
        console.log(`Simulated ${i} steps...`);
      }
    }

    console.log("Printing chart data:")
    for (let i = 0; i < data.length; i++) {
      console.log(`${data[i].x} ${weiToReadable(data[i].y_contract)} ${weiToReadable(data[i].y_average)}`)
    }

    console.log("To create chart, copy the output after `printing chart data` statement into the <CHART_DATA> in the following command")
    console.log(`echo "<CHART_DATA>" | gnuplot -p -e 'plot "/dev/stdin" using 1:2 with lines'`)
    callback();
  } catch (e) {
    console.error("ERROR :(")
    callback(e);
  }
}

toWei = (value) => {
  return `${value}${'0'.repeat(18)}`
}

weiToReadable = (weiValue) => {
  if (weiValue.toString() == '0') {
    return 0;
  }

  const a = weiValue.div(ONE_TO_WEI.divn(1000));
  const b = parseFloat(a.toString());

  return b / 1000;
}