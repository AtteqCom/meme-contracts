/**
 * Outputs chart data where:
 *   `x` contains totalSupply
 *   `y` contains estiamted sell share reward for one mToken
 * 
 * To run the script, execute the following:
 *   `npx truffle build && npx truffle migrate --reset && npx truffle exec ./scripts/simulateInvestsOnly.js`
 * 
 * The script will output the described data on the standard output. It is outputed in such format 
 *  that is easily interpreted by e.g. `gnuplot` tool, just put it inside the following command:
 *  `echo "<CHART_DATA>" | gnuplot -p -e 'plot "/dev/stdin" using 1:2 with lines'`
 * 
 * The script accepts 2 parameters: 
 *   - The first parameter defines how many investments shall be executed  (number of datapoints in the chart), 
 *     the default value is 100
 *   - The second parameter specifies how much MEM is invested in each step (the default is 100)
 *  
 * Example of executing the script with parameters: `npx truffle exec ./scripts/simulateInvestsOnly.js 1000 10`.
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
    const mTokenResult = await mTokenRegister.createMToken("mTestToken", "MTT");
    const mTokenAddress = mTokenResult.logs[2].args.mTokenContract;
    console.log(`Deployed at ${mTokenAddress}`)
    const mToken = await MToken.at(mTokenAddress);


    console.log(`Simulating invests...`)
    const data = [];
    const investAmountInStep = ONE_TO_WEI.muln(investmentPerStep);
    await memecoin.approve(mToken.address, web3.utils.toBN(ONE_TO_WEI.muln(dataSize).muln(investAmountInStep).muln(100)));

    for (let i = 0; i < dataSize; i++) {
      data.push({
        x: (await mToken.totalSupply()),
        // x: investAmountInStep.muln(i),
        // y: await mToken.calculateInvestReward(ONE_TO_WEI)
        y: await mToken.calculateSellShareReward(ONE_TO_WEI)
      })

      await mToken.invest(investAmountInStep, web3.utils.toBN('0'))
      if (i % 50 == 0) {
        console.log(`Simulated ${i} steps...`);
      }
    }

    console.log("Printing chart data:")
    for (let i = 0; i < data.length; i++) {
      console.log(`${weiToReadable(data[i].x)} ${weiToReadable(data[i].y)}`)
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