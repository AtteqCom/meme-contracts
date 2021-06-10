const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const Memecoin = artifacts.require("./Memecoin.sol");
const MemecoinMatic = artifacts.require("./MemecoinMatic.sol");

const timeOfCreation = Date.now();
const TOTAL_SUPPLY = new BN(1e8);
const SMALL_AMOUNT_OF_TOKENS = new BN(1e3);

contract("MemecoinTest", accounts => {

  const [owner, rick, mortyAsChildProxy, summer, beth, jerry] = accounts;

  before(async () => {
    this.memecoin = await Memecoin.new(TOTAL_SUPPLY, "Memecoin", "MEM", {from: owner});

    this.memecoinMatic = await MemecoinMatic.new(mortyAsChildProxy, "Memecoin", "MEM", {from: owner});

  });

  it("Checks created supply", async () => {
    assert.equal(await this.memecoin.totalSupply(), TOTAL_SUPPLY.toString());
  });

  it("Transfer some tokens", async () => {
    await this.memecoin.transfer(rick, SMALL_AMOUNT_OF_TOKENS, {from: owner});

    assert.equal(await this.memecoin.balanceOf(rick), SMALL_AMOUNT_OF_TOKENS.toString());
  });

  it("Burn tokens", async () => {

    await this.memecoin.burn(SMALL_AMOUNT_OF_TOKENS, {from: rick});

    assert.equal(await this.memecoin.totalSupply(), (TOTAL_SUPPLY.sub(SMALL_AMOUNT_OF_TOKENS)).toString());
  });

  it("Deposit tokens", async () => {

    await this.memecoinMatic.deposit(rick, web3.eth.abi.encodeParameter('uint256', SMALL_AMOUNT_OF_TOKENS), {from: mortyAsChildProxy});

    assert.equal(await this.memecoinMatic.balanceOf(rick), SMALL_AMOUNT_OF_TOKENS.toString());
  });

  it("Transfer Child tokens", async () => {
    await this.memecoinMatic.transfer(owner, SMALL_AMOUNT_OF_TOKENS, {from: rick});

    assert.equal(await this.memecoinMatic.balanceOf(owner), SMALL_AMOUNT_OF_TOKENS.toString());
  });

  it("Revert Burn child tokens", async () => {
    await expectRevert(this.memecoinMatic.burn(SMALL_AMOUNT_OF_TOKENS, {from: owner}), "ERROR_CHILD_TOKEN_DOES_NOT_ALLOW_DIRECT_BURNING");
  });

  it("Withdraw tokens", async () => {

    await this.memecoinMatic.withdraw(SMALL_AMOUNT_OF_TOKENS, {from: owner});

    assert.equal(await this.memecoinMatic.balanceOf(rick), "0");
  });

  
});



