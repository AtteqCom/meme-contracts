// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {MTokenFactoryInterface} from "./interfaces/MTokenFactoryInterface.sol";
import {MemeCoinRegisterInterface} from "./interfaces/MemeCoinRegisterInterface.sol";
import {IBancorFormula} from "./bancor/IBancorFormula.sol";
import {MemeCoin} from "./MemeCoin.sol";
import {MToken} from "./MToken.sol";


/**
 * @title Memetic Token Factory Contract
 * @notice simple contract with purpose to create Memetic Token Contracts
 */
contract MTokenFactory is Ownable, AccessControl, MTokenFactoryInterface {

  bytes32 public constant MEME_COIN_REGISTER_ROLE = keccak256("MEME_COIN_REGISTER_ROLE");

  string public constant ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER = 'ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER';
  string public constant ERROR_MEME_COIN_REGISTER_NOT_SET = 'ERROR_MEME_COIN_REGISTER_NOT_SET';

  uint32 public constant reserveCurrencyWeight = 100;
  uint32 public constant initialTotalSupply = 1e8;

  MemeCoinRegisterInterface public memeCoinRegister;
  MemeCoin public reserveCurrency;
  IBancorFormula public bancorFormula;

  /**
  * @dev Event emited when a new MemeCoinRegister contract is set
  * @param newMemeCoinRegisterAddress Address of the new MemeCoinRegister address
  * @param oldMemeCoinRegisterAddress Address of the old MemeCoinRegister address
  */
  event MemeCoinRegisterChanged(address newMemeCoinRegisterAddress, address oldMemeCoinRegisterAddress);

  constructor(MemeCoin _reserveCurrency, IBancorFormula _bancorFormula) {
    // Grant the contract deployer the default admin role: it will be able
    // to grant and revoke any roles
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

    reserveCurrency = _reserveCurrency;
    bancorFormula = _bancorFormula;
  }

  /**
  * @dev Sets MemeCoinRegister contract to be able to add created MemeticTokenContract to register. This mth. removes and grants MEME_COIN_REGISTER_ROLE 
  * @param _memeCoinRegister reference to MemeCoinRegister contract
  */
  function setMemeCoinRegsiter(MemeCoinRegisterInterface _memeCoinRegister) 
    public 
    onlyOwner 
  {
    address oldMemeCoinAddress = address(memeCoinRegister);
    address newMemeCoinAddress = address(_memeCoinRegister);

    // remove previouse factory
    if (hasRole(MEME_COIN_REGISTER_ROLE, oldMemeCoinAddress)) {
      revokeRole(MEME_COIN_REGISTER_ROLE, newMemeCoinAddress);
    }

    grantRole(MEME_COIN_REGISTER_ROLE, newMemeCoinAddress);
    memeCoinRegister = _memeCoinRegister;

    emit MemeCoinRegisterChanged(newMemeCoinAddress, oldMemeCoinAddress);
  }

  /**
  * @dev Allows to caller with granted MEME_COIN_REGISTER_ROLE to create new MemeticToken Contract (MToken) and adds its reference to MemeCoinRegister. 
  * Caller should check validity of token name and symbol. Mth. reverts if MemeCoinRegister contract is not set.
  * @param _mTokenName name of new MToken contract
  * @param _mTokenSymbol symbol of new MToken contract
  */
  function createMToken(string calldata _mTokenName, string calldata _mTokenSymbol)
    external
    override
    returns(address mTokenContract) 
  {
    require(address(0) != address(memeCoinRegister), ERROR_MEME_COIN_REGISTER_NOT_SET);
    require(hasRole(MEME_COIN_REGISTER_ROLE, msg.sender), ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER);
  
    MToken mToken = new MToken(
      initialTotalSupply,
      _mTokenName,
      _mTokenSymbol,
      owner(),
      reserveCurrencyWeight,
      reserveCurrency,
      bancorFormula);

    address mTokenAddress = address(mToken);
    memeCoinRegister.addMToken(ERC20(mToken));

    MTokenCreated(address(mToken));

    emit MTokenCreated(mTokenAddress);

    return mTokenAddress;
  }


}
