const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const Memecoin = artifacts.require("./Memecoin.sol");
const MToken = artifacts.require("./MToken.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");


const TOKEN_NAME = "TEST TOKEN";
const TOKEN_SYMBOL = "TEST SYMBOL";

const MORTYs_1ST_BUY = new BN(1e6);
const SECOND_FEE = 500;

contract("MTokenTest", accounts => {

  const [owner, rickAsMTokenOwner, mortyAsBuyer, summerAsBuyerWithoutAllowance, bethAsBuyerWithoutReserveCurrency, jerryAsLoser] = accounts;

  before(async () => {
    this.mToken = null;

    const MEMECOUN_INITIAL_SUPPLY = '100000000000000000000000000'; // 1e8 * 1e18
    this.memecoin = await Memecoin.new(new BN(MEMECOUN_INITIAL_SUPPLY), "Memecoin", "mCoin", {from: owner});

    this.memecoin.transfer(mortyAsBuyer, new BN(1e13), {from: owner});
    this.memecoin.transfer(summerAsBuyerWithoutAllowance, new BN(1e10), {from: owner});
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

      this.memecoin.increaseAllowance(this.mToken.address, new BN(1e13), { from: mortyAsBuyer });
      this.memecoin.increaseAllowance(this.mToken.address, new BN(1e3), {from: jerryAsLoser});

      this.rickAsMTokenOwnerBalanceBeforeTest = await this.memecoin.balanceOf(rickAsMTokenOwner);
      this.correctIvestedFee = await this.mToken.computeFee(MORTYs_1ST_BUY);
    });

    it("Check owner", async () => {
      assert.equal(await this.mToken.owner(), rickAsMTokenOwner);
    });
  
    it("Revert buy by low allowance", async () => {
      let summersBuy = new BN(1e8);
      let minimumExpectedBuy = await this.mToken.calculateBuyReward(summersBuy);
      await expectRevert(this.mToken.buy(summersBuy, minimumExpectedBuy, {from: summerAsBuyerWithoutAllowance}), "ERC20: transfer amount exceeds allowance.");
    });
  
    it("Revert buy by low balance", async () => {
      let bethBuy = new BN(1e8);
      let minimumExpectedBuy = await this.mToken.calculateBuyReward(bethBuy);
      await expectRevert(this.mToken.buy(bethBuy, minimumExpectedBuy, {from: bethAsBuyerWithoutReserveCurrency}), "ERC20: transfer amount exceeds balance");
    });

    it("Revert buy by not met required minimum", async () => {
      let minimumExpectedBuy = await this.mToken.calculateBuyReward(MORTYs_1ST_BUY);
      await expectRevert(this.mToken.buy(MORTYs_1ST_BUY, minimumExpectedBuy.add(new BN(1e3)), {from: mortyAsBuyer}), "ERROR_MINIMUM_BUY_TARGET_AMOUNT_NOT_MET");
    });
  
    it("Buy", async () => {
      let minimumExpectedBuy = await this.mToken.calculateBuyReward(MORTYs_1ST_BUY);
      let { logs } = await this.mToken.buy(MORTYs_1ST_BUY, minimumExpectedBuy, {from: mortyAsBuyer});
      expectEvent.inLogs(logs, 'Buy', { buyer: mortyAsBuyer});
    });
  
    it("Check fee from buy", async () => {
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
      await expectRevert(this.mToken.sellShare(mTokenToSell, minimumExpectedGain.add(new BN(1e2)), {from: mortyAsBuyer}), "ERROR_MINIMUM_SALE_TARGET_AMOUNT_NOT_MET");
    });
  
    it("Sell share", async () => {
      let mTokenToSell = new BN(1e3);
      let currentBalance = await this.memecoin.balanceOf(mortyAsBuyer);
      let currentMTokenBalance = await this.mToken.balanceOf(mortyAsBuyer);
      let expectedReserveCurrencyToGain = await this.mToken.calculateSellShareReward(mTokenToSell);
      this.rickAsMTokenOwnerBalanceBeforeTest = await this.memecoin.balanceOf(rickAsMTokenOwner);

      let { logs } = await this.mToken.sellShare(mTokenToSell, expectedReserveCurrencyToGain, {from: mortyAsBuyer});
      expectEvent.inLogs(logs, 'SoldShare', { buyer: mortyAsBuyer});
      assert.equal(currentMTokenBalance.sub(mTokenToSell).toString(), await this.mToken.balanceOf(mortyAsBuyer));
      assert.equal(expectedReserveCurrencyToGain.toString(), (await this.memecoin.balanceOf(mortyAsBuyer)).sub(currentBalance));
    });
  
    it("Revert pause when called by not owner", async () => {
      await expectRevert(this.mToken.pauseMinting({from: jerryAsLoser}), "Ownable: caller is not the owner");
    });
  
    it("Pause", async () => {
      let { logs } = await this.mToken.pauseMinting({from: rickAsMTokenOwner});
      assert(await this.mToken.paused());
    });
  
    it("Revert buy when paused", async () => {
      let mortyBuy = new BN(1e2);
      let mortyBuyMinimumGain = await this.mToken.calculateBuyReward(mortyBuy);

      await expectRevert(this.mToken.buy(mortyBuy, mortyBuyMinimumGain, {from: mortyAsBuyer}), "Pausable: paused");
    });
  
    it("Sell share when paused", async () => {
      let mTokenToSell = new BN(1e2);
      let expectedReserveCurrencyToGain = await this.mToken.calculateSellShareReward(mTokenToSell);
      let currentBalance = await this.memecoin.balanceOf(mortyAsBuyer);

      let { logs } = await this.mToken.sellShare(mTokenToSell, expectedReserveCurrencyToGain, {from: mortyAsBuyer});
      expectEvent.inLogs(logs, 'SoldShare', { buyer: mortyAsBuyer});
      assert.equal(expectedReserveCurrencyToGain.toString(), (await this.memecoin.balanceOf(mortyAsBuyer)).sub(currentBalance));
    });

    it("unpauseMinting", async () => {
      let { logs } = await this.mToken.unpauseMinting({from: rickAsMTokenOwner});
      assert(!await this.mToken.paused());
    });

    it("Estimate the buy reward", async () => {
      let balanceBeforeBuy = await this.mToken.balanceOf(mortyAsBuyer);
      let amountToBuy = new BN(1e6 + 140);

      let rewardEstimate = await this.mToken.calculateBuyReward(amountToBuy);
      await this.mToken.buy(amountToBuy, rewardEstimate, {from: mortyAsBuyer});

      let balanceAfterBuy = await this.mToken.balanceOf(mortyAsBuyer);

      assert.equal(balanceAfterBuy.sub(balanceBeforeBuy), rewardEstimate.toString());
    });

    it("Estimate the sell share reward", async () => {
      let mortisCurveChangeBuy = new BN(1e10);
      let jerryCurveChangeBuy = new BN(147);
      await this.mToken.buy(mortisCurveChangeBuy, await this.mToken.calculateBuyReward(mortisCurveChangeBuy), {from: mortyAsBuyer});
      await this.mToken.buy(jerryCurveChangeBuy, await this.mToken.calculateBuyReward(jerryCurveChangeBuy), {from: jerryAsLoser});

      let balanceBeforeSellingShare = await this.memecoin.balanceOf(mortyAsBuyer);
      let amountToSell = new BN(1e2 + 123);

      let rewardEstimate = await this.mToken.calculateSellShareReward(amountToSell);
      await this.mToken.sellShare(amountToSell, rewardEstimate, {from: mortyAsBuyer});

      let balanceAfterSellingShare = await this.memecoin.balanceOf(mortyAsBuyer);

      assert.equal(balanceAfterSellingShare.sub(balanceBeforeSellingShare), rewardEstimate.toString());
    });

  });
});
