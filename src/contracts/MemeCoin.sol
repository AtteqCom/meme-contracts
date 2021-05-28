// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


/// @title ERC20 token
/// @dev Will be replaced by current MarbleCoin version
contract MemeCoin is Ownable, ERC20 {
  constructor(uint256 _totalSupply, string memory _memeTokenName, string memory _memeTokenSymbol) ERC20(_memeTokenName, _memeTokenSymbol)
  {
    uint256 mtc = 1e18;
    _mint(msg.sender, mtc * _totalSupply);
  }
}
