// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;


/**
 * @title Marble Coin Register Interface
 * @dev describes all externaly accessible functions neccessery to run Marble Auctions
 */
interface MTokenFactoryInterface {


  /**
  * @dev Create mToken with provided name.
  * @param _mTokenName Percent cut the auctioneer takes on each auction, must be between 0-10000. Values 0-10,000 map to 0%-100%.
  */
  function createMToken(
    string calldata _mTokenName, string calldata _mTokenSymbol
  )
   external returns(address mTokenContract);

  /**
  * @dev Event emited when a new MTokenRegister contract is set
  * @param mTokenContract Contract of newly created MToken contract
  */
  event MTokenCreated(address mTokenContract);

}