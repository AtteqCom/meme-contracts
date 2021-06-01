const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinRegister = artifacts.require("./MemecoinRegister.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");


const timeOfCreation = Date.now();

contract("MTokenFactoryTest", accounts => {

  const [owner, rick, morty, summer, beth, jerry] = accounts;

  before(async () => {
    this.memecoin = await Memecoin.new(new BN(1e8), "Memecoin", "mCoin", {from: owner});
    this.memecoinRegister = await MemecoinRegister.new();
    this.mTokenInitialSetting = await MTokenInitialSetting.deployed();

    this.bancor = await BancorFormula.new();
    await this.bancor.init();

    this.mTokenFactory = await MTokenFactory.new(this.memecoin.address, this.mTokenInitialSetting.address, this.bancor.address);
  });

  it("Checks revert when Meme Coin Register is not set", async () => {
    let ERROR_MEME_COIN_REGISTER_NOT_SET = await this.mTokenFactory.ERROR_MEME_COIN_REGISTER_NOT_SET();
    await expectRevert(this.mTokenFactory.createMToken('DodgeMToken', 'DMT'), ERROR_MEME_COIN_REGISTER_NOT_SET);
  });

  it("Sets MemecoinRegister Contract", async () => {
    let _memecoinRegisterAddress = await this.mTokenFactory.memecoinRegister();

    const { logs } = await this.mTokenFactory.setMemecoinRegsiter(this.memecoinRegister.address);
    expectEvent.inLogs(logs, 'MemecoinRegisterChanged', { newMemecoinRegisterAddress: this.memecoinRegister.address, oldMemecoinRegisterAddress: _memecoinRegisterAddress });

    _memecoinRegisterAddress = await this.mTokenFactory.memecoinRegister();

    assert.equal(this.memecoinRegister.address, _memecoinRegisterAddress);
  });

  it("Only Meme Coin Register contract as caller can create MToken", async () => {
    let ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER = await this.mTokenFactory.ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER();
    await expectRevert(this.mTokenFactory.createMToken('CanBeAnythingAtThisPoint', 'CBAATP'), ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER);
  });


});
