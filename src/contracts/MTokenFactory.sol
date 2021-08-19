// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

import {MTokenRegister} from "./MTokenRegister.sol";
import {MTokenFactoryInterface} from "./interfaces/MTokenFactoryInterface.sol";
import {IBancorFormula} from "./bancor/IBancorFormula.sol";
import {Memecoin} from "./Memecoin.sol";
import {MTokenInitialSetting} from "./MTokenInitialSetting.sol";
import {MToken} from "./MToken.sol";



/**
 * @title Memetic Token Factory Contract
 * @notice simple contract with purpose to create Memetic Token Contracts
 */
contract MTokenFactory is Ownable, Pausable, MTokenFactoryInterface {

  string internal constant ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER = 'ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER';

  MTokenRegister public immutable mTokenRegister;
  MTokenInitialSetting public immutable mTokenInitialSetting;
  IBancorFormula public immutable bancorFormula;

  constructor(MTokenRegister _mTokenRegister, MTokenInitialSetting _mTokenInitialSetting,  IBancorFormula _bancorFormula) {
    mTokenRegister = _mTokenRegister;
    mTokenInitialSetting = _mTokenInitialSetting;
    bancorFormula = _bancorFormula;
  }

  /**
  * @dev Allows mTokenRegister as caller to create new MemeticToken Contract (MToken). 
  * @param _mTokenName name of new MToken contract
  * @param _mTokenSymbol symbol of new MToken contract
  */
  function createMToken(string calldata _mTokenName, string calldata _mTokenSymbol)
    external
    override
    whenNotPaused
    returns(address) 
  {
    require(msg.sender == address(mTokenRegister), ERROR_CALLER_IS_NOT_MEME_COIN_REGISTER);
  
    MTokenInitialSetting.MTokenSetting memory mTokenSetting = mTokenInitialSetting.getMTokenInitialSetting();
    MToken mToken = new MToken(
      owner(),
      mTokenSetting.initialSupply,
      _mTokenName,
      _mTokenSymbol,
      Memecoin(mTokenRegister.memecoin.address),
      mTokenSetting.reserveCurrencyWeight,
      mTokenSetting.fee,
      mTokenSetting.feeLimit,
      bancorFormula
    );

    address mTokenAddress = address(mToken);
    emit MTokenCreated(mTokenAddress);

    return mTokenAddress;
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
