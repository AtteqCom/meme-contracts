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

  /**
  * @dev Transaction fee limit.. limits fee to max 10% of reserveCurrency
  */
  uint16 public constant TRANSACTION_FEE_LIMIT = 1000;

  uint16 public constant DEFAULT_TRANSACTION_FEE = 100;

  uint16 public constant DEFAULT_INITIAL_SUPPLY = 100;

  string public constant ERROR_FEE_IS_ABOVE_LIMIT = 'ERROR_FEE_IS_ABOVE_LIMIT';

  string public constant ERROR_CALLER_HAS_NOT_ENOUGH_MTOKENS_TO_SELL = 'ERROR_CALLER_HAS_NOT_ENOUGH_MTOKENS_TO_SELL';


  /**
  * @dev Transaction fee applied to invest and sale prices where 1% is equal to 100. 100% equals to 10000
  */
  uint16 public transactionFee;


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
    uint256 _initialSupply,
    string memory _memeTokenName, 
    string memory _memeTokenSymbol,
    address _owner,
    uint32 _reserveWeight,
    ERC20 _reserveCurrency,
    IBancorFormula _formula) ERC20(_memeTokenName, _memeTokenSymbol)
  {
    bancorFormula = _formula;
    reserveCurrency = _reserveCurrency;
    reserveWeight = _reserveWeight;
    transferOwnership(_owner);
    transactionFee = DEFAULT_TRANSACTION_FEE;

    if (_initialSupply > 0) {
      _mint(address(this), decimals() * _initialSupply);  
    } else {
      _mint(address(this), decimals() * DEFAULT_INITIAL_SUPPLY);  
    }
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

    require(TRANSACTION_FEE_LIMIT > _transactionFee, ERROR_FEE_IS_ABOVE_LIMIT);
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
}
