// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;



/// @title MTokenInitialSettingInterface
/// @dev Contract providing initial setting for creation of MToken contracts
interface MTokenInitialSettingInterface {

  /**
  * @dev Event emited when MToken creation price change
  * @param newPrice new price of MToken creation
  * @param oldPrice old price of MToken creation
  */
  event CreationPriceChanged(uint256 newPrice, uint256 oldPrice);

  /**
  * @dev Event emited when MToken initial reserve currency changed
  * @param newInitialSupplyOfReserveCurrency new amount of initial supply of reserve currency
  * @param oldInitialSupplyOfReserveCurrency old amount of initial supply of reserve currency
  */
  event ReserveCurrencyInitialSupplyChanged(uint256 newInitialSupplyOfReserveCurrency, uint256 oldInitialSupplyOfReserveCurrency);

  /**
  * @dev Explicit method returing MTokenSetting structure
  */
  function getCreationPrice() 
    external
    view
    returns (uint256 creationPrice);

  /**
  * @dev Explicit method returing MTokenSetting structure
  */
  function getReserveCurrencyInitialSupply() 
    external
    view
    returns (uint256 reserveCurrencyInitialSupply);
}