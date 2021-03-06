// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/IBEP20.sol";
import "../libraries/SafeBEP20.sol";

/**
* @title MasterFarm
* @dev farming contract for meme.com liquidity mining
*/
contract MasterFarm is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;         // How many LP tokens the user has provided.
        uint256 rewardDebt;     // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of MEMEs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accMemePerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accMemePerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. MEMEs to distribute per block.
        uint256 lastRewardBlock;  // Last block number that MEMEs distribution occurs.
        uint256 accMemePerShare;   // Accumulated MEMEs per share, times 1e12. See below.
        uint16 depositFeeBP;      // Deposit fee in basis points
    }

    IBEP20 public meme;

    // MEME tokens rewarded per block.
    uint256 public memePerBlock;

    // Bonus muliplier for early meme makers.
    uint8 public bonusMultiplier = 1;

    // Deposit Fee address
    address public feeAddress;
    
    // Rewards address that needs to give allowance to this contract to send out rewards
    address public rewardAddress;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    mapping (address => uint256) public poolInfoMap;

    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;

    // The block number when MEME mining starts.
    uint256 public startBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardAddressUpdated(address indexed newRewardAddress);
    event FeeAddressUpdated(address indexed newFeeAddress);
    event BonusMultiplierUpdated(uint8 bonusMultiplier);

    constructor(
        IBEP20 _meme,
        address _rewardAddress,
        address _feeAddress,
        uint256 _memePerBlock
    ) {
        meme = _meme;
        rewardAddress = _rewardAddress;
        feeAddress = _feeAddress;
        memePerBlock = _memePerBlock;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function setStartBlock(uint256 _startBlock) public onlyOwner {
        require(startBlock == 0, "already started");
        startBlock = _startBlock;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function add(uint256 _allocPoint, IBEP20 _lpToken, uint16 _depositFeeBP, bool _withUpdate) public onlyOwner returns (uint256 _addedPoolId) {
        require(_depositFeeBP <= 10000, "add: invalid deposit fee basis points");
        require(!this.isPoolAdded(address(_lpToken)), "add: pool is already added");

        massUpdatePools();

        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accMemePerShare: 0,
            depositFeeBP: _depositFeeBP
        }));

        uint256 poolId = poolInfo.length -1;
        poolInfoMap[address(_lpToken)] = poolId;

        return poolId;
    }

    // Update the given pool's meme allocation point and deposit fee. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, uint16 _depositFeeBP, bool _withUpdate) public onlyOwner {
        require(_depositFeeBP <= 10000, "set: invalid deposit fee basis points");

        massUpdatePools();
        
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
        poolInfo[_pid].depositFeeBP = _depositFeeBP;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
        return _to.sub(_from).mul(uint256(bonusMultiplier));
    }

    // View function to see pending MEMEs on frontend.
    function pendingMeme(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accMemePerShare = pool.accMemePerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 memeReward = multiplier.mul(memePerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accMemePerShare = accMemePerShare.add(memeReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accMemePerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0 || pool.allocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 memeReward = multiplier.mul(memePerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        meme.safeTransferFrom(rewardAddress, address(this), memeReward);
        pool.accMemePerShare = pool.accMemePerShare.add(memeReward.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to MasterChef for MEME allocation.
    function deposit(uint256 _pid, uint256 _amount) public {
        require(startBlock != 0 && block.number >= startBlock, "MasterMeme: farming did not start yet");
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accMemePerShare).div(1e12).sub(user.rewardDebt);
            if (pending > 0) {
                safeMemeTransfer(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            if (pool.depositFeeBP > 0) {
                uint256 depositFee = _amount.mul(pool.depositFeeBP).div(10000);
                pool.lpToken.safeTransfer(feeAddress, depositFee);
                user.amount = user.amount.add(_amount).sub(depositFee);
            } else {
                user.amount = user.amount.add(_amount);
            }
        }
        user.rewardDebt = user.amount.mul(pool.accMemePerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accMemePerShare).div(1e12).sub(user.rewardDebt);
        user.rewardDebt = user.amount.mul(pool.accMemePerShare).div(1e12);
        
        if (pending > 0) {
            safeMemeTransfer(msg.sender, pending);
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount); 
        }
        
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.lpToken.safeTransfer(address(msg.sender), amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // Safe meme transfer function, just in case if rounding error causes pool to not have enough MEMEs.
    function safeMemeTransfer(address _to, uint256 _amount) internal {
        uint256 memeBal = meme.balanceOf(address(this));
        if (_amount > memeBal) {
            meme.transfer(_to, memeBal);
        } else {
            meme.transfer(_to, _amount);
        }
    }

    function setRewardAddress(address _rewardAddress) external onlyOwner {
        rewardAddress = _rewardAddress;
        emit RewardAddressUpdated(_rewardAddress);
    }

    function setFeeAddress(address _feeAddress) external onlyOwner {
        feeAddress = _feeAddress;
        emit FeeAddressUpdated(_feeAddress);
    }

    function setBonusMultiplier(uint8 _newMultiplier) external onlyOwner {
        bonusMultiplier = _newMultiplier;
        emit BonusMultiplierUpdated(_newMultiplier);
    }

    function updateEmissionRate(uint256 _memePerBlock) external onlyOwner {
        massUpdatePools();
        memePerBlock = _memePerBlock;
    }

    function isPoolAdded(address lpToken) public view returns (bool)
    {
        if (poolInfo.length == 0) {
            return false;
        }

        uint256 index = poolInfoMap[lpToken];
        PoolInfo memory pool = poolInfo[index];

        return address(pool.lpToken) == lpToken;
    }
}
