// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;


import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MTokenFactoryInterface} from "./MTokenFactoryInterface.sol";


/**
 * @title Marble Coin Register Interface
 * @dev describes all externaly accessible functions neccessery to run Marble Auctions
 */
interface MemecoinRegisterInterface {

  /**
  * @dev Create mToken with provided name.
  * @param _mTokenName Percent cut the auctioneer takes on each auction, must be between 0-10000. Values 0-10,000 map to 0%-100%.
  * @param _mTokenSymbol Percent cut the auctioneer takes on each auction, must be between 0-10000. Values 0-10,000 map to 0%-100%.
  */
  function createMToken(
    string calldata _mTokenName, string calldata _mTokenSymbol
  )
   external
   returns(uint256 index);


  /**
  * @dev Add new contract as registered one.
  */
  function totalRegistered()
   external 
   view 
   returns (uint256 mtokensRegisteredCount);

  
  /**
  * @dev Event emited when a new MToken is created and added to register
  * @param mTokenContract Address of new MToken contract
  */
  event MTokenRegistered(address mTokenContract, uint256 creationPrice, uint256 initialReserveCurrencySupply);
}
