// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MTokenFactoryInterface} from "./interfaces/MTokenFactoryInterface.sol";
import {MemecoinRegisterInterface} from "./interfaces/MemecoinRegisterInterface.sol";

/// @title ERC721 token
/// @dev This is used only for unit tests
contract MemecoinRegister is Ownable, AccessControl, MemecoinRegisterInterface {

  bytes32 public constant MTOKEN_FACTORY_ROLE = keccak256("MTOKEN_FACTORY_ROLE");

  string public constant ERROR_MTOKEN_ADDRESS_IS_REQUIRED = 'ERROR_MTOKEN_ADDRESS_IS_REQUIRED';
  string public constant ERROR_CALLER_IS_NOT_MTOKEN_FACTORY = 'ERROR_CALLER_IS_NOT_MTOKEN_FACTORY';
  string public constant ERROR_FACTORY_CONTRACT_IS_NOT_SET = 'ERROR_FACTORY_CONTRACT_IS_NOT_SET';
  string public constant ERROR_MEME_COIN_CONTRACT_IS_NOT_SET = 'ERROR_MEME_COIN_CONTRACT_IS_NOT_SET';
  string public constant ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE = 'ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE';
  string public constant ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE = 'ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE';
  string public constant ERROR_MEME_TOKEN_NAME_CONTAINS_INVALID_CHARS = 'ERROR_MEME_TOKEN_NAME_CONTAINS_INVALID_CHARS';
  string public constant ERROR_MEME_TOKEN_SYMBOL_CONTAINS_INVALID_CHARS = 'ERROR_MEME_TOKEN_SYMBOL_CONTAINS_INVALID_CHARS';
  string public constant ERROR_MEME_TOKEN_NAME_EMPTY_OR_WHITESPACES_ONLY = 'ERROR_MEME_TOKEN_NAME_EMPTY_OR_WHITESPACES_ONLY';
  string public constant ERROR_MEME_TOKEN_SYMBOL_EMPTY_OR_WHITESPACES_ONLY = 'ERROR_MEME_TOKEN_SYMBOL_EMPTY_OR_WHITESPACES_ONLY';

  ERC20 public memecoin;
  MTokenFactoryInterface public mTokenFactory;
 
  /**
  * @dev holds symbolic mToken registration IDs mapped to mToken contract addresses
  * (ids) 0..n => address_0..address_n (mToken contract addresses)
  */
  mapping(uint256 => address) public memecoinRegister;

  /**
  * @dev helper index, maps numeric hashes of mToken contract names to symbolic mToken registration ids
  * mToken_hash_0..mToken_hash_n => 0..n
  */
  mapping(uint256 => uint256) public memecoinRegisterIndex;

  /**
  * @dev helper index, maps numeric hashes of mToken contract names to symbolic mToken registration ids
  * symbol_hash_0..symbol_hash_n => 0..n
  */
  mapping(uint256 => uint256) public memecoinSymbolRegisterIndex;

  /**
  * @dev count of registered mToken contracts, or register Id of next regitered mToken contract
  */ 
  uint256 private _memecoinRegisterCount;

  /** 
  * @dev Price of mToken creation/registration 
  */
  uint256 public mTokenCreationPrice = 0;

  /** 
  * @dev Amount of reserve currency to be transfered to newly created contract as initial reserve currency supply  
  */
  uint256 public mTokenReserveCurrencyInitialSupply = 0;

 
  /**
  * @dev Event emited when a new MTokenFactory contract is set
  * @param newMTokenFactory Address of the new MTokenFactory address
  * @param oldMTokenFactory Address of the old MTokenFactory address
  */
  event MTokenFactoryChanged(address newMTokenFactory, address oldMTokenFactory);


  /**
  * @dev Event emited when a new Memecoin contract is set
  * @param newReserveCurrency Address of the new Memecoin address
  * @param oldReserveCurrency Address of the old Memecoin address
  */
  event ReserveCurrencyChanged(address newReserveCurrency, address oldReserveCurrency);

  /**
  * @dev Event emited when MToken creation price change
  * @param newPrice new price of MToken creation
  * @param oldPrice old price of MToken creation
  */
  event MTokenCreationPriceChanged(uint256 newPrice, uint256 oldPrice);

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newInitialSupply new amount of initial supply
  * @param oldInitialSupply old amount of initial supply
  */
  event MTokenReserveCurrencyInititalSupplyChanged(uint256 newInitialSupply, uint256 oldInitialSupply);

  constructor() {
    _memecoinRegisterCount = 0;

    // Grant the contract deployer the default admin role: it will be able
    // to grant and revoke any roles
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  /**
  * @dev Sets new MTokenFactory contract and grants MTOKEN_FACTORY_ROLE to it.
  * @param _reserveCurrency Address of new MTokenFactory contract
  */
  function setReserveCurrency(ERC20 _reserveCurrency)
    public
    onlyOwner 
  {
    address oldReserveCurrencyAddress = address(memecoin);
    memecoin = _reserveCurrency;

    emit ReserveCurrencyChanged(address(_reserveCurrency), oldReserveCurrencyAddress);
  }


  /**
  * @dev Sets new MTokenFactory contract and grants MTOKEN_FACTORY_ROLE to it.
  * @param _mTokenFactory Address of new MTokenFactory contract
  */
  function setMTokenFactory(MTokenFactoryInterface _mTokenFactory)
    public
    onlyOwner 
  {
    address oldMTokenFactoryAddress = address(mTokenFactory);
    address newMTokenFactoryAddress = address(_mTokenFactory);

    // remove previouse factory
    if (hasRole(MTOKEN_FACTORY_ROLE, oldMTokenFactoryAddress)) {
      revokeRole(MTOKEN_FACTORY_ROLE, oldMTokenFactoryAddress);
    }

    grantRole(MTOKEN_FACTORY_ROLE, address(_mTokenFactory));
    mTokenFactory = _mTokenFactory;

    emit MTokenFactoryChanged(newMTokenFactoryAddress, oldMTokenFactoryAddress);
  }

  /**
  * @dev Sets new price for creation MToken contracts
  * @param _price new price for MToken creation
  */
  function setMTokenCreationPrice(uint256 _price)
    public
    onlyOwner 
  {
    uint256 oldPrice = mTokenCreationPrice;

    mTokenCreationPrice = _price;

    emit MTokenCreationPriceChanged(mTokenCreationPrice, oldPrice);
  }

  /**
  * @dev Sets new MTokenFactory contract and grants MTOKEN_FACTORY_ROLE to it.
  * @param _mTokenReserveCurrencyInitialSupply Address of new MTokenFactory contract
  */
  function setMTokenReserveCurrencyInititalSupply(uint256 _mTokenReserveCurrencyInitialSupply)
    public
    onlyOwner 
  {
    uint256 oldMTokenInitialReserveCurrencySupply = mTokenReserveCurrencyInitialSupply;

    mTokenReserveCurrencyInitialSupply = _mTokenReserveCurrencyInitialSupply;

    emit MTokenReserveCurrencyInititalSupplyChanged(mTokenReserveCurrencyInitialSupply, oldMTokenInitialReserveCurrencySupply);
  }

  /**
  * @dev Creates MToken contract after reserve currency transfer, caller has to add allowence to contract before calling.
  * @param _mTokenName Name of new MToken contract, lower-case should be unique in the register
  * @param _mTokenSymbol Symbol of new MToken contract, lower-case should be unique in the register
  */
  function createMToken(string memory _mTokenName, string memory _mTokenSymbol)
    external
    override
  {
    require(address(0) != address(memecoin), ERROR_MEME_COIN_CONTRACT_IS_NOT_SET);
    require(address(0) != address(mTokenFactory), ERROR_FACTORY_CONTRACT_IS_NOT_SET);
    require(memecoin.allowance(msg.sender, address(this)) >= mTokenCreationPrice + mTokenReserveCurrencyInitialSupply, ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE);
    require(memecoin.balanceOf(msg.sender) >= mTokenCreationPrice + mTokenReserveCurrencyInitialSupply, ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE);
    require(containsOnlyAsciiPrintableChars(_mTokenName), ERROR_MEME_TOKEN_NAME_CONTAINS_INVALID_CHARS);
    require(containsOnlyAsciiPrintableChars(_mTokenSymbol), ERROR_MEME_TOKEN_SYMBOL_CONTAINS_INVALID_CHARS);

    _mTokenName = stripSpaceCharacters(_mTokenName);
    require(bytes(_mTokenName).length > 0, ERROR_MEME_TOKEN_NAME_EMPTY_OR_WHITESPACES_ONLY);
    _mTokenSymbol = stripSpaceCharacters(_mTokenSymbol);
    require(bytes(_mTokenSymbol).length > 0, ERROR_MEME_TOKEN_SYMBOL_EMPTY_OR_WHITESPACES_ONLY);

    // TODO check uniqueness of name 
    // TODO check uniqueness of symbol

    memecoin.transferFrom(msg.sender, owner(), mTokenCreationPrice);

    // create
    address mTokenAddress = mTokenFactory.createMToken(_mTokenName, _mTokenSymbol);

    // adds initial funds of reserveCurrency to mToken contract
    memecoin.transferFrom(msg.sender, address(mTokenAddress), mTokenReserveCurrencyInitialSupply);

    emit MTokenRegistered(mTokenAddress, mTokenCreationPrice, mTokenReserveCurrencyInitialSupply);
  }
  

  /**
  * @dev Adds newly created MToken contract to register. Can be call just by sender with MTOKEN_FACTORY_ROLE role granted.
  * @param _mTokenContract ERC20 of new MToken contract
  */
  function addMToken(ERC20 _mTokenContract)
    external
    override
  {
    require(hasRole(MTOKEN_FACTORY_ROLE, msg.sender), ERROR_CALLER_IS_NOT_MTOKEN_FACTORY);
    require(address(0) != address(_mTokenContract), ERROR_MTOKEN_ADDRESS_IS_REQUIRED);

    uint256 numericHashOfTokenName = getNumericHashFromString(_mTokenContract.name());
    uint256 numericHashOfTokenSymbolName = getNumericHashFromString(_mTokenContract.symbol());

    memecoinRegister[_memecoinRegisterCount] = address(_mTokenContract);
    memecoinRegisterIndex[numericHashOfTokenName] = _memecoinRegisterCount;
    memecoinSymbolRegisterIndex[numericHashOfTokenSymbolName] = _memecoinRegisterCount;

    _memecoinRegisterCount = _memecoinRegisterCount +1;
  }


  /**
  * @dev View returns count of registered MToken contracts  
  */
  function totalRegistered() 
    public
    override
    view 
    returns (uint256 mtokensRegisteredCount)
  {
    return _memecoinRegisterCount;
  }


  /**
  * @dev Transforms given string to its numeric hash representation
  * @param _stringToNumericHash name or symbol to transfor to hash
  */
  function getNumericHashFromString(string memory _stringToNumericHash)
    public
    pure
    returns(uint256 stringToNumericHash)
  {
    return uint256(keccak256(abi.encodePacked(_stringToNumericHash)));
  }

  /**
   * @dev Check whether given string contains only ascii chars with code between 32 and 126 (inclusively)
   * @param _str a string to check
   * @return containsOnlyAsciiPrintableChars true if the given string contains only allowed ascii chars, otherwise false
   */
  function containsOnlyAsciiPrintableChars(string memory _str)
    public
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
    public 
    pure 
    returns (string memory strToLower) 
  {
    bytes memory bStr = bytes(strToLower);
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
   * @dev Remove ASCII space characters (char with ASCII code 32) from the beginning and end of the string
   * @param _str string for stripping the spaces
   */
  function stripSpaceCharacters(string memory _str)
    public
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
      if (uint8(_bStr[i]) != 32) {
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
      if (uint8(_bStr[i]) != 32) {
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
}
