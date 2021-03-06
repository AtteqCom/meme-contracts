// Load dependencies
const { expect, assert } = require('chai');

const helper = require('./libraries/utils.js');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

const Memecoin = artifacts.require("./Memecoin.sol");
const MasterFarm = artifacts.require("./farm/MasterFarm.sol");

const config = require('../../config');

async function logInfo(masterMeme, poolId, userAddress, meme) {

  console.log(`memePerBlock:${(await masterMeme.memePerBlock()).toString()}`);
  console.log(`BONUS_MULTIPLIER:${(await masterMeme.BONUS_MULTIPLIER()).toString()}`);
  console.log(`totalAllocPoint:${(await masterMeme.totalAllocPoint()).toString()}`);
  console.log(`Mem balance:${(await meme.balanceOf(masterMeme.address)).toString()}`);

  let pool = await masterMeme.poolInfo(poolId);
  console.log(`pool lastRewardBlock: ${pool.lastRewardBlock.toString()}`);
  console.log(`pool accMemePerShare: ${pool.accMemePerShare.toString()}`);
  console.log(`pool allocPoint:${pool.allocPoint.toString()}`);
  console.log(`pool depositFeeBP: ${pool.depositFeeBP.toString()}`);

  if (userAddress) {
    let user = await masterMeme.userInfo(poolId, userAddress);
    console.log(`user amount ${user.amount.toString()}`);
    console.log(`user reward debt: ${user.rewardDebt.toString()}`);
  }

}

contract("MasterFarmTest", accounts => {

  const [owner, rick, morty, summer, beth, jerry] = accounts;

  before(async () => {
    this.oneERC20with18decimals = (new BN(1e9)).mul(new BN(1e9)); // ten MEMs
    this.rewardsAmount = (new BN(config.MEMECOIN_INITIAL_SUPPLY)).div(new BN(1e4));

    this.rickAsFeeAddress = rick;
    this.mortyAsRewardAddress = morty;
    this.memecoin = await Memecoin.new(config.MEMECOIN_INITIAL_SUPPLY, "MemecoinTest", "MT", {from: owner});
    this.liquiditycoin = await Memecoin.new(config.MEMECOIN_INITIAL_SUPPLY, "LiquiditycoinTest", "LT", {from: owner});

    this.masterMeme = await MasterFarm.new(this.memecoin.address, this.mortyAsRewardAddress, this.rickAsFeeAddress, this.oneERC20with18decimals.div(new BN(2)), {from: owner});
    await this.memecoin.transfer(this.mortyAsRewardAddress, this.rewardsAmount, {from: owner});
    await this.memecoin.increaseAllowance(this.masterMeme.address, this.rewardsAmount, {from: this.mortyAsRewardAddress});

    await this.liquiditycoin.transfer(summer, this.rewardsAmount, {from: owner});
    await this.liquiditycoin.increaseAllowance(this.masterMeme.address, this.rewardsAmount, {from: summer});
  });

  it("Set start block", async () => {
    let blockNumber = await time.latestBlock();
    console.log(`block number: ${blockNumber}`);
    await this.masterMeme.setStartBlock(new BN(blockNumber));
    console.log(`blockNumber: ${blockNumber} | ${await this.masterMeme.startBlock()}`);
    await assert.equal(blockNumber.toString(), (await this.masterMeme.startBlock()).toString());
  });

  it("Add Liquidity pool", async () => {
    let allocationPoints = 5000;
    let lpToken = this.liquiditycoin;
    let depositFeeBP = 100; // 1%
    //console.log(`Pools: ${}`);
    await expectRevert.unspecified(this.masterMeme.poolInfo(0));
    await this.masterMeme.add(allocationPoints, lpToken.address, depositFeeBP, true);
    assert.equal((await this.masterMeme.poolInfo(0)).lpToken, lpToken.address);
  });

  it("Set new allocation points and depositFeeBP pool", async () => {
    let newAllocationPoints = 10000;
    let newDepositFeeBP = 200; // 2%

    await this.masterMeme.set(0, newAllocationPoints, newDepositFeeBP, true);
    assert.equal((await this.masterMeme.poolInfo(0)).allocPoint, newAllocationPoints);
    assert.equal((await this.masterMeme.poolInfo(0)).depositFeeBP, newDepositFeeBP);

  });

  it("Update Empty pool", async () => {
    await this.masterMeme.updatePool(0);
  });

  it("Deposit 100 LP token", async () => {
    let amountToDeposit = this.oneERC20with18decimals.mul(new BN(100));
    let expectedFee = '2000000000000000000';
    let expectedSummerAmount = '98000000000000000000';

    const { logs } =await this.masterMeme.deposit(0, amountToDeposit, {from: summer});
    //await logInfo(this.masterMeme, 0, summer, this.memecoin);

    let ricksFeeBalance = (await this.liquiditycoin.balanceOf(this.rickAsFeeAddress)).toString();
    let summersDepositInfo = await this.masterMeme.userInfo(0, summer);

    assert.equal(expectedFee, ricksFeeBalance);
    assert.equal(summersDepositInfo.amount, expectedSummerAmount);
    expectEvent.inLogs(logs, 'Deposit', { user: summer, pid: new BN(0), amount: amountToDeposit});
  });

  it("Update NOT empty Pool", async () => {
    let pool = await this.masterMeme.poolInfo(0);
    await time.advanceBlockTo(pool.lastRewardBlock.add(new BN(100)));

    await this.masterMeme.updatePool(0);

    // await logInfo(this.masterMeme, 0, summer, this.memecoin);
  });

  it("withdraw 49 LP Token", async () => {
    let summerLpBalanceOriginal = await this.liquiditycoin.balanceOf(summer);
    let amountToWithdraw = this.oneERC20with18decimals.mul(new BN(49));

    const { logs } =await this.masterMeme.withdraw(0, amountToWithdraw, {from: summer});
    let summerLpBalance = await this.liquiditycoin.balanceOf(summer);

    assert.equal(summerLpBalanceOriginal.toString(), summerLpBalance.sub(amountToWithdraw).toString());

    // await logInfo(this.masterMeme, 0, summer, this.memecoin);

    expectEvent.inLogs(logs, 'Withdraw', { user: summer, pid: new BN(0), amount: amountToWithdraw});
  });


  it("Update after withdraw", async () => {
    await this.masterMeme.updatePool(0);
    await logInfo(this.masterMeme, 0, summer, this.memecoin);
  });

  it("withdraw 49 LP Token II. (no LP in pool)", async () => {
    let summerLpBalanceOriginal = await this.liquiditycoin.balanceOf(summer);
    let amountToWithdraw = this.oneERC20with18decimals.mul(new BN(49));

    const { logs } =await this.masterMeme.withdraw(0, amountToWithdraw, {from: summer});
    let summerLpBalance = await this.liquiditycoin.balanceOf(summer);

    assert.equal(summerLpBalanceOriginal.toString(), summerLpBalance.sub(amountToWithdraw).toString());

    // await logInfo(this.masterMeme, 0, summer, this.memecoin);

    expectEvent.inLogs(logs, 'Withdraw', { user: summer, pid: new BN(0), amount: amountToWithdraw});
  });


  it("Update after withdraw II. (no LP in pool)", async () => {
    await this.masterMeme.updatePool(0);
    //await logInfo(this.masterMeme, 0, summer, this.memecoin);
  });


  it("Is pool added", async () => {
    console.log(await this.masterMeme.isPoolAdded(this.liquiditycoin.address));
    console.log(await this.masterMeme.isPoolAdded(this.memecoin.address));
  });

  it("Revert adding same liquidity pool", async () => {
    let allocationPoints = 5000;
    let lpToken = this.liquiditycoin;
    let depositFeeBP = 100; // 1%
    await expectRevert(this.masterMeme.add(allocationPoints, lpToken.address, depositFeeBP, true), 'add: pool is already added');
  });
});
