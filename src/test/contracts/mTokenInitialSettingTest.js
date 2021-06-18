const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");

const config = require('../../config');

let TEN_AS_BN = (new BN(10));
let MEMECOIN_DECIMALS_AS_BN = TEN_AS_BN.pow(new BN(18));
let MTOKEN_CREATION_PRICE = (new BN(config.MTOKEN_CREATION_PRICE)).mul(MEMECOIN_DECIMALS_AS_BN);
let MTOKEN_INITIAL_SUPPLY = (new BN(config.MTOKEN_INITIAL_SUPPLY)).mul(MEMECOIN_DECIMALS_AS_BN);
let MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY = (new BN(config.MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY)).mul(MEMECOIN_DECIMALS_AS_BN);

let ONE_HUNDRED_PERCENT = (new BN(10000));
let MAX_RESERVE_CURRENCY_WEIGHT = (new BN(1000000));

contract("MTokenInitialSettingTest", accounts => {

  const [owner, rick, morty, summer, beth, jerry] = accounts;

  before(async () => {
    this.mTokenInitialSetting = await MTokenInitialSetting.deployed();

    assert.equal(10, 10);
  });

  it("Sets MToken creation Price", async () => {
    let currentMTokenCreationPrice = await this.mTokenInitialSetting.getCreationPrice();

    let { logs } = await this.mTokenInitialSetting.setCreationPrice(MTOKEN_CREATION_PRICE);
    expectEvent.inLogs(logs, 'CreationPriceChanged', { newPrice: MTOKEN_CREATION_PRICE, oldPrice: currentMTokenCreationPrice});

    currentMTokenCreationPrice = await this.mTokenInitialSetting.getCreationPrice();

    assert.equal(MTOKEN_CREATION_PRICE.toString(), currentMTokenCreationPrice);
  });

  it("Sets MToken initial supply of reserve currency", async () => {
    
    let currentMTokenInititalSupply = await this.mTokenInitialSetting.getReserveCurrencyInitialSupply();

    let { logs } = await this.mTokenInitialSetting.setReserveCurrencyInitialSupply(MTOKEN_INITIAL_SUPPLY);
    expectEvent.inLogs(logs, 'ReserveCurrencyInitialSupplyChanged', { newInitialSupplyOfReserveCurrency: MTOKEN_INITIAL_SUPPLY, oldInitialSupplyOfReserveCurrency: currentMTokenInititalSupply});

    currentMTokenInititalSupply = await this.mTokenInitialSetting.getReserveCurrencyInitialSupply();
    assert.equal(MTOKEN_INITIAL_SUPPLY.toString(), currentMTokenInititalSupply);
  });

  it("Reverts on construction as price set to 0", async () => {
    await expectRevert(MTokenInitialSetting.new(
      0, 
      MTOKEN_INITIAL_SUPPLY, 
      config.MTOKEN_FEE,
      config.MTOKEN_FEE_LIMIT,
      config.MTOKEN_RESERVE_CURRENCY_WEIGHT,
      MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY
    ), 'ERROR_PRICE_CAN_NOT_BE_ZERO');
  });

  it("Reverts when try to set price to 0", async () => {
    await expectRevert(this.mTokenInitialSetting.setCreationPrice(0), 'ERROR_PRICE_CAN_NOT_BE_ZERO');
  });

  it("Reverts on construction as initial supply set to 0", async () => {
    await expectRevert(MTokenInitialSetting.new(
      MTOKEN_CREATION_PRICE, 
      0, 
      config.MTOKEN_FEE,
      config.MTOKEN_FEE_LIMIT,
      config.MTOKEN_RESERVE_CURRENCY_WEIGHT,
      MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY
    ), "ERROR_INITIAL_SUPPLY_CAN_NOT_BE_ZERO");
  });

  it("Reverts when try to set initial supply to 0", async () => {
    await expectRevert(this.mTokenInitialSetting.setInitialSupply(0), 'ERROR_INITIAL_SUPPLY_CAN_NOT_BE_ZERO');
  });

  it("Reverts on construction as reserve currency weight is set to 0", async () => {
    await expectRevert(MTokenInitialSetting.new(
      MTOKEN_CREATION_PRICE, 
      MTOKEN_INITIAL_SUPPLY, 
      config.MTOKEN_FEE,
      config.MTOKEN_FEE_LIMIT,
      0,
      MTOKEN_RESERVE_CURRENCY_INITIAL_SUPPLY
    ), "ERROR_RESERVE_CURRENCY_WEIGHT_CAN_NOT_BE_ZERO");
  });

  it("Reverts when try to set reserve currency supply to 0", async () => {
    await expectRevert(this.mTokenInitialSetting.setReserveCurrencyInitialSupply(0), 'ERROR_RESERVE_CURRENCY_SUPPLY_CAN_NOT_BE_ZERO');
  });

  it("Reverts on construction as reserve currency supply is set to 0", async () => {
    await expectRevert(MTokenInitialSetting.new(
      MTOKEN_CREATION_PRICE, 
      MTOKEN_INITIAL_SUPPLY, 
      config.MTOKEN_FEE,
      config.MTOKEN_FEE_LIMIT,
      config.MTOKEN_RESERVE_CURRENCY_WEIGHT,
      0
    ), "ERROR_RESERVE_CURRENCY_SUPPLY_CAN_NOT_BE_ZERO");
  });


  it("Reverts when try to set fee above fee limit", async () => {
    await expectRevert(this.mTokenInitialSetting.setInitialFee(config.MTOKEN_FEE_LIMIT), 'ERROR_FEE_ABOVE_LIMIT');
  });

  it("Reverts when try to set fee limit above max value", async () => {
    await expectRevert(this.mTokenInitialSetting.setInitialFeeLimit(ONE_HUNDRED_PERCENT), 'ERROR_FEE_LIMIT_ABOVE_OR_EQAULS_TO_HUNDRED_PERCENT');
  });

  it("Reverts when try to set reserver currency weight above max value", async () => {
    await expectRevert(this.mTokenInitialSetting.setReserveCurrencyWeight(MAX_RESERVE_CURRENCY_WEIGHT.add(new BN(1000))), 'ERROR_RESERVE_CURRENCY_WEIGHT_IS_ABOVE_MAX');
  });

  it("Set new reserve curve weight", async () => {
    let newValue = MAX_RESERVE_CURRENCY_WEIGHT.sub(new BN(1000));
    let { logs } = await this.mTokenInitialSetting.setReserveCurrencyWeight(newValue);
    let settings = await this.mTokenInitialSetting.getMTokenInitialSetting();

    expectEvent.inLogs(logs, 'ReserveCurrencyWeightChanged', { newWeight: newValue});
    assert.equal(newValue, settings.reserveCurrencyWeight);
  });

  it("Set mToken initial supply", async () => {
    let newValue = MTOKEN_INITIAL_SUPPLY.sub(new BN(200));
    let { logs } = await this.mTokenInitialSetting.setInitialSupply(newValue);
    let settings = await this.mTokenInitialSetting.getMTokenInitialSetting();

    expectEvent.inLogs(logs, 'InitialSupplyChanged', { newInitialSupply: newValue});
    assert.equal(newValue, settings.initialSupply);
  });
  

  it("Set fee", async () => {
    let newValue = (new BN(config.MTOKEN_FEE)).sub(new BN(200));
    let { logs } = await this.mTokenInitialSetting.setInitialFee(newValue);
    let settings = await this.mTokenInitialSetting.getMTokenInitialSetting();

    expectEvent.inLogs(logs, 'InitialFeeChanged', { newFee: newValue});
    assert.equal(newValue, settings.fee);
  });

  it("Set fee limit", async () => {
    let newValue = (new BN(config.MTOKEN_FEE_LIMIT)).add(new BN(200));
    let { logs } = await this.mTokenInitialSetting.setInitialFeeLimit(newValue);
    let settings = await this.mTokenInitialSetting.getMTokenInitialSetting();

    expectEvent.inLogs(logs, 'InitialFeeLimitChanged', { newFeeLimit: newValue});
    assert.equal(newValue, settings.feeLimit);
  });
});
