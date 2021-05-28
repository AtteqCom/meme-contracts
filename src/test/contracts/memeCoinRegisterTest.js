const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const ERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/ERC20.sol");

const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const MemeCoin = artifacts.require("./MemeCoin.sol");
const MemeCoinRegister = artifacts.require("./MemeCoinRegister.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");

const MTOKEN_CREATION_PRICE = new BN(10000);
const DODGDE_MTOKEN_NAME = 'DodgeMToken';
const DODGDE_MTOKEN_SYMBOL = 'DGMT';

contract("MemeCoinRegister", accounts => {

  const [owner, rickAsNotEnoughAllowance, mortyAsNotEnoughBalance, summerAsCorrectCreator, beth, jerry] = accounts;

  let ownerBalanceBeforeEachTest = null;
  let summerAsCorrectCreatorBalanceBeforeEachTest = null;

  before(async () => {
    this.memeCoin = await MemeCoin.new(new BN(1e8), "MemeCoin", "mCoin", {from: owner});
    this.memeCoinRegister = await MemeCoinRegister.new();

    this.bancor = await BancorFormula.new();
    await this.bancor.init();

    this.mTokenFactory = await MTokenFactory.new(this.memeCoin.address, this.bancor.address);

    await this.mTokenFactory.setMemeCoinRegsiter(this.memeCoinRegister.address);
    this.initialReserveCurrencySupplyOfMToken = await this.memeCoinRegister.initialReserveCurrencySupply();

    // sets actors
    await this.memeCoin.increaseAllowance(this.memeCoinRegister.address, MTOKEN_CREATION_PRICE.add(this.initialReserveCurrencySupplyOfMToken), { from: summerAsCorrectCreator });
    await this.memeCoin.increaseAllowance(this.memeCoinRegister.address, MTOKEN_CREATION_PRICE.add(this.initialReserveCurrencySupplyOfMToken), { from: mortyAsNotEnoughBalance });
    await this.memeCoin.transfer(mortyAsNotEnoughBalance,  MTOKEN_CREATION_PRICE.sub(new BN(1000)), {from: owner});
    await this.memeCoin.transfer(summerAsCorrectCreator,  MTOKEN_CREATION_PRICE.add(this.initialReserveCurrencySupplyOfMToken), {from: owner});
  });

  describe("MemeCoinRegister behavior", async() => {
    describe("Set related contracts", async() => {
      it("Reverts when MemeCoin is not set.", async () => {
        let ERROR_MEME_COIN_CONTRACT_IS_NOT_SET = await this.memeCoinRegister.ERROR_MEME_COIN_CONTRACT_IS_NOT_SET();
        await expectRevert(this.memeCoinRegister.createMToken('DodgeMToken', 'DMT'), ERROR_MEME_COIN_CONTRACT_IS_NOT_SET);
      });
    
      it("Set MemeCoin contract", async () => {
        let newMemeCoinAddress = await this.memeCoin.address;
        let currentMemeCoinAddress = await this.memeCoinRegister.memeCoin();
    
        const { logs } = await this.memeCoinRegister.setReserveCurrency(newMemeCoinAddress);
        expectEvent.inLogs(logs, 'ReserveCurrencyChanged', { newReserveCurrency: newMemeCoinAddress, oldReserveCurrency: currentMemeCoinAddress});
    
        currentMemeCoinAddress = await this.memeCoinRegister.memeCoin();
    
        assert.equal(newMemeCoinAddress, currentMemeCoinAddress);
      });
    
      it("Reverts when MTokenFactory is not set", async () => {
        let ERROR_FACTORY_CONTRACT_IS_NOT_SET = await this.memeCoinRegister.ERROR_FACTORY_CONTRACT_IS_NOT_SET();
        await expectRevert(this.memeCoinRegister.createMToken('DodgeMToken', 'DMT'), ERROR_FACTORY_CONTRACT_IS_NOT_SET);
      });
    
      it("Set MTokenFactory contract", async () => {
        let newTokenFactoryAddress = await this.mTokenFactory.address;
        let currentMTokenFactoryAddress = await this.memeCoinRegister.mTokenFactory();
    
        const { logs } = await this.memeCoinRegister.setMTokenFactory(newTokenFactoryAddress);
        expectEvent.inLogs(logs, 'MTokenFactoryChanged', { newMTokenFactory: newTokenFactoryAddress, oldMTokenFactory: currentMTokenFactoryAddress});
    
        currentMTokenFactoryAddress = await this.memeCoinRegister.mTokenFactory();
    
        assert.equal(newTokenFactoryAddress, currentMTokenFactoryAddress);
      });

      describe("MToken creation", async() => {

        before(async() => {
          this.ownerBalanceBeforeTest = await this.memeCoin.balanceOf(owner);
          this.summerAsCorrectCreatorBalanceBeforeTest = await this.memeCoin.balanceOf(summerAsCorrectCreator);
        });

        it("Sets MTokenCreation Price", async () => {
          const newMTokenCreationPrice = MTOKEN_CREATION_PRICE;
          let currnetMTokenCreationPrice = await this.memeCoinRegister.mTokenCreationPrice();
    
          let { logs } = await this.memeCoinRegister.setMTokenCreationPrice(newMTokenCreationPrice);
          expectEvent.inLogs(logs, 'MTokenCreationPriceChanged', { newPrice: newMTokenCreationPrice, oldPrice: currnetMTokenCreationPrice});
    
          currnetMTokenCreationPrice = await this.memeCoinRegister.mTokenCreationPrice();
    
          assert.equal(newMTokenCreationPrice.toString(), currnetMTokenCreationPrice);
        });
    
        it("Reverts when creator has not set enough allowance", async () => {
          let ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE = await this.memeCoinRegister.ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE();
          await expectRevert(this.memeCoinRegister.createMToken(DODGDE_MTOKEN_NAME, DODGDE_MTOKEN_SYMBOL, {from: rickAsNotEnoughAllowance}), ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE);
        });

        it("Reverts when creator has not enough balance", async () => {
          let ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE = await this.memeCoinRegister.ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE();
          await expectRevert(this.memeCoinRegister.createMToken(DODGDE_MTOKEN_NAME, DODGDE_MTOKEN_SYMBOL, {from: mortyAsNotEnoughBalance}), ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE);
        });
    
        it("Creates new MToken", async () => {
          //  set up allowance first
          let { logs } = await this.memeCoinRegister.createMToken(DODGDE_MTOKEN_NAME, DODGDE_MTOKEN_SYMBOL, {from: summerAsCorrectCreator});
          let lastAddress = await this.memeCoinRegister.memeCoinRegister(await this.memeCoinRegister.memeCoinRegisterCount() -1);
          expectEvent.inLogs(logs, 'MTokenRegistered', { mTokenContract: lastAddress});
        });

        it("Owner gets paid", async () => {
          //  set up allowance first
          let ownerAsCorrectCreatorBalance = await this.memeCoin.balanceOf(owner);

          assert.equal(this.ownerBalanceBeforeTest.toString(), ownerAsCorrectCreatorBalance.sub(MTOKEN_CREATION_PRICE));
        });

        it("Check index of register", async () => {
          let lastRegisteredId = new BN(await this.memeCoinRegister.memeCoinRegisterCount()) -1;
          let lastMTokenContractAddress = await this.memeCoinRegister.memeCoinRegister(lastRegisteredId);
          let mToken = await ERC20.at(lastMTokenContractAddress);

          let mTokenNameHash = await this.memeCoinRegister.getNumericHashFromString(await mToken.name());
          let mTokenSymbolHash = await this.memeCoinRegister.getNumericHashFromString(await mToken.symbol());

          assert.equal(await this.memeCoinRegister.memeCoinRegisterIndex(mTokenNameHash), lastRegisteredId);
          assert.equal(await this.memeCoinRegister.memeCoinSymbolRegisterIndex(mTokenSymbolHash), lastRegisteredId);
        });

        it("Reverts when caller is not in MTOKEN_FACTORY_ROLE role", async () => {
          let ERROR_CALLER_IS_NOT_MTOKEN_FACTORY = await this.memeCoinRegister.ERROR_CALLER_IS_NOT_MTOKEN_FACTORY();
          await expectRevert(this.memeCoinRegister.addMToken(await this.memeCoin.address, {from: rickAsNotEnoughAllowance}), ERROR_CALLER_IS_NOT_MTOKEN_FACTORY);
        });
      });
    });
  });
});
