// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;


import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Marble Coin Register Interface
 * @dev describes all externaly accessible functions neccessery to run Marble Auctions
 */
interface MTokenInterface is IERC20 {

  /**
  * @dev Sets transaction fee. Fee should be limited in implementation to be not used for market total market control!
  * @param _transactionFee Percent cut the auctioneer takes on each auction, must be between 0-10000. Values 0-10,000 map to 0%-100%.
  */
  function setTransactionFee(
    uint16 _transactionFee
  )
    external;

  /**
  * @dev Amount of Main Currency is invested for mTokens
  * @param _amountOfReserveCurrency amount of mTokens
  */
  function invest(
    uint256 _amountOfReserveCurrency
  )
    external;

  /**
  * @dev Sell share of mTokens and get corrsponding amount of Main Currency
    @param _amountOfTokens amount of mTokens to sell
  */
  function sellShare(
    uint256 _amountOfTokens
  )
    external;

  /**
  * @dev Stops minting of coins.. should be activated in case of bonding curve evaluation is lower than price of token in external markets
  */
  function pauseMinting()
    external;

  /**
  * @dev Activates minting of coins.. 
  */
  function unpauseMinting()
    external;

  /**
  * @dev Create mToken with provided name.
  */
  function isMintingPaused()
    external
    view
    returns (bool);

  event Invested(
    address investor, 
    uint256 feeInReserveCurrency, 
    uint256 investmentInReserveCurrency, 
    uint256 gainedAmountOfMTokens);

  event SoldShare(
    address investor,
    uint256 feeInReserveCurrency, 
    uint256 revenueInReserveCurrency, 
    uint256 amountSoldOfMTokens);

  event TransactionFeeChanged(
    uint256 newFee,
    uint256 oldFee);

}