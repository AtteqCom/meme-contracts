// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {StringUtils} from "../libraries/StringUtils.sol";

contract StringUtilsTestContract {

  function containsOnlyAsciiPrintableChars(string memory _str)
    public
    pure
    returns(bool containsOnlyAsciiPrintableChars)
  {
    return StringUtils.containsOnlyAsciiPrintableChars(_str);
  }

  function transformToLowercase(string memory _strToLowerSource) 
    public 
    pure 
    returns (string memory strToLower) 
  {
    return StringUtils.transformToLowercase(_strToLowerSource);
  }

  function stripWhitespace(string memory _str)
    public
    pure
    returns(string memory strippedStr)
  {
    return StringUtils.stripWhitespace(_str);
  }
}
