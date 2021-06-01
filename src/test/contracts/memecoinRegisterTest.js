const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const ERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/ERC20.sol");

const BancorFormula = artifacts.require("./bancor/BancorFormula.sol");
const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinRegister = artifacts.require("./MemecoinRegister.sol");
const MTokenFactory = artifacts.require("./MTokenFactory.sol");
const MToken = artifacts.require("./MToken.sol");
const MTokenInitialSetting = artifacts.require("./MTokenInitialSetting.sol");

const config = require('../../config');

const DODGDE_MTOKEN_NAME = 'DodgeMToken';
const DODGDE_MTOKEN_SYMBOL = 'DGMT';
const COOLPANDA_MTOKEN_NAME = 'COOLPANDA';
const COOLPANDA_MTOKEN_SYMBOL = 'CLP';

let TEN_AS_BN = (new BN(10));
let MEMECOIN_DECIMALS_AS_BN = TEN_AS_BN.pow(new BN(18));
let MTOKEN_CREATION_PRICE = (new BN(config.MTOKEN_CREATION_PRICE)).mul(MEMECOIN_DECIMALS_AS_BN);
let MTOKEN_INITIAL_SUPPLY = (new BN(config.MTOKEN_INITIAL_SUPPLY)).mul(MEMECOIN_DECIMALS_AS_BN);
let ENOUGH_COINS_TO_CREATE_MTOKEN = MTOKEN_CREATION_PRICE.add(MTOKEN_INITIAL_SUPPLY);

const addFundsToActor = async (actor, value, coin, coinOwner, allowanceTo, valueAllowance) => {
  await coin.transfer(actor, value, {from: coinOwner});

  if (allowanceTo) {
    await coin.increaseAllowance(this.memecoinRegister.address, value, { from: actor });
  }
}

const increaseAllowence = async (actor, value, coin, allowanceTo) => {
    await coin.increaseAllowance(this.memecoinRegister.address, value, { from: actor });
}

contract("MemecoinRegister", accounts => {

  const [owner, rickAsNotEnoughAllowance, mortyAsNotEnoughBalance, summerAsCorrectCreator, beth, jerry] = accounts;

  before(async () => {
    this.memecoin = await Memecoin.deployed();
    this.mTokenFactory = await MTokenFactory.deployed();
    this.mTokenInitialSetting = await MTokenInitialSetting.deployed();
    this.memecoinRegister = await MemecoinRegister.new(); 
    await this.mTokenFactory.setMemecoinRegsiter(this.memecoinRegister.address);
    await this.memecoinRegister.setMTokenInitialSetting(this.mTokenInitialSetting.address);

    MTOKEN_CREATION_PRICE = await this.mTokenInitialSetting.getCreationPrice();
    MTOKEN_INITIAL_SUPPLY = await this.mTokenInitialSetting.getReserveCurrencyInitialSupply();
    ENOUGH_COINS_TO_CREATE_MTOKEN = MTOKEN_CREATION_PRICE.add(MTOKEN_INITIAL_SUPPLY);

    this.initialReserveCurrencySupplyOfMToken = MTOKEN_INITIAL_SUPPLY;

    await addFundsToActor(mortyAsNotEnoughBalance, ENOUGH_COINS_TO_CREATE_MTOKEN.sub(new BN(1000)), this.memecoin, owner);
    await increaseAllowence(mortyAsNotEnoughBalance, ENOUGH_COINS_TO_CREATE_MTOKEN, this.memecoin, this.memecoinRegister.address);

    await addFundsToActor(summerAsCorrectCreator, ENOUGH_COINS_TO_CREATE_MTOKEN.mul(new BN(3)), this.memecoin, owner);
    await increaseAllowence(summerAsCorrectCreator, ENOUGH_COINS_TO_CREATE_MTOKEN.mul(new BN(3)), this.memecoin, this.memecoinRegister.address);    
  });

  describe("MemecoinRegister behavior", async() => {
    describe("Set related contracts", async() => {
      it("Reverts when Memecoin is not set.", async () => {
        let ERROR_MEME_COIN_CONTRACT_IS_NOT_SET = await this.memecoinRegister.ERROR_MEME_COIN_CONTRACT_IS_NOT_SET();
        await expectRevert(this.memecoinRegister.createMToken('DodgeMToken', 'DMT'), ERROR_MEME_COIN_CONTRACT_IS_NOT_SET);
      });

      it("Set Memecoin contract", async () => {
        let newMemecoinAddress = await this.memecoin.address;
        let currentMemecoinAddress = await this.memecoinRegister.memecoin();
    
        const { logs } = await this.memecoinRegister.setReserveCurrency(newMemecoinAddress);
        expectEvent.inLogs(logs, 'ReserveCurrencyChanged', { newReserveCurrency: newMemecoinAddress, oldReserveCurrency: currentMemecoinAddress});
    
        currentMemecoinAddress = await this.memecoinRegister.memecoin();
    
        assert.equal(newMemecoinAddress, currentMemecoinAddress);
      });
    
      it("Reverts when MTokenFactory is not set", async () => {
        let ERROR_FACTORY_CONTRACT_IS_NOT_SET = await this.memecoinRegister.ERROR_FACTORY_CONTRACT_IS_NOT_SET();
        await expectRevert(this.memecoinRegister.createMToken('DodgeMToken', 'DMT'), ERROR_FACTORY_CONTRACT_IS_NOT_SET);
      });
    
      it("Set MTokenFactory contract", async () => {
        let newTokenFactoryAddress = await this.mTokenFactory.address;
        let currentMTokenFactoryAddress = await this.memecoinRegister.mTokenFactory();
    
        const { logs } = await this.memecoinRegister.setMTokenFactory(newTokenFactoryAddress);
        expectEvent.inLogs(logs, 'MTokenFactoryChanged', { newMTokenFactory: newTokenFactoryAddress, oldMTokenFactory: currentMTokenFactoryAddress});
    
        currentMTokenFactoryAddress = await this.memecoinRegister.mTokenFactory();
    
        assert.equal(newTokenFactoryAddress, currentMTokenFactoryAddress);
      });

      describe("MemecoinRegister.stripSpaceCharacters() works correctly", async () => {
        it("Does not change string with no spaces at beginning and end", async () => {
          let strippedStr = await this.memecoinRegister.stripSpaceCharacters("Dodge Meme");
          assert.equal(strippedStr, "Dodge Meme");
        });

        it("Strip at the beginning", async () => {
          let strippedStr = await this.memecoinRegister.stripSpaceCharacters("   Dodge Meme");
          assert.equal(strippedStr, "Dodge Meme");
        });

        it("Strip at the end", async () => {
          let strippedStr = await this.memecoinRegister.stripSpaceCharacters("Dodge Meme      ");
          assert.equal(strippedStr, "Dodge Meme");
        });

        it("Strip both", async () => {
          let strippedStr = await this.memecoinRegister.stripSpaceCharacters("              Dodge Meme      ");
          assert.equal(strippedStr, "Dodge Meme");
        });

        it("Does not strip in the middle", async () => {
          let strippedStr = await this.memecoinRegister.stripSpaceCharacters("Dodge   Meme");
          assert.equal(strippedStr, "Dodge   Meme");
        });

        it("Strip a string with spaces only to an empty string. ", async () => {
          let strippedStr = await this.memecoinRegister.stripSpaceCharacters("   ");
          assert.equal(strippedStr, "");
        });

        it("Strip an empty string to an empty string. ", async () => {
          let strippedStr = await this.memecoinRegister.stripSpaceCharacters("");
          assert.equal(strippedStr, "");
        });
      });

      describe("MemecoinRegister.containsOnlyAsciiPrintableChars() works correctly", async () => {
        it("Printable ascii chars (i.e. from 32 to 126) are ok", async () => {
          let onlyAscii = await this.memecoinRegister.containsOnlyAsciiPrintableChars(" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
          assert.equal(onlyAscii, true);
        });

        it("Not-printable ascii chars fails - char #31", async () => {
          let onlyAscii = await this.memecoinRegister.containsOnlyAsciiPrintableChars("Dodge Meme " + String.fromCharCode(31));
          assert.equal(onlyAscii, false);
        });

        it("Not-printable ascii chars fails - tabulator", async () => {
          let onlyAscii = await this.memecoinRegister.containsOnlyAsciiPrintableChars("Dodge\tMeme");
          assert.equal(onlyAscii, false);
        });

        it("Not-printable ascii chars fails - tabulator", async () => {
          let onlyAscii = await this.memecoinRegister.containsOnlyAsciiPrintableChars("\t");
          assert.equal(onlyAscii, false);
        });

        it("Not ASCII char fails", async () => {
          let onlyAscii = await this.memecoinRegister.containsOnlyAsciiPrintableChars("Dodge Meme á");
          assert.equal(onlyAscii, false);
        });
      });

      describe("MemecoinRegister.transformToLowercase() works correctly", async () => {
        it("Printable ascii chars (i.e. from 32 to 126) are ok", async () => {
          let lowerCasedStr = await this.memecoinRegister.transformToLowercase(" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
          assert.equal(lowerCasedStr, " !\"#$%&'()*+,-./0123456789:;<=>?@abcdefghijklmnopqrstuvwxyz[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
        });

      });

      describe("MToken creation", async() => {

        before(async() => {
          this.ownerBalanceBeforeTest = await this.memecoin.balanceOf(owner);
          this.summerAsCorrectCreatorBalanceBeforeTest = await this.memecoin.balanceOf(summerAsCorrectCreator);
        });
    
        it("Reverts when creator has not set enough allowance", async () => {
          console.log(await this.memecoinRegister.getCreationTotalCosts());

          let ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE = await this.memecoinRegister.ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE();
          await expectRevert(this.memecoinRegister.createMToken(DODGDE_MTOKEN_NAME, DODGDE_MTOKEN_SYMBOL, {from: rickAsNotEnoughAllowance}), ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE);
        });

        it("Reverts when creator has not enough balance", async () => {
          let ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE = await this.memecoinRegister.ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE();
          await expectRevert(this.memecoinRegister.createMToken(DODGDE_MTOKEN_NAME, DODGDE_MTOKEN_SYMBOL, {from: mortyAsNotEnoughBalance}), ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE);
        });
    
        it("Creates new MToken", async () => {
          //  set up allowance first
          let { logs } = await this.memecoinRegister.createMToken(DODGDE_MTOKEN_NAME, DODGDE_MTOKEN_SYMBOL, {from: summerAsCorrectCreator});
          let lastAddress = await this.memecoinRegister.memecoinRegisterIndex(await this.memecoinRegister.totalRegistered() -1);

          expectEvent.inLogs(logs, 'MTokenRegistered', { mTokenContract: lastAddress});
        });

        it("Owner gets paid", async () => {
          //  set up allowance first
          let ownerAsCorrectCreatorBalance = await this.memecoin.balanceOf(owner);

          assert.equal(this.ownerBalanceBeforeTest.toString(), ownerAsCorrectCreatorBalance.sub(MTOKEN_CREATION_PRICE));
        });

        it("Check index of registered mToken", async () => {
          let lastRegisteredId = new BN(await this.memecoinRegister.totalRegistered()) -1;
          let lastMTokenContractAddress = await this.memecoinRegister.memecoinRegisterIndex(lastRegisteredId);
          let mToken = await ERC20.at(lastMTokenContractAddress);

          let mTokenNameHash = await this.memecoinRegister.getNumericHashFromString(await mToken.name());
          let mTokenSymbolHash = await this.memecoinRegister.getNumericHashFromString(await mToken.symbol());

          assert.equal(await this.memecoinRegister.nameHashIndex(mTokenNameHash), lastMTokenContractAddress);
          assert.equal(await this.memecoinRegister.symbolHashIndex(mTokenSymbolHash), lastMTokenContractAddress);
        });

        it("Reverts name exists", async () => {
          let ERROR_NAME_IS_TAKEN = await this.memecoinRegister.ERROR_NAME_IS_TAKEN();
          await expectRevert(this.memecoinRegister.createMToken(DODGDE_MTOKEN_NAME, COOLPANDA_MTOKEN_SYMBOL, {from: summerAsCorrectCreator}), ERROR_NAME_IS_TAKEN);
        });

        it("Reverts symbol exists", async () => {
          let ERROR_SYMBOL_IS_TAKEN = await this.memecoinRegister.ERROR_SYMBOL_IS_TAKEN();
          await expectRevert(this.memecoinRegister.createMToken(COOLPANDA_MTOKEN_NAME, DODGDE_MTOKEN_SYMBOL, {from: summerAsCorrectCreator}), ERROR_SYMBOL_IS_TAKEN);
        });

        it("Creates another cool MToken", async () => {
          let { logs } = await this.memecoinRegister.createMToken(COOLPANDA_MTOKEN_NAME, COOLPANDA_MTOKEN_SYMBOL, {from: summerAsCorrectCreator});
          let lastAddress = await this.memecoinRegister.memecoinRegisterIndex(await this.memecoinRegister.totalRegistered() -1);
          expectEvent.inLogs(logs, 'MTokenRegistered', { mTokenContract: lastAddress});

          let mToken = await ERC20.at(lastAddress);
          assert.equal(await mToken.name(), COOLPANDA_MTOKEN_NAME);
          assert.equal(await mToken.symbol(), COOLPANDA_MTOKEN_SYMBOL);
        });
      });

      describe("MToken creation - valid token name and symbol", async() => {

        beforeEach(async() => {
          await this.memecoin.transfer(summerAsCorrectCreator,  MTOKEN_CREATION_PRICE.add(MTOKEN_INITIAL_SUPPLY), {from: owner});
          await this.memecoin.increaseAllowance(this.memecoinRegister.address, MTOKEN_CREATION_PRICE.add(MTOKEN_INITIAL_SUPPLY), { from: summerAsCorrectCreator });
        });

        it("MToken name and symbol valid", async () => {
          let { logs } = await this.memecoinRegister.createMToken("Dodge Meme", "DGMXXXX", {from: summerAsCorrectCreator});
          let lastAddress = await this.memecoinRegister.memecoinRegisterIndex(await this.memecoinRegister.totalRegistered() -1);
          expectEvent.inLogs(logs, 'MTokenRegistered', { mTokenContract: lastAddress});
        });

        it("MToken name invalid and symbol valid", async () => {
          let ERROR_MEME_TOKEN_NAME_CONTAINS_INVALID_CHARS = await this.memecoinRegister.ERROR_MEME_TOKEN_NAME_CONTAINS_INVALID_CHARS();
          await expectRevert(this.memecoinRegister.createMToken("Dodge\tMeme 2", "DGMXXXX2", {from: summerAsCorrectCreator}), ERROR_MEME_TOKEN_NAME_CONTAINS_INVALID_CHARS);
        });

        it("MToken name empty and symbol valid", async () => {
          let ERROR_MEME_TOKEN_NAME_EMPTY_OR_WHITESPACES_ONLY = await this.memecoinRegister.ERROR_MEME_TOKEN_NAME_EMPTY_OR_WHITESPACES_ONLY();
          await expectRevert(this.memecoinRegister.createMToken("", "DGMXXXX3", {from: summerAsCorrectCreator}), ERROR_MEME_TOKEN_NAME_EMPTY_OR_WHITESPACES_ONLY);
        });

        it("MToken name valid and symbol invalid", async () => {
          let ERROR_MEME_TOKEN_SYMBOL_CONTAINS_INVALID_CHARS = await this.memecoinRegister.ERROR_MEME_TOKEN_SYMBOL_CONTAINS_INVALID_CHARS();
          await expectRevert(this.memecoinRegister.createMToken("Dodge Meme 4  ", "DGMXXXX\t4", {from: summerAsCorrectCreator}), ERROR_MEME_TOKEN_SYMBOL_CONTAINS_INVALID_CHARS);
        });

        it("MToken name valid and symbol empty", async () => {
          let ERROR_MEME_TOKEN_SYMBOL_EMPTY_OR_WHITESPACES_ONLY = await this.memecoinRegister.ERROR_MEME_TOKEN_SYMBOL_EMPTY_OR_WHITESPACES_ONLY();
          await expectRevert(this.memecoinRegister.createMToken("Dodge Meme 5", "  ", {from: summerAsCorrectCreator}), ERROR_MEME_TOKEN_SYMBOL_EMPTY_OR_WHITESPACES_ONLY);
        });

        it("MToken name and symbol are correctly stripped", async () => {
          await this.memecoinRegister.createMToken("   Dodge Meme 6     ", "   DGMXXXX6  ", {from: summerAsCorrectCreator});
          let lastAddress = await this.memecoinRegister.memecoinRegisterIndex(await this.memecoinRegister.totalRegistered() -1);
          let mToken = await MToken.at(lastAddress);

          let name = await mToken.name();
          let symbol = await mToken.symbol();

          assert.equal(name, "Dodge Meme 6");
          assert.equal(symbol, "DGMXXXX6");
        });

      });
    });
  });
});
