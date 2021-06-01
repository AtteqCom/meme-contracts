const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");

const config = require('../../config');

let TEN_AS_BN = (new BN(10));
let MEMECOIN_DECIMALS_AS_BN = TEN_AS_BN.pow(new BN(18));
let MTOKEN_CREATION_PRICE = (new BN(config.MTOKEN_CREATION_PRICE)).mul(MEMECOIN_DECIMALS_AS_BN);
let MTOKEN_INITIAL_SUPPLY = (new BN(config.MTOKEN_INITIAL_SUPPLY)).mul(MEMECOIN_DECIMALS_AS_BN);
let ENOUGH_COINS_TO_CREATE_MTOKEN = MTOKEN_CREATION_PRICE.add(MTOKEN_INITIAL_SUPPLY);

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
});
