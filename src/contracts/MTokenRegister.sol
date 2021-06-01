// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MTokenFactoryInterface} from "./interfaces/MTokenFactoryInterface.sol";
import {MTokenInitialSettingInterface} from "./interfaces/MTokenInitialSettingInterface.sol";
import {MTokenRegisterInterface} from "./interfaces/MTokenRegisterInterface.sol";
import {StringUtils} from "./libraries/StringUtils.sol";



/// @title ERC721 token
/// @dev This is used only for unit tests
contract MTokenRegister is Ownable, AccessControl, MTokenRegisterInterface {

  struct MemecoinRegistration {
    uint256 index;
    address factoryAddress;
    address creator;
  }


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
  string public constant ERROR_NAME_IS_TAKEN = 'ERROR_NAME_IS_TAKEN';
  string public constant ERROR_SYMBOL_IS_TAKEN = 'ERROR_SYMBOL_IS_TAKEN';

  /**
  * @dev reserve currency 
  */
  ERC20 public memecoin;

  /**
  * @dev contract creating specific instance/version of mToken contract
  */
  MTokenFactoryInterface public mTokenFactory;


  /**
  * @dev contract creating specific instance/version of mToken contract
  */
  MTokenInitialSettingInterface public mTokenInitialSetting;
 
  /**
  * @dev holds symbolic mToken registration IDs mapped to mToken contract addresses
  * (address) 0..n => MemecoinRegistration (mToken contract addresses)
  */
  mapping(address => MemecoinRegistration) public mTokenRegister;
  address[] public memecoinRegisterIndex;

  /**
  * @dev helper index, maps numeric hashes of mToken contract names to symbolic mToken registration ids
  */
  mapping(uint256 => address) public nameHashIndex;


  /**
  * @dev helper index, maps numeric hashes of mToken contract names to symbolic mToken registration ids
  */
  mapping(uint256 => address) public symbolHashIndex;

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
  * @dev Event emited when a new MTokenSetting is set
  * @param newMTokenInitialSetting Address of the new MTokeSetting address
  * @param oldMTokenInitialSetting Address of the old MTokeSetting address
  */
  event MTokenInitialSettingChanged(address newMTokenInitialSetting, address oldMTokenInitialSetting);

  /**
  * @dev modifier Throws if called by any account other than the owner.
  */
  modifier onlyUniqueName(string memory _name) {
    require(!isNameRegistered(_name), ERROR_NAME_IS_TAKEN);
    _;
  }

  /**
  * @dev modifier Throws if called by any account other than the owner.
  */
  modifier onlyUniqueSymbol(string memory _symbol) {
    require(!isSymbolRegistered(_symbol), ERROR_SYMBOL_IS_TAKEN);
    _;
  }

  constructor() {

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
  * @dev Sets new MTokenFactory contract and grants MTOKEN_FACTORY_ROLE to it.
  * @param _mTokenInitialSetting Address of new MTokenFactory contract
  */
  function setMTokenInitialSetting(MTokenInitialSettingInterface _mTokenInitialSetting)
    public
    onlyOwner 
  {
    address oldMTokenInitialSetting = address(mTokenInitialSetting);

    mTokenInitialSetting = _mTokenInitialSetting;

    emit MTokenInitialSettingChanged(address(mTokenInitialSetting), oldMTokenInitialSetting);
  }



  /**
  * @dev Creates MToken contract after reserve currency transfer, caller has to add allowence to contract before calling.
  * @param _mTokenName Name of new MToken contract, lower-case should be unique in the register
  * @param _mTokenSymbol Symbol of new MToken contract, lower-case should be unique in the register
  */
  function createMToken(string memory _mTokenName, string memory _mTokenSymbol)
    external
    override
    onlyUniqueName(_mTokenName)
    onlyUniqueSymbol(_mTokenSymbol)
    returns(uint256 index)
  {
    require(address(0) != address(memecoin), ERROR_MEME_COIN_CONTRACT_IS_NOT_SET);
    require(address(0) != address(mTokenFactory), ERROR_FACTORY_CONTRACT_IS_NOT_SET);
    require(_hasCreatorCorrectAllowance(msg.sender), ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE);
    require(_hasCreatorEnoughBalance(msg.sender), ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE);
    require(StringUtils.containsOnlyAsciiPrintableChars(_mTokenName), ERROR_MEME_TOKEN_NAME_CONTAINS_INVALID_CHARS);
    require(StringUtils.containsOnlyAsciiPrintableChars(_mTokenSymbol), ERROR_MEME_TOKEN_SYMBOL_CONTAINS_INVALID_CHARS);

    _mTokenName = StringUtils.stripWhitespace(_mTokenName);
    require(bytes(_mTokenName).length > 0, ERROR_MEME_TOKEN_NAME_EMPTY_OR_WHITESPACES_ONLY);
    _mTokenSymbol = StringUtils.stripWhitespace(_mTokenSymbol);
    require(bytes(_mTokenSymbol).length > 0, ERROR_MEME_TOKEN_SYMBOL_EMPTY_OR_WHITESPACES_ONLY);

    uint256 reserveCurrencyInitialSupply = mTokenInitialSetting.getReserveCurrencyInitialSupply();
    uint256 creationPrice = mTokenInitialSetting.getCreationPrice();

    // pay owner price for mToken creation
    memecoin.transferFrom(msg.sender, owner(), creationPrice);

    // create
    address mTokenAddress = mTokenFactory.createMToken(_mTokenName, _mTokenSymbol);

    // add mToken to register
    uint256 numericHashOfTokenName = getNumericHashFromString(_mTokenName);
    uint256 numericHashOfTokenSymbolName = getNumericHashFromString(_mTokenSymbol);

    memecoinRegisterIndex.push(mTokenAddress);
    mTokenRegister[mTokenAddress] = MemecoinRegistration(memecoinRegisterIndex.length, address(mTokenFactory), msg.sender);
    symbolHashIndex[numericHashOfTokenSymbolName] = mTokenAddress;
    nameHashIndex[numericHashOfTokenName] = mTokenAddress;

    // adds initial funds of reserveCurrency to mToken contract
    memecoin.transferFrom(msg.sender, address(mTokenAddress), reserveCurrencyInitialSupply);

    emit MTokenRegistered(mTokenAddress, creationPrice, reserveCurrencyInitialSupply);

    return memecoinRegisterIndex.length -1;
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
    return memecoinRegisterIndex.length;
  }

  /**
  * @dev Returns true if name is already registered
  * @param _name name of mToken
  */
  function isNameRegistered(string memory _name)
    public
    view
    returns (bool isRegistered)
  {
    if (memecoinRegisterIndex.length == 0) {
      return false;
    }

    uint256 nameHash = getNumericHashFromString(_name);
    address mTokenAddress = nameHashIndex[nameHash];

    if (mTokenAddress == address(0)) {
      return false;
    }

    ERC20 mToken = ERC20(nameHashIndex[nameHash]);
    return getNumericHashFromString(mToken.name()) == nameHash;
  }

  /**
  * @dev Returns true if name is already registered
  * @param _symbol name of mToken
  */
  function isSymbolRegistered(string memory _symbol)
    public
    view
    returns (bool isRegistered)
  {
    if (memecoinRegisterIndex.length == 0) {
      return false;
    }

    uint256 symbolHash = getNumericHashFromString(_symbol);
    address mTokenAddress = symbolHashIndex[symbolHash];

    if (mTokenAddress == address(0)) {
      return false;
    }

    ERC20 mToken = ERC20(symbolHashIndex[symbolHash]);
    return getNumericHashFromString(mToken.symbol()) == symbolHash;
  }

  /**
   * @dev Total cost of MToken creation
   */
  function getCreationTotalCosts()
    public
    view
    returns(uint256 result)
  {
    return mTokenInitialSetting.getCreationPrice() + mTokenInitialSetting.getReserveCurrencyInitialSupply();
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
   * Returns the position of first not-space character in the string. Returns _bStr.length if the string consists only of space chars.
   */
  function _hasCreatorCorrectAllowance(address creator)
    private
    view
    returns(bool result)
  {
    return memecoin.allowance(creator, address(this)) >= getCreationTotalCosts();
  }

  /**
   * Returns the position of first not-space character in the string. Returns _bStr.length if the string consists only of space chars.
   */
  function _hasCreatorEnoughBalance(address creator)
    private
    view
    returns(bool result)
  {
    return memecoin.balanceOf(creator) >= getCreationTotalCosts();
  }
}
