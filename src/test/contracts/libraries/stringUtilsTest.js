const StringUtilsTestContract = artifacts.require("./test/StringUtilsTestContract.sol");


contract("StringUtils", accounts => {

  before(async () => {
    this.stringUtilsTestContract = await StringUtilsTestContract.new();
  });

  describe("StringUtils.stripWhitespace() works correctly", async () => {
    it("Does not change string with no spaces at beginning and end", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace("Dodge Meme");
      assert.equal(strippedStr, "Dodge Meme");
    });

    it("Strip at the beginning", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace("   Dodge Meme");
      assert.equal(strippedStr, "Dodge Meme");
    });

    it("Strip at the end", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace("Dodge Meme      ");
      assert.equal(strippedStr, "Dodge Meme");
    });

    it("Strip both", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace("              Dodge Meme      ");
      assert.equal(strippedStr, "Dodge Meme");
    });

    it("Does not strip in the middle", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace("Dodge   Meme");
      assert.equal(strippedStr, "Dodge   Meme");
    });

    it("Strip a string with spaces only to an empty string. ", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace("   ");
      assert.equal(strippedStr, "");
    });

    it("Strip an empty string to an empty string.", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace("");
      assert.equal(strippedStr, "");
    });

    it("Strip other whitespace chars.", async () => {
      let strippedStr = await this.stringUtilsTestContract.stripWhitespace(" \t\n \v\r\fDodge Meme \t\r\n\f\v     ");
      assert.equal(strippedStr, "Dodge Meme");
    });

  });

  describe("StringUtils.containsOnlyAsciiPrintableChars() works correctly", async () => {
    it("Printable ascii chars (i.e. from 32 to 126) are ok", async () => {
      let onlyAscii = await this.stringUtilsTestContract.containsOnlyAsciiPrintableChars(" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
      assert.equal(onlyAscii, true);
    });

    it("Not-printable ascii chars - char #31", async () => {
      let onlyAscii = await this.stringUtilsTestContract.containsOnlyAsciiPrintableChars("Dodge Meme " + String.fromCharCode(31));
      assert.equal(onlyAscii, false);
    });

    it("Not-printable ascii chars - tabulator", async () => {
      let onlyAscii = await this.stringUtilsTestContract.containsOnlyAsciiPrintableChars("Dodge\tMeme");
      assert.equal(onlyAscii, false);
    });

    it("Not-printable ascii chars - tabulator", async () => {
      let onlyAscii = await this.stringUtilsTestContract.containsOnlyAsciiPrintableChars("\t");
      assert.equal(onlyAscii, false);
    });

    it("Not ASCII char", async () => {
      let onlyAscii = await this.stringUtilsTestContract.containsOnlyAsciiPrintableChars("Dodge Meme á");
      assert.equal(onlyAscii, false);
    });
  });

  describe("StringUtils.transformToLowercase() works correctly", async () => {
    it("Printable ascii chars (i.e. from 32 to 126) are ok", async () => {
      let lowerCasedStr = await this.stringUtilsTestContract.transformToLowercase(" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
      assert.equal(lowerCasedStr, " !\"#$%&'()*+,-./0123456789:;<=>?@abcdefghijklmnopqrstuvwxyz[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
    });
  });

});
