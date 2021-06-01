// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {MTokenInitialSettingInterface} from "./interfaces/MTokenInitialSettingInterface.sol";

/// @title MTokenInitialSetting
/// @dev Contract providing initial setting for creation of MToken contracts
contract MTokenInitialSetting is Ownable, MTokenInitialSettingInterface {

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

  constructor(    
    uint256 _creationPrice,
    uint256 _initialSupply,
    uint16 _fee,
    uint16 _feeLimit,
    uint32 _reserveCurrencyWeight,
    uint256 _reserveCurrencyInitialSupply
  ) {

      mTokenSetting = MTokenSetting(
        _creationPrice,
        _initialSupply,
        _fee,
        _feeLimit,
        _reserveCurrencyWeight,
        _reserveCurrencyInitialSupply
      );
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
  {
    uint32 oldReserveCurrencyWeight = mTokenSetting.reserveCurrencyWeight;

    mTokenSetting.reserveCurrencyWeight = _weight;

    emit ReserveCurrencyWeightChanged(mTokenSetting.reserveCurrencyWeight, oldReserveCurrencyWeight);
  }



}