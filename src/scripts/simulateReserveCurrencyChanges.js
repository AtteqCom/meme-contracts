const Memecoin = artifacts.require("Memecoin");
const MTokenInitialSetting = artifacts.require("MTokenInitialSetting");
const MTokenRegister = artifacts.require("MTokenRegister");
const MToken = artifacts.require("MToken");

const ONE_TO_WEI = web3.utils.toBN("1000000000000000000");


module.exports = async function(callback) {
  try {
    console.log("STARTING SIMULATIONS!\n\n")

    const walletAddress = (await web3.eth.getAccounts())[0];
    console.log(`Wallet: ${walletAddress}`);

    const dataSize = process.argv.length > 4? parseInt(process.argv[4]) : 100;
    const transferAmount = process.length > 5? parseInt(process.argv[5]) : 10;
    console.log(`Transfers count: ${dataSize}`)
    console.log(`Transfer amount: ${transferAmount} $MEM`)
    
    console.log("Retrieving contracts...")
    const memecoin = await Memecoin.deployed();
    console.log(`Deployed Memecoin... (${memecoin.address})`)

    const mTokenRegister = await MTokenRegister.deployed()
    console.log(`Deployed MTokenRegister... (${mTokenRegister.address})\n`)

    const mTokenInitialSetting = await MTokenInitialSetting.deployed()
    console.log(`Deployed MTokenInitialSetting... (${mTokenInitialSetting.address})\n`)

    console.log("Deploying MToken contract...")
    const creationPrice = await mTokenRegister.getCreationTotalCosts();
    await memecoin.approve(mTokenRegister.address, creationPrice);
    const mTokenNumber = Math.random();
    const mTokenResult = await mTokenRegister.createMToken(`mTestToken-${mTokenNumber}`, `MTT-${mTokenNumber}`);
    const mTokenAddress = mTokenResult.logs[2].args.mTokenContract;
    console.log(`Deployed at ${mTokenAddress}`)
    
    const mToken = await MToken.at(mTokenAddress);
    
    console.log(`Gradually sending memecoin to the mToken`)
    const data = [];

    for (let i = 0; i < dataSize; i++) {
      data.push({
        x: await memecoin.balanceOf(mToken.address),
        y: await mToken.calculateSellShareReward(ONE_TO_WEI)
      })

      await memecoin.transfer(mToken.address, web3.utils.toBN(ONE_TO_WEI.muln(transferAmount)));

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