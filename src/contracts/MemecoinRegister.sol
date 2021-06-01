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

  struct MemecoinRegistration {
    uint256 index;
    address factoryAddress;
    address creator;
  }

  /** 
  * @dev 
  * @param mTokenCreationPrice Price of mToken creation/registration
  * @param mTokenInitialSupply Amount of initial supply of newly created
  * @param mTokenInitialFee initial fee to set for newly created mToken
  * @param mTokenInitialFeeLimit initial fee limit to set for newly created mToken
  * @param mTokenReserveCurrencyInitialSupply Amount of reserve currency to be transfered to newly created contract as initial reserve currency supply  
  * @param reserveCurrencyWeight weight of reserve currency compared to created mTokens
  */
  struct MTokenSetting {
    uint256 mTokenCreationPrice;
    uint256 mTokenInitialSupply;
    uint16 mTokenInitialFee;
    uint16 mTokenInitialFeeLimit;
    uint256 reserveCurrencyWeight;
    uint256 mTokenReserveCurrencyInitialSupply;
  }

  bytes32 public constant MTOKEN_FACTORY_ROLE = keccak256("MTOKEN_FACTORY_ROLE");

  string public constant ERROR_MTOKEN_ADDRESS_IS_REQUIRED = 'ERROR_MTOKEN_ADDRESS_IS_REQUIRED';
  string public constant ERROR_CALLER_IS_NOT_MTOKEN_FACTORY = 'ERROR_CALLER_IS_NOT_MTOKEN_FACTORY';
  string public constant ERROR_FACTORY_CONTRACT_IS_NOT_SET = 'ERROR_FACTORY_CONTRACT_IS_NOT_SET';
  string public constant ERROR_MEME_COIN_CONTRACT_IS_NOT_SET = 'ERROR_MEME_COIN_CONTRACT_IS_NOT_SET';
  string public constant ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE = 'ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE';
  string public constant ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE = 'ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE';
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
  * @dev holds symbolic mToken registration IDs mapped to mToken contract addresses
  * (address) 0..n => MemecoinRegistration (mToken contract addresses)
  */
  mapping(address => MemecoinRegistration) public memecoinRegister;
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
  * @dev Event emited when MToken creation price change
  * @param newPrice new price of MToken creation
  * @param oldPrice old price of MToken creation
  */
  event MTokenCreationPriceChanged(uint256 newPrice, uint256 oldPrice);

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newInitialSupplyOfReserveCurrency new amount of initial supply of reserve currency
  * @param oldInitialSupplyOfReserveCurrency old amount of initial supply of reserve currency
  */
  event MTokenReserveCurrencyInititalSupplyChanged(uint256 newInitialSupplyOfReserveCurrency, uint256 oldInitialSupplyOfReserveCurrency);

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newInitialSupply new amount of initial supply
  * @param oldInitialSupply old amount of initial supply
  */
  event MTokenInitialSupplyChanged(uint256 newInitialSupply, uint256 oldInitialSupply);

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newInitialSupply new amount of initial supply
  * @param oldInitialSupply old amount of initial supply
  */
  event MTokenInititalSupplyChanged(uint256 newInitialSupply, uint256 oldInitialSupply);

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
  * @dev Sets initial supply of reseve currency transfered to newly created mToken.
  * @param _mTokenReserveCurrencyInitialSupply amount of reserve currency as initial supply
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
  * @dev Sets initial supply of newly created MToken contract.
  * @param _mTokenInitialSupply amount of initial supply
  */
  function setMTokenInititalSupply(uint256 _mTokenInitialSupply)
    public
    onlyOwner
  {
    uint256 oldMTokenInitialSupply = mTokenInitialSupply;

    mTokenInitialSupply = _mTokenInitialSupply;

    emit MTokenInititalSupplyChanged(mTokenInitialSupply, oldMTokenInitialSupply);
  }

  /**
  * @dev Sets mToken initial invest/sale fee.
  * @param _fee initial fee of newly created mToken
  */
  function setMTokenInitialFee(uint16 _fee)
    public
    onlyOwner
  {
    uint16 oldFee = mTokenInitialFee;

    mTokenInitialFee = _fee;

    emit MTokenInitialFeeChanged(mTokenInitialFee, oldFee);
  }

  /**
  * @dev Sets mToken initial invest/sale fee limit.
  * @param _feeLimit initial fee of newly created mToken
  */
  function setMTokenInitialFeeLimit(uint16 _feeLimit)
    public
    onlyOwner
  {
    uint16 oldFeeLimit = mTokenInitialFeeLimit;

    mTokenInitialFeeLimit = _feeLimit;

    emit MTokenInitialFeeLimitChanged(mTokenInitialFeeLimit, oldFeeLimit);
  }

  /**
  * @dev Sets weight of reserve currency compared to mToken coins
  * @param _weight hit some heavy numbers !! :)
  */
  function setReserveCurrencyWeight(uint256 _weight)
    public
    onlyOwner
  {
    uint256 oldReserveCurrencyWeight = reserveCurrencyWeight;

    reserveCurrencyWeight = _weight;

    emit ReserveCurrencyChanged(reserveCurrencyWeight, oldReserveCurrencyWeight);
  }


  /**
  * @dev Creates MToken contract after reserve currency transfer, caller has to add allowence to contract before calling.
  * @param _mTokenName Name of new MToken contract, lower-case should be unique in the register
  * @param _mTokenSymbol Symbol of new MToken contract, lower-case should be unique in the register
  */
  function createMToken(string calldata _mTokenName, string calldata _mTokenSymbol)
    external
    override
    onlyUniqueName(_mTokenName)
    onlyUniqueSymbol(_mTokenSymbol)
    returns(uint256 index)
  {
    require(address(0) != address(memecoin), ERROR_MEME_COIN_CONTRACT_IS_NOT_SET);
    require(address(0) != address(mTokenFactory), ERROR_FACTORY_CONTRACT_IS_NOT_SET);
    require(memecoin.allowance(msg.sender, address(this)) >= mTokenCreationPrice + mTokenReserveCurrencyInitialSupply, ERROR_CREATOR_ALLOWANCE_LOWER_THAN_CREATION_PRICE);
    require(memecoin.balanceOf(msg.sender) >= mTokenCreationPrice + mTokenReserveCurrencyInitialSupply, ERROR_CREATOR_BALANCE_LOWER_THAN_CREATION_PRICE);

    // pay owner price for mToken creation
    memecoin.transferFrom(msg.sender, owner(), mTokenCreationPrice);

    // create
    address mTokenAddress = mTokenFactory.createMToken(_mTokenName, _mTokenSymbol);

    // add mToken to register
    uint256 numericHashOfTokenName = getNumericHashFromString(_mTokenName);
    uint256 numericHashOfTokenSymbolName = getNumericHashFromString(_mTokenSymbol);

    memecoinRegisterIndex.push(mTokenAddress);
    memecoinRegister[mTokenAddress] = MemecoinRegistration(memecoinRegisterIndex.length, address(mTokenFactory), msg.sender);
    symbolHashIndex[numericHashOfTokenSymbolName] = mTokenAddress;
    nameHashIndex[numericHashOfTokenName] = mTokenAddress;

    // adds initial funds of reserveCurrency to mToken contract
    memecoin.transferFrom(msg.sender, address(mTokenAddress), mTokenReserveCurrencyInitialSupply);

    emit MTokenRegistered(mTokenAddress, mTokenCreationPrice, mTokenReserveCurrencyInitialSupply);

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
  * @dev Transforms given string to its lowercase
  * source from https://gist.github.com/thomasmaclean/276cb6e824e48b7ca4372b194ec05b97#gistcomment-3310610
  * @param _strToLowerSource string to change to lower case
  */
  function transformToLowercase(string memory _strToLowerSource) 
    public 
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
  
}