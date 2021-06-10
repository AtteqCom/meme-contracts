// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";


/**
* @title Memecoin token
* @dev main ERC20 currency for meme.com contracts
*/
contract Memecoin is Ownable, Pausable, ERC20 {

  constructor(uint256 _totalSupply, string memory _memeTokenName, string memory _memeTokenSymbol) ERC20(_memeTokenName, _memeTokenSymbol)
  {
    _mint(msg.sender, _totalSupply);
  }

  /**
  * @dev See {ERC20-transfer}.
  * - adds trasfer only when contract is not paused 
  */
  function transfer(address recipient, uint256 amount) 
    public 
    virtual 
    override 
    whenNotPaused 
    returns (bool) 
  {
    return super.transfer(recipient, amount);
  }

  /**
  * @dev See {ERC20-transferFrom}.
  * - adds trasferForm only when contract is not paused
  */
  function transferFrom(address from, address to, uint256 value) 
    public 
    virtual 
    override 
    whenNotPaused 
    returns (bool) 
  {
    return super.transferFrom(from, to, value);
  }

  /**
  * @dev Allows address to burn a number of coins in its ownership
  * @param _amount Amount of coins to burn
  */
  function burn(uint256 _amount) 
    virtual
    external 
    whenNotPaused
  {    
    _burn(msg.sender, _amount);
  }

  /**
  * @dev Pause contract
  */
  function pause()
    external
    onlyOwner
  {
    _pause();
  }

  /**
  * @dev Unpoause contract 
  */
  function unpause()
    external
    onlyOwner
  {
    _unpause();     
  }
}
