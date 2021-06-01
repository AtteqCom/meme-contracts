// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

library StringUtils {

  /**
   * @dev Check whether given string contains only ascii chars with code between 32 and 126 (inclusively)
   * @param _str a string to check
   * @return containsOnlyAsciiPrintableChars true if the given string contains only allowed ascii chars, otherwise false
   */
  function containsOnlyAsciiPrintableChars(string memory _str)
    internal
    pure
    returns(bool containsOnlyAsciiPrintableChars)
  {
    bytes memory bStr = bytes(_str);
    for (uint i = 0; i < bStr.length; i++) {
      if (uint8(bStr[i]) >= 127 || uint8(bStr[i]) < 32) {
        return false;
      }
    }

    return true;
  }

  /**
  * @dev Transforms given string to its lowercase
  * source from https://gist.github.com/thomasmaclean/276cb6e824e48b7ca4372b194ec05b97#gistcomment-3310610
  * @param _strToLowerSource string to change to lower case
  */
  function transformToLowercase(string memory _strToLowerSource) 
    internal 
    pure 
    returns (string memory strToLower) 
  {
    bytes memory bStr = bytes(_strToLowerSource);
    bytes memory bLower = new bytes(bStr.length);
     for (uint i = 0; i < bStr.length; i++) {
      // Uppercase character...
      if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
        // So we add 32 to make it lowercase
        bLower[i] = bytes1(uint8(bStr[i]) + 32);
      } else {
        bLower[i] = bStr[i];
      }
    }
    return string(bLower);
  }

  /**
   * @dev Remove ASCII whitespace characters (char with ASCII code 9, 10, 11, 12, 13 or 32) from the beginning and end of the string.
   * @param _str string for stripping the whitespaces
   *
   * Whitespace chars, see: https://en.wikipedia.org/wiki/Whitespace_character
   */
  function stripWhitespace(string memory _str)
    internal
    pure
    returns(string memory strippedStr)
  {
    bytes memory bStr = bytes(_str);
    if (bStr.length == 0) {
      return '';
    }

    uint256 indexFirstNotSpaceCharacter = indexOfFirstNotSpaceCharacter(bStr);
    if (indexFirstNotSpaceCharacter == bStr.length) {
      return '';
    }

    uint256 indexFirstNotSpaceCharacterFromEnd = indexOfFirstNotSpaceCharacterFromEnd(bStr);

    uint256 bStrippedStrLength = indexFirstNotSpaceCharacterFromEnd - indexFirstNotSpaceCharacter + 1;
    bytes memory bStrippedStr = new bytes(bStrippedStrLength);
    for (uint256 i = indexFirstNotSpaceCharacter; i <= indexFirstNotSpaceCharacterFromEnd; i++) {
      bStrippedStr[i - indexFirstNotSpaceCharacter] = bStr[i];
    }

    return string(bStrippedStr);
  }

  /**
   * Returns the position of first not-space character in the string. Returns _bStr.length if the string consists only of space chars.
   */
  function indexOfFirstNotSpaceCharacter(bytes memory _bStr)
    private
    pure
    returns(uint256 index)
  {
    uint256 firstNonWhitespaceCharacterIndex = 0;
    for (uint256 i = 0; i < _bStr.length; i++) {
      if (!isWhitespaceAsciiCharCode(uint8(_bStr[i]))) {
        firstNonWhitespaceCharacterIndex = i;
        break;
      }
    }

    // this condition is met when we never entered the if-body in the for loop above, i.e. the entire string contains only space chars
    if (firstNonWhitespaceCharacterIndex == 0 && uint8(_bStr[0]) == 32) {
      return _bStr.length;
    } else {
      return firstNonWhitespaceCharacterIndex;
    }
  }

    /**
   * Returns the position of first not-space character in the string. Returns _bStr.length if the string consists only of space chars.
   */
  function indexOfFirstNotSpaceCharacterFromEnd(bytes memory _bStr)
    private
    pure
    returns(uint256 index)
  {
    uint256 firstNotSpaceCharacterIndex = _bStr.length - 1;
    for (uint256 i = _bStr.length - 1; i >= 0; i--) {
      if (!isWhitespaceAsciiCharCode(uint8(_bStr[i]))) {
        firstNotSpaceCharacterIndex = i;
        break;
      }

      // manually interrupting the for-cycle at the end so we do not get overflow to negative values (i is unsigned int)
      if (i == 0) {
        break;
      }
    }

    // this condition is met when we never entered the if-body in the for loop above, i.e. the entire string contains only space chars
    if (firstNotSpaceCharacterIndex == _bStr.length - 1 && uint8(_bStr[_bStr.length - 1]) == 32) {
      return _bStr.length;
    } else {
      return firstNotSpaceCharacterIndex;
    }
  }

  function isWhitespaceAsciiCharCode(uint8 _code)
    private
    pure
    returns(bool isWhitespace)
  {
    return 
      // codes of all ASCII chars recognized as whitespace, source: https://en.wikipedia.org/wiki/Whitespace_character
      _code == 9  // tabulator \t
      || _code == 10  // newline \n
      || _code == 11  // vertical tab \v
      || _code == 12  // formfeed \f
      || _code == 13  // carriage return \r
      || _code == 32;  // space
  }
}
