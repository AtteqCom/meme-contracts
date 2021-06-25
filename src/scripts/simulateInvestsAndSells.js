/**
 * Outputs chart data where:
 *   `x` contains transaction number
 *   `y` contains estiamted sell share reward for one mToken
 * 
 * To run the script, execute the following:
 *   `npx truffle build && npx truffle migrate --reset && npx truffle exec ./scripts/simulateInvestsAndSells.js`
 * 
 * The script will output the described data on the standard output. It is outputed in such format 
 *  that is easily interpreted by e.g. `gnuplot` tool, just put it inside the following command:
 *  `echo "<CHART_DATA>" | gnuplot -p -e 'plot "/dev/stdin" using 1:2 with lines'`
 * 
 * The script accepts 4 parameters: 
 *   - The first parameter defines how many investments shall be executed (number of datapoints in the chart), 
 *     the default value is 100
 *   - The second parameter specifies percentage of investments (as opposed to sells), the default is 70. [Be 
 *     careful with less than 50 values, because we cant drop below 0 total invested amount]
 *   - The third parameter specifies minimal investment amount in MEM, the default is 1
 *   - The fourth parameter specifies maximal investment amount in MEM, the default is 1000
 *     [The invested/sold amount is computed as a random number between the given boundaries for each tx separately]
 * 
 * Example of executing the script with parameters: `npx truffle exec ./scripts/simulateInvestsAndSells.js 1000 75 10 250`.
 *  The parameters order cannot be changed, sorry :(
 * 
 * NOTE: all the values on outputs and inputs are *not* in wei.
 */
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
    const mTokenResult = await mTokenRegister.createMToken("mTestToken", "MTT");
    const mTokenAddress = mTokenResult.logs[2].args.mTokenContract;
    console.log(`Deployed at ${mTokenAddress}`)
    const mToken = await MToken.at(mTokenAddress);
    
    console.log(`Simulating transactions...`)
    const data = [];

    for (let i = 0; i < dataSize; i++) {
      data.push({
        x: i,
        y: await mToken.calculateSellShareReward(ONE_TO_WEI)
      })

      const isInvest = Math.random() <= investmentTxPercentage;
      if (isInvest) {
        const investedAmount = Math.floor(Math.random() * (maxInvestmentAmount - minInvestmentAmount) + minInvestmentAmount);
        const investedAmountWei = web3.utils.toBN(ONE_TO_WEI.muln(investedAmount));
        await memecoin.approve(mToken.address, investedAmountWei);

        await mToken.invest(investedAmountWei, web3.utils.toBN('0'))
      } else {
        const soldPercentage = Math.floor(Math.random() * 10000);
        const soldAmount = (await mToken.balanceOf(walletAddress)).muln(soldPercentage).divn(10000);

        await mToken.sellShare(soldAmount, web3.utils.toBN('0'))
      }
      if (i % 50 == 0) {
        console.log(`Simulated ${i} steps...`);
      }
    }

    console.log("Printing chart data:")
    for (let i = 0; i < data.length; i++) {
      console.log(`${data[i].x} ${weiToReadable(data[i].y)}`)
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