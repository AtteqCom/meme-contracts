// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Memecoin} from "./Memecoin.sol";

/**
* @title Memecoin token
* @dev main ERC20 currency for meme.com contracts
*/
contract Memecoin is Ownable, AccessControl, Pausable, ERC20 {

  // keeping it for checking, whether deposit being called by valid address or not
  address public childChainManagerProxy;

  constructor(address _childChainManagerProxy, string memory _memeTokenName, string memory _memeTokenSymbol) Memecoin(0, _memeTokenName, _memeTokenSymbol)
  {
    childChainManagerProxy = _childChainManagerProxy;
  }

  // being proxified smart contract, most probably childChainManagerProxy contract's address
  // is not going to change ever, but still, lets keep it 
  function updateChildChainManager(address newChildChainManagerProxy) 
    external onlyOwner
  {
    childChainManagerProxy = newChildChainManagerProxy;
  }

  function deposit(address user, bytes calldata depositData) 
    external 
  {
    require(msg.sender == childChainManagerProxy, "You're not allowed to deposit");

    uint256 amount = abi.decode(depositData, (uint256));

    // `amount` token getting minted here & equal amount got locked in RootChainManager
    _mint(user, amount);
  }

  function withdraw(uint256 amount) 
    external 
  {
    _burn(msg.sender, amount);
  }

}
