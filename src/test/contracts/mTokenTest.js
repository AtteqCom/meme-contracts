const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const Memecoin = artifacts.require("./Memecoin.sol");
const MToken = artifacts.require("./MToken.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");


const TOKEN_NAME = "TEST TOKEN";
const TOKEN_SYMBOL = "TEST SYMBOL";

const MORTYs_1ST_INVESTMENT = new BN(1e6);
const SECOND_FEE = 500;

contract("MTokenTest", accounts => {

  const [owner, rickAsMTokenOwner, mortyAsInvestor, summerAsInvestorWithoutAllowance, bethAsInvestorWithoutReserveCurrency, jerryAsLoser] = accounts;

  before(async () => {
    this.mToken = null;

    const MEMECOUN_INITIAL_SUPPLY = '100000000000000000000000000'; // 1e8 * 1e18
    this.memecoin = await Memecoin.new(new BN(MEMECOUN_INITIAL_SUPPLY), "Memecoin", "mCoin", {from: owner});

    this.memecoin.transfer(mortyAsInvestor, new BN(1e13), {from: owner});
    this.memecoin.transfer(summerAsInvestorWithoutAllowance, new BN(1e10), {from: owner});
    this.memecoin.transfer(jerryAsLoser, new BN(1e3), {from: owner});

    this.mTokenInitialSetting = await MTokenInitialSetting.deployed();

    this.mTokenSetting = await this.mTokenInitialSetting.getMTokenInitialSetting(); 

    this.bancor = await BancorFormula.new();
    await this.bancor.init();
  });

  it("Create MToken", async () => {

    this.mToken = await MToken.new(
      rickAsMTokenOwner,
      this.mTokenSetting.initialSupply,
      TOKEN_NAME,
      TOKEN_SYMBOL,
      this.memecoin.address,
      this.mTokenSetting.reserveCurrencyWeight,
      this.mTokenSetting.fee,
      this.mTokenSetting.feeLimit,
      this.bancor.address, {from: owner}
    );

    assert.equal(await this.mToken.name(), TOKEN_NAME);
    assert.equal(await this.mToken.symbol(), TOKEN_SYMBOL);
    assert(await this.mToken.totalSupply() > 0);
    assert.equal((await this.mToken.totalSupply()).toString(), this.mTokenSetting.initialSupply.toString());
  });

  describe("MToken behavior", () => {
    before(async () => {
      // important to set up reserve balance above 0!!!!
      this.memecoin.transfer(this.mToken.address, new BN(1), { from: owner });

      this.memecoin.increaseAllowance(this.mToken.address, new BN(1e13), { from: mortyAsInvestor });
      this.memecoin.increaseAllowance(this.mToken.address, new BN(1e3), {from: jerryAsLoser});

      this.rickAsMTokenOwnerBalanceBeforeTest = await this.memecoin.balanceOf(rickAsMTokenOwner);
      this.correctIvestedFee = await this.mToken.computeFee(MORTYs_1ST_INVESTMENT);
    });

    it("Check owner", async () => {
      assert.equal(await this.mToken.owner(), rickAsMTokenOwner);
    });
  
    it("Revert investment by low allowance", async () => {
      let summersInvestment = new BN(1e8);
      let minimumExpectedInvestment = await this.mToken.calculateInvestReward(summersInvestment);
      await expectRevert(this.mToken.invest(summersInvestment, minimumExpectedInvestment, {from: summerAsInvestorWithoutAllowance}), "ERC20: transfer amount exceeds allowance.");
    });
  
    it("Revert investment by low balance", async () => {
      let bethInvestment = new BN(1e8);
      let minimumExpectedInvestment = await this.mToken.calculateInvestReward(bethInvestment);
      await expectRevert(this.mToken.invest(bethInvestment, minimumExpectedInvestment, {from: bethAsInvestorWithoutReserveCurrency}), "ERC20: transfer amount exceeds balance");
    });

    it("Revert investment by not met required minimum", async () => {
      let minimumExpectedInvestment = await this.mToken.calculateInvestReward(MORTYs_1ST_INVESTMENT);
      await expectRevert(this.mToken.invest(MORTYs_1ST_INVESTMENT, minimumExpectedInvestment.add(new BN(1e3)), {from: mortyAsInvestor}), "ERROR_MINIMUM_INVESTMENT_TARGET_AMOUNT_NOT_MET");
    });
  
    it("Invest", async () => {
      let minimumExpectedInvestment = await this.mToken.calculateInvestReward(MORTYs_1ST_INVESTMENT);
      let { logs } = await this.mToken.invest(MORTYs_1ST_INVESTMENT, minimumExpectedInvestment, {from: mortyAsInvestor});
      expectEvent.inLogs(logs, 'Invested', { investor: mortyAsInvestor});
    });
  
    it("Check fee from investment", async () => {
      assert.equal((this.rickAsMTokenOwnerBalanceBeforeTest.add(this.correctIvestedFee)).toString(), await this.memecoin.balanceOf(rickAsMTokenOwner));
    });

    it("Revert few above limit", async () => {
      await expectRevert(this.mToken.setTransactionFee(60000, {from: rickAsMTokenOwner}), "ERROR_FEE_IS_ABOVE_LIMIT");
    });
  
    it("Set new fee", async () => {
      let { logs } = await this.mToken.setTransactionFee(SECOND_FEE, {from: rickAsMTokenOwner});
      expectEvent.inLogs(logs, 'TransactionFeeChanged', { newFee: SECOND_FEE.toString()});
    });

    it("Revert sale by not met required minimum of gainned reserve currncy amount", async () => {
      let mTokenToSell = new BN(1e3);
      let minimumExpectedGain = await this.mToken.calculateSellShareReward(mTokenToSell);
      await expectRevert(this.mToken.sellShare(mTokenToSell, minimumExpectedGain.add(new BN(1e2)), {from: mortyAsInvestor}), "ERROR_MINIMUM_SALE_TARGET_AMOUNT_NOT_MET");
    });
  
    it("Sell share", async () => {
      let mTokenToSell = new BN(1e3);
      let currentBalance = await this.memecoin.balanceOf(mortyAsInvestor);
      let currentMTokenBalance = await this.mToken.balanceOf(mortyAsInvestor);
      let expectedReserveCurrencyToGain = await this.mToken.calculateSellShareReward(mTokenToSell);
      this.rickAsMTokenOwnerBalanceBeforeTest = await this.memecoin.balanceOf(rickAsMTokenOwner);

      let { logs } = await this.mToken.sellShare(mTokenToSell, expectedReserveCurrencyToGain, {from: mortyAsInvestor});
      expectEvent.inLogs(logs, 'SoldShare', { investor: mortyAsInvestor});
      assert.equal(currentMTokenBalance.sub(mTokenToSell).toString(), await this.mToken.balanceOf(mortyAsInvestor));
      assert.equal(expectedReserveCurrencyToGain.toString(), (await this.memecoin.balanceOf(mortyAsInvestor)).sub(currentBalance));
    });
  
    it("Revert pause when called by not owner", async () => {
      await expectRevert(this.mToken.pauseMinting({from: jerryAsLoser}), "Ownable: caller is not the owner");
    });
  
    it("Pause", async () => {
      let { logs } = await this.mToken.pauseMinting({from: rickAsMTokenOwner});
      assert(await this.mToken.paused());
    });
  
    it("Revert investment when paused", async () => {
      let mortyInvestment = new BN(1e2);
      let mortyInvestmentMinimumGain = await this.mToken.calculateInvestReward(mortyInvestment);

      await expectRevert(this.mToken.invest(mortyInvestment, mortyInvestmentMinimumGain, {from: mortyAsInvestor}), "Pausable: paused");
    });
  
    it("Sell share when paused", async () => {
      let mTokenToSell = new BN(1e2);
      let expectedReserveCurrencyToGain = await this.mToken.calculateSellShareReward(mTokenToSell);
      let currentBalance = await this.memecoin.balanceOf(mortyAsInvestor);

      let { logs } = await this.mToken.sellShare(mTokenToSell, expectedReserveCurrencyToGain, {from: mortyAsInvestor});
      expectEvent.inLogs(logs, 'SoldShare', { investor: mortyAsInvestor});
      assert.equal(expectedReserveCurrencyToGain.toString(), (await this.memecoin.balanceOf(mortyAsInvestor)).sub(currentBalance));
    });

    it("unpauseMinting", async () => {
      let { logs } = await this.mToken.unpauseMinting({from: rickAsMTokenOwner});
      assert(!await this.mToken.paused());
    });

    it("Estimate the invest reward", async () => {
      let balanceBeforeInvestment = await this.mToken.balanceOf(mortyAsInvestor);
      let amountToInvest = new BN(1e6 + 140);

      let rewardEstimate = await this.mToken.calculateInvestReward(amountToInvest);
      await this.mToken.invest(amountToInvest, rewardEstimate, {from: mortyAsInvestor});

      let balanceAfterInvestment = await this.mToken.balanceOf(mortyAsInvestor);

      assert.equal(balanceAfterInvestment.sub(balanceBeforeInvestment), rewardEstimate.toString());
    });

    it("Estimate the sell share reward", async () => {
      let mortisCurveChangeInvestment = new BN(1e10);
      let jerryCurveChangeInvestment = new BN(147);
      await this.mToken.invest(mortisCurveChangeInvestment, await this.mToken.calculateInvestReward(mortisCurveChangeInvestment), {from: mortyAsInvestor});
      await this.mToken.invest(jerryCurveChangeInvestment, await this.mToken.calculateInvestReward(jerryCurveChangeInvestment), {from: jerryAsLoser});

      let balanceBeforeSellingShare = await this.memecoin.balanceOf(mortyAsInvestor);
      let amountToSell = new BN(1e2 + 123);

      let rewardEstimate = await this.mToken.calculateSellShareReward(amountToSell);
      await this.mToken.sellShare(amountToSell, rewardEstimate, {from: mortyAsInvestor});

      let balanceAfterSellingShare = await this.memecoin.balanceOf(mortyAsInvestor);

      assert.equal(balanceAfterSellingShare.sub(balanceBeforeSellingShare), rewardEstimate.toString());
    });

  });
});
