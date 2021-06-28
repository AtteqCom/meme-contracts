// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Memecoin} from "./Memecoin.sol";

/**
* @title MemecoinMatic token
* @dev main ERC20 currency for meme.com contracts extended on Matic recommended methods for childTokenContract
* based on https://docs.matic.today/docs/develop/ethereum-matic/pos/calling-contracts/erc20/
*/
contract MemecoinMatic is Memecoin {

  // keeping it for checking, whether deposit being called by valid address or not
  address public childChainManagerProxy;

  constructor(address _childChainManagerProxy, string memory _memeTokenName, string memory _memeTokenSymbol) Memecoin(0, _memeTokenName, _memeTokenSymbol)
  {
    childChainManagerProxy = _childChainManagerProxy;
  }

  // being proxified smart contract, most probably childChainManagerProxy contract's address
  // is not going to change ever, but still, lets keep it 
  function updateChildChainManager(address newChildChainManagerProxy) 
    external 
    onlyOwner
  {
    childChainManagerProxy = newChildChainManagerProxy;
  }

  function deposit(address user, bytes calldata depositData) 
    external 
    whenNotPaused
  {
    require(msg.sender == childChainManagerProxy, "You're not allowed to deposit");

    uint256 amount = abi.decode(depositData, (uint256));

    // `amount` token getting minted here & equal amount got locked in RootChainManager
    _mint(user, amount);
  }

  function withdraw(uint256 amount)
    external 
    whenNotPaused
  {
    _burn(msg.sender, amount);
  }

  /**
  * @dev Allows address to burn a number of coins in its ownership
  * @param _amount Amount of coins to burn
  */
  function burn(uint256 _amount) 
    external
    override 
  {    
    revert("ERROR_CHILD_TOKEN_DOES_NOT_ALLOW_DIRECT_BURNING");  
  }

}
