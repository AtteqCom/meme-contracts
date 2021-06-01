// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

import {IBancorFormula} from "./bancor/IBancorFormula.sol";
import {MTokenInterface} from "./interfaces/MTokenInterface.sol";

/// @title ERC20 token
/// @dev This is used only for unit tests
contract MToken is Ownable, Pausable, ERC20, MTokenInterface  {

  string public constant ERROR_FEE_IS_ABOVE_LIMIT = 'ERROR_FEE_IS_ABOVE_LIMIT';

  string public constant ERROR_CALLER_HAS_NOT_ENOUGH_MTOKENS_TO_SELL = 'ERROR_CALLER_HAS_NOT_ENOUGH_MTOKENS_TO_SELL';

  uint256 public constant ONE_MTOKEN = 1e18;

  /**
  * @dev Transaction fee applied to invest and sale prices where 1% is equal to 100. 100% equals to 10000
  */
  uint16 public transactionFee;

  /**
  * @dev Transaction fee limit.. limits fee to max 10% of reserveCurrency
  */
  uint16 public transactionFeeLimit;


  /**
  * @dev Contracts reserve currency   
  */
  ERC20 public reserveCurrency;


  /**
  * @dev Reverse weight can not be changed after creation, one of Bancors properties   
  */
  uint32 public reserveWeight;


  /**
  * @dev Bancor formula providing token minting and burning strategy   
  */
  IBancorFormula public bancorFormula;

  constructor(
    address _owner,
    uint256 _initialSupply,
    string memory _memeTokenName, 
    string memory _memeTokenSymbol,
    ERC20 _reserveCurrency,
    uint32 _reserveWeight,
    uint16 _fee,
    uint16 _feeLimit,
    IBancorFormula _formula) ERC20(_memeTokenName, _memeTokenSymbol)
  {

    transferOwnership(_owner);

    _mint(address(this), _initialSupply);

    reserveCurrency = _reserveCurrency;
    reserveWeight = _reserveWeight;

    transactionFee = _fee;
    transactionFeeLimit = _feeLimit;

    bancorFormula = _formula;
  }

  /**
  * @dev Sets transaction fee. Fee should be limited in implementation to be not used for market total market control!
  * @param _transactionFee Percent cut the auctioneer takes on each auction, must be between 0-10000. Values 0-10,000 map to 0%-100%.
  */
  function setTransactionFee(
    uint16 _transactionFee
  )
    external
    override
    onlyOwner
  {

    require(transactionFeeLimit > _transactionFee, ERROR_FEE_IS_ABOVE_LIMIT);
    uint256 oldFee = transactionFee;
    transactionFee = _transactionFee;

    emit TransactionFeeChanged(transactionFee, oldFee);
  }

  /**
  * @dev Amount of Main Currency is invested for mTokens
  * @param _amountOfReserveCurrency amount of mTokens
  */
  function invest(
    uint256 _amountOfReserveCurrency
  )
    external
    override
    whenNotPaused
  {
    uint256 fee = computeFee(_amountOfReserveCurrency);
    uint256 amountOfReserveCurrencyExcludingFee = _amountOfReserveCurrency - fee;

    uint256 reserveBalance = reserveCurrency.balanceOf(address(this));
    uint256 mTokenAmount = bancorFormula.purchaseTargetAmount(totalSupply(), reserveBalance, reserveWeight, amountOfReserveCurrencyExcludingFee);
    

    reserveCurrency.transferFrom(msg.sender, address(this), amountOfReserveCurrencyExcludingFee);
    reserveCurrency.transferFrom(msg.sender, owner(), fee);
    _mint(msg.sender, mTokenAmount);

    emit Invested(msg.sender, amountOfReserveCurrencyExcludingFee, amountOfReserveCurrencyExcludingFee, mTokenAmount);
  }

  /**
  * @dev Sell share of mTokens and get corrsponding amount of Main Currency
    @param _amountOfMTokens amount of mTokens to sell
  */
  function sellShare(
    uint256 _amountOfMTokens
  )
    external
    override
  {
    require(balanceOf(msg.sender) >= _amountOfMTokens, ERROR_CALLER_HAS_NOT_ENOUGH_MTOKENS_TO_SELL);

    uint256 reserveBalance = reserveCurrency.balanceOf(address(this));
    uint256 reserveCurrencyAmountToReturnTotal = bancorFormula.saleTargetAmount(totalSupply(), reserveBalance, reserveWeight, _amountOfMTokens);
    uint256 fee = computeFee(reserveCurrencyAmountToReturnTotal);
    uint256 reserveCurrencyAmountToReturn = reserveCurrencyAmountToReturnTotal - fee;

    reserveCurrency.transfer(msg.sender, reserveCurrencyAmountToReturn);
    reserveCurrency.transfer(owner(), fee);
    _burn(msg.sender, _amountOfMTokens);

    emit SoldShare(msg.sender, fee, reserveCurrencyAmountToReturn, _amountOfMTokens);
  }

  /**
  * @dev Calculate amount of mTokens obtained by investing the given amount of Main Currency.
  * @param _amountOfReserveCurrency amount of Main Currency
  */
  function calculateInvestReward(
    uint256 _amountOfReserveCurrency
  )
    external
    override
    view
    returns (uint256)
  {
    uint256 fee = computeFee(_amountOfReserveCurrency);
    uint256 amountOfReserveCurrencyExcludingFee = _amountOfReserveCurrency - fee;

    uint256 reserveBalance = reserveCurrency.balanceOf(address(this));
    uint256 mTokenAmount = bancorFormula.purchaseTargetAmount(totalSupply(), reserveBalance, reserveWeight, amountOfReserveCurrencyExcludingFee);

    return mTokenAmount;    
  }

  /**
  * @dev Calculate amount of Main Currency obtained by selling the given amount of Mtokens.
    @param _amountOfMTokens amount of mTokens to sell
  */
  function calculateSellShareReward(
    uint256 _amountOfMTokens
  )
    external
    override
    view
    returns (uint256)
  {
    uint256 reserveBalance = reserveCurrency.balanceOf(address(this));
    uint256 reserveCurrencyAmountToReturnTotal = bancorFormula.saleTargetAmount(totalSupply(), reserveBalance, reserveWeight, _amountOfMTokens);
    uint256 fee = computeFee(reserveCurrencyAmountToReturnTotal);
    uint256 reserveCurrencyAmountToReturn = reserveCurrencyAmountToReturnTotal - fee;

    return reserveCurrencyAmountToReturn;
  }

  /**
  * @dev Stops minting of coins.. in other words direct investment to coin is postponed 
  */
  function pauseMinting()
    external
    override
    onlyOwner
  {
    _pause();
  }

  /**
  * @dev Activates minting of coins.. 
  */
  function unpauseMinting()
    external
    override
    onlyOwner
  {
    _unpause();     
  }

  /**
  * @dev checks if minting of new coins is paused.
  */
  function isMintingPaused()
    external
    override
    view
    returns (bool) 
  {
    return paused();
  }


  /**
   * @dev Computes owners fee.
   * @param amount amount of tokens to be fee counted from
   */
  function computeFee(uint256 amount)
    public
    view
    returns (uint256)
  {
    return amount * transactionFee / 10000;
  }

  /**
   * @dev Returns such reserve currency amount that when substracting the fee from returned value you wil get _reserveCurrencyAmountWithoutFee
   * @param _reserveCurrencyAmountWithoutFee reserve currency amount
   */
  function computeInvestmentAmountWithFee(uint256 _reserveCurrencyAmountWithoutFee)
    public
    view
    returns (uint256)
  {
    return 10000 * _reserveCurrencyAmountWithoutFee / (10000 - transactionFee);
  }
}
