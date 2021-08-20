// Load dependencies
const { expect, assert } = require('chai');

const helper = require('./libraries/utils.js');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

const Memecoin = artifacts.require("./Memecoin.sol");
const MasterFarm = artifacts.require("./farm/MasterFarm.sol");

const config = require('../../config');

const ERC20_18_DECIMALS = (new BN(1e9)).mul(new BN(1e9)); // 1 MEM/ 1 ETH / 1 MATIC
const ERC20_9_DECIMAL  = new BN(1e9); // 1 gwei

function bnToIntHelper(_numberBN) {
  let bnAsString = _numberBN.toString();
  return bnAsString == 'num.isZero' ? 0 : parseInt(bnAsString);
}

async function logInfo(message, masterMeme, poolId, userAddress, meme) {

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(`${message}`);
  console.log(`-----------------------`);
  console.log(`BLOCK:............................ ${await time.latestBlock()}`);
  console.log(`-----------------------`);
  console.log(`Total Allocation Points:.......... ${(await masterMeme.totalAllocPoint()).toString()}`);
  console.log(`Mems earned per block:............ ${(await masterMeme.memePerBlock()).toString()}`);
  console.log(`Bonus multiplier:................. ${(await masterMeme.bonusMultiplier()).toString()}`);
  console.log(`Mems on Farm contract:............ ${(await meme.balanceOf(masterMeme.address)).toString()}`);
  console.log(`-----------------------`);
  let pool = await masterMeme.poolInfo(poolId);
  console.log(`POOL - Last block of Mems distribution:.... ${pool.lastRewardBlock.toString()}`);
  console.log(`POOL - Accumulated Mems per share:......... ${pool.accMemePerShare.toString()}`);
  console.log(`POOL Setting - Allocation points:.................. ${pool.allocPoint.toString()}`);
  console.log(`POOL Setting - Deposit fee basis points:........... ${pool.depositFeeBP.toString()}`);
  console.log(`-----------------------`);
  if (userAddress) {
    let user = await masterMeme.userInfo(poolId, userAddress);
    console.log(`USER - amount deposited:............ ${user.amount.toString()}`);
    console.log(`USER - reward debt:................. ${user.rewardDebt.toString()}`);
    console.log(`USER - pending in gweis:`);
    let userAmountGweis = bnToIntHelper(user.amount.div(ERC20_9_DECIMAL));
    let userAccMemePerShare = 0;//bnToIntHelper(new BN(pool.accMemePerShare.toString()).div(1e12)) / 9;
    let userRewardDebt = bnToIntHelper(user.rewardDebt.div(ERC20_9_DECIMAL));

    console.log(`userAmountGweis * userAccMemePerShare - userRewardDebt`);
    console.log(`${userAmountGweis} * ${userAccMemePerShare} - ${userRewardDebt} = ${userAmountGweis * userAccMemePerShare - userRewardDebt}`);
  }
  console.log(`-----------------------`);
  console.log(``);

}



contract("MasterFarmTest", accounts => {

  const [owner, rick, morty, summer, beth, jerry] = accounts;

  before(async () => {
    this.rewardsAmount = (new BN(config.MEMECOIN_INITIAL_SUPPLY)).div(new BN(1e4));

    this.rickAsFeeAddress = rick;
    this.mortyAsRewardAddress = morty;
    this.memecoin = await Memecoin.new(config.MEMECOIN_INITIAL_SUPPLY, "MemecoinTest", "MT", {from: owner});
    this.liquiditycoin = await Memecoin.new(config.MEMECOIN_INITIAL_SUPPLY, "LiquiditycoinTest", "LT", {from: owner});

    this.masterMeme = await MasterFarm.new(this.memecoin.address, this.mortyAsRewardAddress, this.rickAsFeeAddress, ERC20_18_DECIMALS.div(new BN(2)), {from: owner});
    await this.memecoin.transfer(this.mortyAsRewardAddress, this.rewardsAmount, {from: owner});
    await this.memecoin.increaseAllowance(this.masterMeme.address, this.rewardsAmount, {from: this.mortyAsRewardAddress});

    await this.liquiditycoin.transfer(summer, this.rewardsAmount, {from: owner});
    await this.liquiditycoin.increaseAllowance(this.masterMeme.address, this.rewardsAmount, {from: summer});
  });

  it("Set start block", async () => {
    let blockNumber = await time.latestBlock();
    await this.masterMeme.setStartBlock(new BN(blockNumber));
    await assert.equal(blockNumber.toString(), (await this.masterMeme.startBlock()).toString());
  });

  it("Add Liquidity pool", async () => {
    let allocationPoints = 5000;
    let lpToken = this.liquiditycoin;
    let depositFeeBP = 100; // 1%
    //console.log(`Pools: ${}`);
    await expectRevert.unspecified(this.masterMeme.poolInfo(0));
    await this.masterMeme.add(allocationPoints, lpToken.address, depositFeeBP);
    assert.equal((await this.masterMeme.poolInfo(0)).lpToken, lpToken.address);
  });

  it("Set new allocation points and depositFeeBP pool", async () => {
    let newAllocationPoints = 10000;
    let newDepositFeeBP = 200; // 2%

    await this.masterMeme.set(0, newAllocationPoints, newDepositFeeBP);
    assert.equal((await this.masterMeme.poolInfo(0)).allocPoint, newAllocationPoints);
    assert.equal((await this.masterMeme.poolInfo(0)).depositFeeBP, newDepositFeeBP);

  });

  it("Update Empty pool", async () => {
    await this.masterMeme.updatePool(0);
  });

  it("Deposit 100 LP token", async () => {
    let amountToDeposit = ERC20_18_DECIMALS.mul(new BN(100));
    let expectedFee = '2000000000000000000';
    let expectedSummerAmount = '98000000000000000000';

    const { logs } =await this.masterMeme.deposit(0, amountToDeposit, {from: summer});
    // await logInfo(`After Deposit`, this.masterMeme, 0, summer, this.memecoin);

    let ricksFeeBalance = (await this.liquiditycoin.balanceOf(this.rickAsFeeAddress)).toString();
    let summersDepositInfo = await this.masterMeme.userInfo(0, summer);

    assert.equal(expectedFee, ricksFeeBalance);
    assert.equal(summersDepositInfo.amount, expectedSummerAmount);
    expectEvent.inLogs(logs, 'Deposit', { user: summer, pid: new BN(0), amount: amountToDeposit});
  });

  it("withdraw 49 LP Token After 100 blocks", async () => {
    let pool = await this.masterMeme.poolInfo(0);
    await time.advanceBlockTo(pool.lastRewardBlock.add(new BN(100)));
    await this.masterMeme.updatePool(0);
    // await logInfo(`Before Withdraw`, this.masterMeme, 0, summer, this.memecoin);

    let summerLpBalanceOriginal = await this.liquiditycoin.balanceOf(summer);
    let amountToWithdraw = ERC20_18_DECIMALS.mul(new BN(40));

    const { logs } = await this.masterMeme.withdraw(0, amountToWithdraw.toString(), {from: summer});
    let summerLpBalance = await this.liquiditycoin.balanceOf(summer);

    assert.equal(summerLpBalanceOriginal.toString(), summerLpBalance.sub(amountToWithdraw).toString());
    expectEvent.inLogs(logs, 'Withdraw', { user: summer, pid: new BN(0), amount: amountToWithdraw});
  });

  it("withdraw 49 LP Token II. (no LP in pool) after 200blocks", async () => {
    let pool = await this.masterMeme.poolInfo(0);
    await time.advanceBlockTo(pool.lastRewardBlock.add(new BN(100)));
    await this.masterMeme.updatePool(0);
    // await logInfo(`Before Withdraw`,this.masterMeme, 0, summer, this.memecoin);

    let summerLpBalanceOriginal = await this.liquiditycoin.balanceOf(summer);
    let amountToWithdraw = ERC20_18_DECIMALS.mul(new BN(58));

    const { logs } = await this.masterMeme.withdraw(0, amountToWithdraw.toString(), {from: summer});
    let summerLpBalance = await this.liquiditycoin.balanceOf(summer);

    assert.equal(summerLpBalanceOriginal.toString(), summerLpBalance.sub(amountToWithdraw).toString());

    // await logInfo(`After Withdraw`, this.masterMeme, 0, summer, this.memecoin);
  });

  it("Revert adding same liquidity pool", async () => {
    let allocationPoints = 5000;
    let lpToken = this.liquiditycoin;
    let depositFeeBP = 100; // 1%
    await expectRevert(this.masterMeme.add(allocationPoints, lpToken.address, depositFeeBP), 'add: pool is already added');
  });
});
