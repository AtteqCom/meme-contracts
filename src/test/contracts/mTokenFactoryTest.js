const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const Memecoin = artifacts.require("./Memecoin.sol");
const MTokenRegister = artifacts.require("./MTokenRegister.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");


const timeOfCreation = Date.now();

contract("MTokenFactoryTest", accounts => {

  const [owner, rick, morty, summer, beth, jerry] = accounts;

  before(async () => {
    this.memecoin = await Memecoin.new(new BN(1e8), "Memecoin", "mCoin", {from: owner});
    this.mTokenRegister = await MTokenRegister.new();
    this.mTokenInitialSetting = await MTokenInitialSetting.deployed();

    this.bancor = await BancorFormula.new();
    await this.bancor.init();

    this.mTokenFactory = await MTokenFactory.new(this.mTokenRegister.address, this.mTokenInitialSetting.address, this.bancor.address);
  });

  it("Only Meme Coin Register contract as caller can create MToken", async () => {
    await expectRevert(this.mTokenFactory.createMToken('CanBeAnythingAtThisPoint', 'CBAATP', {from: rick}), "ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER");
  });

  it("Pause contract", async () => {
    await this.mTokenFactory.pause();
    await assert(this.mTokenFactory.paused());
  });

  it("Revert when paused", async () => {
    await expectRevert(this.mTokenFactory.createMToken('CanBeAnythingAtThisPoint', 'CBAATP'), "Pausable: paused");
  });


});
