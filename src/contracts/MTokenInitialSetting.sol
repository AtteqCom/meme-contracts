// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {MTokenInitialSettingInterface} from "./interfaces/MTokenInitialSettingInterface.sol";

/// @title MTokenInitialSetting
/// @dev Contract providing initial setting for creation of MToken contracts
contract MTokenInitialSetting is Ownable, MTokenInitialSettingInterface {


    string internal constant ERROR_PRICE_CAN_NOT_BE_ZERO = 'ERROR_PRICE_CAN_NOT_BE_ZERO';
    string internal constant ERROR_INITIAL_SUPPLY_CAN_NOT_BE_ZERO = 'ERROR_INITIAL_SUPPLY_CAN_NOT_BE_ZERO';
    string internal constant ERROR_RESERVE_CURRENCY_WEIGHT_CAN_NOT_BE_ZERO = 'ERROR_RESERVE_CURRENCY_WEIGHT_CAN_NOT_BE_ZERO';
    string internal constant ERROR_RESERVE_CURRENCY_SUPPLY_CAN_NOT_BE_ZERO = 'ERROR_RESERVE_CURRENCY_SUPPLY_CAN_NOT_BE_ZERO';
    string internal constant ERROR_FEE_LIMIT_CAN_NOT_BE_ZERO = 'ERROR_FEE_LIMIT_CAN_NOT_BE_ZERO';
    string internal constant ERROR_FEE_ABOVE_LIMIT = 'ERROR_FEE_ABOVE_LIMIT';
    string internal constant ERROR_FEE_LIMIT_ABOVE_OR_EQAULS_TO_HUNDRED_PERCENT = 'ERROR_FEE_LIMIT_ABOVE_OR_EQAULS_TO_HUNDRED_PERCENT';
    string internal constant ERROR_RESERVE_CURRENCY_WEIGHT_IS_ABOVE_MAX = 'ERROR_RESERVE_CURRENCY_WEIGHT_IS_ABOVE_MAX';

    uint16 internal constant ONE_HUNDRED_PERCENT = 10000;
    uint32 internal constant MAX_RESERVE_CURRENCY_WEIGHT = 1000000;

  /** 
  * @dev Structure what hold MToken initial settings
  * @param mTokenCreationPrice Price of mToken creation/registration
  * @param mTokenInitialSupply Amount of initial supply of newly created
  * @param mTokenInitialFee initial fee to set for newly created mToken
  * @param mTokenInitialFeeLimit initial fee limit to set for newly created mToken
  * @param mTokenReserveCurrencyInitialSupply Amount of reserve currency to be transfered to newly created contract as initial reserve currency supply  
  * @param reserveCurrencyWeight weight of reserve currency compared to created mTokens
  * (creationPrice, initialSupply, fee, feeLimit, reserveCurrencyWeight, reserveCurrencyInitialSupply)
  */
  struct MTokenSetting {
    uint256 creationPrice;
    uint256 initialSupply;
    uint16 fee;
    uint16 feeLimit;
    uint32 reserveCurrencyWeight;
    uint256 reserveCurrencyInitialSupply;
  }

  MTokenSetting public mTokenSetting;

  /**
  * @dev modifier Throws when value is not above zero
  */
  modifier aboveZero(uint256 _value, string memory _error) {
    require(_value > 0, _error);
    _;
  }

  /**
  * @dev modifier Throws when provided _fee is above fee limit property
  */
  modifier feeSmallerThanLimit(uint16 _fee, uint16 _feeLimit) {
    require(_fee < _feeLimit, ERROR_FEE_ABOVE_LIMIT);
    _;
  }

  /**
  * @dev modifier Throws when provided _feeLimit is above fee limit property
  */
  modifier feeLimitSmallerThanHundredPercent(uint16 _feeLimit) {
    require(_feeLimit < ONE_HUNDRED_PERCENT, ERROR_FEE_LIMIT_ABOVE_OR_EQAULS_TO_HUNDRED_PERCENT);
    _;
  }

  /**
  * @dev modifier Throws when provided _feeLimit is above fee limit property
  */
  modifier reserveCurrencyWeightBelowMax(uint32 _reserveCurrencyWeight) {
    require(_reserveCurrencyWeight <= MAX_RESERVE_CURRENCY_WEIGHT, ERROR_RESERVE_CURRENCY_WEIGHT_IS_ABOVE_MAX);
    _;
  }

  constructor(    
    uint256 _creationPrice,
    uint256 _initialSupply,
    uint16 _fee,
    uint16 _feeLimit,
    uint32 _reserveCurrencyWeight,
    uint256 _reserveCurrencyInitialSupply
  ) {
    MTokenSetting memory _mTokenSetting = MTokenSetting(
      _creationPrice,
      _initialSupply,
      _fee,
      _feeLimit,
      _reserveCurrencyWeight,
      _reserveCurrencyInitialSupply
    );

    checkCosntructorRequirements(_mTokenSetting);

    mTokenSetting = _mTokenSetting;
  }

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newInitialSupply new amount of initial supply
  * @param oldInitialSupply old amount of initial supply
  */
  event InitialSupplyChanged(uint256 newInitialSupply, uint256 oldInitialSupply);

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newFee new amount of initial supply
  * @param oldFee old amount of initial supply
  */
  event InitialFeeChanged(uint256 newFee, uint256 oldFee);

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newFeeLimit new amount of initial supply
  * @param oldFeeLimit old amount of initial supply
  */
  event InitialFeeLimitChanged(uint256 newFeeLimit, uint256 oldFeeLimit);


  /**
  * @dev Weight of reserve currency compared to printed mToken coins
  * @param newWeight new weight
  * @param oldWeight old weight
  */
  event ReserveCurrencyWeightChanged(uint32 newWeight, uint32 oldWeight);  


  /**
  * @dev Explicit method returing MTokenSetting structure
  */
  function getMTokenInitialSetting() 
    public
    view
    returns (MTokenSetting memory currentSetting)
  {
    return mTokenSetting;
  }


  /**
  * @dev Explicit method returing MTokenSetting structure
  */
  function getCreationPrice() 
    public
    view
    override
    returns (uint256 creationPrice)
  {
    return mTokenSetting.creationPrice;
  }

  /**
  * @dev Explicit method returing MTokenSetting structure
  */
  function getReserveCurrencyInitialSupply() 
    public
    view
    override
    returns (uint256 creationPrice)
  {
    return mTokenSetting.reserveCurrencyInitialSupply;
  }


  /**
  * @dev Sets new price for creation MToken contracts
  * @param _price new price for MToken creation
  */
  function setCreationPrice(uint256 _price)
    public
    onlyOwner
    aboveZero(_price, ERROR_PRICE_CAN_NOT_BE_ZERO)
  {
    uint256 oldPrice = mTokenSetting.creationPrice;

    mTokenSetting.creationPrice = _price;

    emit CreationPriceChanged(mTokenSetting.creationPrice, oldPrice);
  }

  /**
  * @dev Sets initial supply of reseve currency transfered to newly created mToken.
  * @param _mTokenReserveCurrencyInitialSupply amount of reserve currency as initial supply
  */
  function setReserveCurrencyInitialSupply(uint256 _mTokenReserveCurrencyInitialSupply)
    public
    onlyOwner
    aboveZero(_mTokenReserveCurrencyInitialSupply, ERROR_RESERVE_CURRENCY_SUPPLY_CAN_NOT_BE_ZERO)
  {
    uint256 oldMTokenInitialReserveCurrencySupply = mTokenSetting.reserveCurrencyInitialSupply;

    mTokenSetting.reserveCurrencyInitialSupply = _mTokenReserveCurrencyInitialSupply;

    emit ReserveCurrencyInitialSupplyChanged(mTokenSetting.reserveCurrencyInitialSupply, oldMTokenInitialReserveCurrencySupply);
  }

  /**
  * @dev Sets initial supply of newly created MToken contract.
  * @param _mTokenInitialSupply amount of initial supply
  */
  function setInitialSupply(uint256 _mTokenInitialSupply)
    public
    onlyOwner
    aboveZero(_mTokenInitialSupply, ERROR_INITIAL_SUPPLY_CAN_NOT_BE_ZERO)
  {
    uint256 oldMTokenInitialSupply = mTokenSetting.initialSupply;

    mTokenSetting.initialSupply = _mTokenInitialSupply;

    emit InitialSupplyChanged(mTokenSetting.initialSupply, oldMTokenInitialSupply);
  }

  /**
  * @dev Sets mToken initial invest/sale fee.
  * @param _fee initial fee of newly created mToken
  */
  function setInitialFee(uint16 _fee)
    public
    onlyOwner
    feeSmallerThanLimit(_fee, mTokenSetting.feeLimit)
  {
    uint16 oldFee = mTokenSetting.fee;

    mTokenSetting.fee = _fee;

    emit InitialFeeChanged(mTokenSetting.fee, oldFee);
  }

  /**
  * @dev Sets mToken initial invest/sale fee limit.
  * @param _feeLimit initial fee of newly created mToken
  */
  function setInitialFeeLimit(uint16 _feeLimit)
    public
    onlyOwner
    aboveZero(_feeLimit, ERROR_FEE_LIMIT_CAN_NOT_BE_ZERO)
    feeLimitSmallerThanHundredPercent(_feeLimit)
  {
    uint16 oldFeeLimit = mTokenSetting.feeLimit;

    mTokenSetting.feeLimit = _feeLimit;

    emit InitialFeeLimitChanged(mTokenSetting.feeLimit, oldFeeLimit);
  }

  /**
  * @dev Sets weight of reserve currency compared to mToken coins
  * @param _weight hit some heavy numbers !! :)
  */
  function setReserveCurrencyWeight(uint32 _weight)
    public
    onlyOwner
    aboveZero(_weight, ERROR_RESERVE_CURRENCY_WEIGHT_CAN_NOT_BE_ZERO)
    reserveCurrencyWeightBelowMax(_weight)
  {
    uint32 oldReserveCurrencyWeight = mTokenSetting.reserveCurrencyWeight;

    mTokenSetting.reserveCurrencyWeight = _weight;

    emit ReserveCurrencyWeightChanged(mTokenSetting.reserveCurrencyWeight, oldReserveCurrencyWeight);
  }


  /**
  * @dev modifiers evaluating constructor requirements moved over here to avoid "Stack Too Deep" error
  */
  function checkCosntructorRequirements(MTokenSetting memory _mTokenSetting)
    private
    aboveZero(_mTokenSetting.creationPrice, ERROR_PRICE_CAN_NOT_BE_ZERO)
    aboveZero(_mTokenSetting.initialSupply, ERROR_INITIAL_SUPPLY_CAN_NOT_BE_ZERO)
    aboveZero(_mTokenSetting.reserveCurrencyWeight, ERROR_RESERVE_CURRENCY_WEIGHT_CAN_NOT_BE_ZERO)
    aboveZero(_mTokenSetting.reserveCurrencyInitialSupply, ERROR_RESERVE_CURRENCY_SUPPLY_CAN_NOT_BE_ZERO)
    aboveZero(_mTokenSetting.feeLimit, ERROR_FEE_LIMIT_CAN_NOT_BE_ZERO)
    feeLimitSmallerThanHundredPercent(_mTokenSetting.feeLimit)
    feeSmallerThanLimit(_mTokenSetting.fee, _mTokenSetting.feeLimit)
    reserveCurrencyWeightBelowMax(_mTokenSetting.reserveCurrencyWeight)
  { }
}