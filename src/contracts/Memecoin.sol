// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


/// @title ERC20 token
/// @dev Will be replaced by current MarbleCoin version
contract Memecoin is Ownable, ERC20 {

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  constructor(uint256 _totalSupply, string memory _memeTokenName, string memory _memeTokenSymbol) ERC20(_memeTokenName, _memeTokenSymbol)
  {
    uint256 mtc = 1e18;
    _mint(msg.sender, mtc * _totalSupply);

    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  /**
  * @dev Adds minter role to address
  * @param _minterAddress Address to grant minter role
  */
  function addMinter(address _minterAddress)
    public
    onlyOwner 
  {
    grantRole(MINTER_ROLE, _minterAddress);
  }

  /**
  * @dev Adds minter role to address
  * @param _minterAddress Address to grant minter role
  */
  function removeMinter(address _minterAddress)
    public
    onlyOwner 
  {
    revokeRole(MINTER_ROLE, oldMTokenFactoryAddress);
  }

  /**
  * @dev Adds minter role to address
  * @param _minterAddress Address to grant minter role
  */
  function isMinter(address _minterAddress)
    public
    view
    returns (bool _isMinter)
  {
    // remove previouse factory
    return hasRole(MINTER_ROLE, oldMTokenFactoryAddress);
  }
}
