// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";


/**
* @title Memecoin token
* @dev main ERC20 currency for meme.com contracts
*/
contract Memecoin is Ownable, AccessControl, Pausable, ERC20 {

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  bool private _supplycapped = false;

  constructor(uint256 _totalSupply, string memory _memeTokenName, string memory _memeTokenSymbol) ERC20(_memeTokenName, _memeTokenSymbol)
  {
    uint256 mtc = 1e18;
    _mint(msg.sender, mtc * _totalSupply);

    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  /**
  * @dev Allows address with granted MINTER_ROLE to mint a number of coins
  * @param _account Address where will minted coins appear
  * @param _amount Amount of coins to mint
  */
  function mint(address _account, uint256 _amount) 
    public 
    whenNotPaused
  {
    require(hasRole(MINTER_ROLE, msg.sender), "Address is not minter");
    require(totalSupply() + _amount > totalSupply(), "Increase in supply would cause overflow.");
    require(!isSupplyCapped(), "Supply has been capped.");
    
    _mint(_account, _amount);
  }

  /**
  * @dev Allows address to burn a number of coins in its ownership
  * @param _account Address what desires to burn its tokens
  * @param _amount Amount of coins to burn
  */
  function burn(uint256 _amount) 
    public 
    whenNotPaused
  {    
    _burn(msg.sender, _amount);
  }

  /**
  * @dev The contract owner can prevent the minting of new coins
  * !!!!! This is a one-way function. Once the supply is capped it can't be uncapped.
  */
  function freezeMint() 
    public 
    onlyOwner 
    returns (bool) 
  {
    _supplycapped = true;
    return isSupplyCapped();
  }

  /**
  * @dev View function to check whether the supply has been capped.
  */
  function isSupplyCapped() 
    public 
    view 
    returns (bool) 
  {
    return _supplycapped;
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
    revokeRole(MINTER_ROLE, _minterAddress);
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
    return hasRole(MINTER_ROLE, _minterAddress);
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
  function unpouse()
    external
    onlyOwner
  {
    _unpause();     
  }
}
