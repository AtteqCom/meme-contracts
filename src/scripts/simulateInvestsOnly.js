const Memecoin = artifacts.require("Memecoin");
const MTokenRegister = artifacts.require("MTokenRegister");
const MToken = artifacts.require("MToken");

const ONE_TO_WEI = web3.utils.toBN("1000000000000000000");


module.exports = async function(callback) {
  try {
    console.log("STARTING SIMULATIONS!\n\n")

    const dataSize = process.argv.length > 4? parseInt(process.argv[4]) : 100;
    const investmentPerStep = process.argv.length > 5? parseInt(process.argv[5]) : 100;
    console.log(`Data size: ${dataSize}`)
    console.log(`Investment per step: ${investmentPerStep} $MEM`)
    
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


    console.log(`Simulating invests...`)
    const data = [];
    const investAmountInStep = ONE_TO_WEI.muln(investmentPerStep);
    await memecoin.approve(mToken.address, web3.utils.toBN(investAmountInStep.muln(dataSize)));
    let lastAveragePrice = web3.utils.toBN(0);

    for (let i = 0; i < dataSize; i++) {
      data.push({
        x: (await mToken.totalSupply()),
        // x: investAmountInStep.muln(i),
        // y: await mToken.calculateInvestReward(ONE_TO_WEI)
        y_contract: await mToken.calculateSellShareReward(ONE_TO_WEI),
        y_average: lastAveragePrice,
      })

      const result = await mToken.invest(investAmountInStep, web3.utils.toBN('0'))
      if (i % 50 == 0) {
        console.log(`Simulated ${i} steps...`);
      }

      const investLog = result.logs[5].args;
      const totalPrice = investLog.investmentInReserveCurrency.add(investLog.feeInReserveCurrency);
      const averagePriceInWei = totalPrice.div(investLog.gainedAmountOfMTokens);
      lastAveragePrice = averagePriceInWei.mul(ONE_TO_WEI);
    }

    console.log("Printing chart data:")
    for (let i = 0; i < data.length; i++) {
      console.log(`${weiToReadable(data[i].x)} ${weiToReadable(data[i].y_contract)} ${weiToReadable(data[i].y_average)}`)
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