const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const MemeCoin = artifacts.require("./MemeCoin.sol");
const MemeCoinRegister = artifacts.require("./MemeCoinRegister.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");

const timeOfCreation = Date.now();

contract("MTokenFactoryTest", accounts => {

  const [owner, rick, morty, summer, beth, jerry] = accounts;

  before(async () => {
    this.memeCoin = await MemeCoin.new(new BN(1e8), "MemeCoin", "mCoin", {from: owner});
    this.memeCoinRegister = await MemeCoinRegister.new();

    this.bancor = await BancorFormula.new();
    await this.bancor.init();

    this.mTokenFactory = await MTokenFactory.new(this.memeCoin.address, this.bancor.address);
  });

  it("Checks revert when Meme Coin Register is not set", async () => {
    let ERROR_MEME_COIN_REGISTER_NOT_SET = await this.mTokenFactory.ERROR_MEME_COIN_REGISTER_NOT_SET();
    await expectRevert(this.mTokenFactory.createMToken('DodgeMToken', 'DMT'), ERROR_MEME_COIN_REGISTER_NOT_SET);
  });

  it("Sets MemeCoinRegister Contract", async () => {
    let _memeCoinRegisterAddress = await this.mTokenFactory.memeCoinRegister();

    const { logs } = await this.mTokenFactory.setMemeCoinRegsiter(this.memeCoinRegister.address);
    expectEvent.inLogs(logs, 'MemeCoinRegisterChanged', { newMemeCoinRegisterAddress: this.memeCoinRegister.address, oldMemeCoinRegisterAddress: _memeCoinRegisterAddress });

    _memeCoinRegisterAddress = await this.mTokenFactory.memeCoinRegister();

    assert.equal(this.memeCoinRegister.address, _memeCoinRegisterAddress);
  });

  it("Only Meme Coin Register contract as caller can create MToken", async () => {
    let ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER = await this.mTokenFactory.ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER();
    await expectRevert(this.mTokenFactory.createMToken('CanBeAnythingAtThisPoint', 'CBAATP'), ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER);
  });


});
