// Load dependencies
const { expect, assert } = require('chai');

const helper = require('./libraries/utils.js');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

// Load compiled artifacts
/**
 * Note these tests for VestingVault have some dependencies on the ERC20 token used. Notably:
 * - signature of the constructor and minting function
 * - exact wording of error messages, as these are tested for in some assertions
 */
const Token = artifacts.require('Memecoin');
const VestingVault = artifacts.require('VestingVault');

// Start test block
contract('VestingVault with 30d period', function ([owner, other]) {

    /**
     * Total tokens minted, all to owner
     */
    const cap = new BN('2000');
    const unixTime = Math.floor(Date.now() / 1000);

    beforeEach(async function () {
        snapShot = await helper.takeSnapshot();
        snapshotId = snapShot['result'];

        this.token = await Token.new(cap, 'Memecoin', 'MEM');

        this.vault = await VestingVault.new(this.token.address, 30)

        /**
         * Allowance for the Vault contract. We deliberately use a lower amount than the total
         * supply to distinguish between exceeding balance and exceeding allowance.
         */
        await this.token.approve(this.vault.address, 1000);
    });

    afterEach(async () => {
        await helper.revertToSnapShot(snapshotId);
    });

    it('should only allow owner to grant', async function () {
        await expectRevert(
            this.vault.addTokenGrant(other, 10, 300, 10, { from: other }),
            "Ownable: caller is not the owner"
        );
    });

    it('should only allow owner to revoke', async function () {
        await this.vault.addTokenGrant(other, 10, 300, 10);
        await expectRevert(
            this.vault.revokeTokenGrant(other, { from: other }),
            "Ownable: caller is not the owner"
        );
    });

    it('should only accept grants that match granularity', async function () {
        await expectRevert(
            this.vault.addTokenGrant(other, 10, 10, 10, { from: owner }),
            "Duration must be an exact multiple of granularity"
        );
    });

    it('should emit an event on grant', async function () {
        const web3Receipt = await this.vault.addTokenGrant(other, 10, 300, 10);
        await expectEvent(
            web3Receipt,
            "GrantAdded",
            { recipient: other }
        );
    });

    it('should emit an event on revoke', async function () {
        await this.vault.addTokenGrant(other, 10, 300, 10);
        const web3Receipt = await this.vault.revokeTokenGrant(other);
        await expectEvent(
            web3Receipt,
            "GrantRevoked",
            {
                recipient: other,
                amountVested: "0",
                amountNotVested: "10"
            }
        );
    });

    it('should emit an event on claim', async function () {
        await this.vault.addTokenGrant(other, 10, 300, 0);
        await time.increase(time.duration.days(30));
        const web3Receipt = await this.vault.claimVestedTokens({ from: other });
        await expectEvent(
            web3Receipt,
            "GrantTokensClaimed",
            {
                recipient: other,
                amountClaimed: "1"
            }
        );
    });

    it('should reject cliff greater than 10 years', async function () {
        await expectRevert(
            this.vault.addTokenGrant(other, 10, 3000, 3651),
            "Cliff greater than 10 years"
        );
    });

    it('should reject duration greater than 25 years', async function () {
        await expectRevert(
            this.vault.addTokenGrant(other, 10, 9300, 365),
            "Duration greater than 25 years"
        );
    });

    it('should have an amount vesting per day greater than zero', async function () {
        await expectRevert(
            this.vault.addTokenGrant(other, 10, 1200, 1000),
            "amountVestedPerPeriod > 0"
        );
    });

    it('should reject transfer outside of balance', async function () {
        await expectRevert(
            this.vault.addTokenGrant(other, 2001, 300, 0),
            "ERC20: transfer amount exceeds balance"
        );
    });

    it('should reject transfer outside of allowance', async function () {
        await expectRevert(
            this.vault.addTokenGrant(other, 1001, 300, 0),
            "ERC20: transfer amount exceeds allowance"
        );
    });

    it('can get grant start time', async function () {
        await this.vault.addTokenGrant(other, 1000, 300, 0);
        expect((await this.vault.getGrantStartTime(other)).toString()).to.equal((await time.latest()).toString());
    });

    it('can get grant amount', async function () {
        await this.vault.addTokenGrant(other, 1000, 300, 1);
        expect((await this.vault.getGrantAmount(other)).toString()).to.equal("1000");
    });

    it('can not add a grant if one already exists', async function () {
        await this.vault.addTokenGrant(other, 300, 300, 1);
        await expectRevert(
            this.vault.addTokenGrant(other, 200, 300, 1),
            "Grant already exists, must revoke first"
        );
        expect((await this.vault.getGrantAmount(other)).toString()).to.equal("300");
    });

    it('can not claim unvested tokens', async function () {
        await this.vault.addTokenGrant(other, 1000, 300, 1);
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Vested is 0"
        );
    });

    it('can claim vested tokens', async function () {
        await this.vault.addTokenGrant(other, 1000, 300, 0);
        expect((await this.token.balanceOf(other)).toString()).to.equal("0");
        await time.increase(time.duration.days(90));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("300");
    });

    it('grants all tokens if over testing duration', async function () {
        await this.vault.addTokenGrant(other, 1000, 300, 0);
        expect((await this.token.balanceOf(other)).toString()).to.equal("0");
        await time.increase(time.duration.days(320));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("1000");
    });

    it('vests immediately if no cliff', async function () {
        await this.vault.addTokenGrant(other, 1000, 30, 0);
        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("1000");

        await time.increase(time.duration.days(30));
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Grant fully claimed"
        );
    });

    it('does not release tokens before cliff is up', async function () {
        await this.vault.addTokenGrant(other, 1000, 150, 3);

        await time.increase(time.duration.days(1));
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Vested is 0"
        );

        await time.increase(time.duration.days(1));
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Vested is 0"
        );

        await time.increase(time.duration.days(31)); // Get to day 33, = cliff of 3 days + initial 30d period
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("200");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("400");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("600");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("800");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("1000");

        await time.increase(time.duration.days(1));
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Grant fully claimed"
        );
        await time.increase(time.duration.days(29));
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Grant fully claimed"
        );
    });

    it('releases balance at end if uneven vest', async function () {
        await this.vault.addTokenGrant(other, 1000, 90, 0);
        
        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("333");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("666");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("1000");

        await time.increase(time.duration.days(90));
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Grant fully claimed"
        );
    });

    it('releases balance at end if uneven vest with cliff', async function () {
        await this.vault.addTokenGrant(other, 1000, 90, 7);

        await time.increase(time.duration.days(37)); // cliff of 7d + 1 period of 30d

        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("333");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("666");

        await time.increase(time.duration.days(30));
        await this.vault.claimVestedTokens({ from: other })
        expect((await this.token.balanceOf(other)).toString()).to.equal("1000");

        await time.increase(time.duration.days(30));
        await expectRevert(
            this.vault.claimVestedTokens({ from: other }),
            "Grant fully claimed"
        );
    });

    it('owner can revoke token grant', async function () {
        expect((await this.token.balanceOf(owner)).toString()).to.equal("2000");

        expect((await this.token.balanceOf(this.vault.address)).toString()).to.equal("0");
        await this.vault.addTokenGrant(other, 1000, 90, 7);
        expect((await this.token.balanceOf(this.vault.address)).toString()).to.equal("1000");

        await time.increase(time.duration.days(67)); // Cliff 7d + 2 periods of 30d
        await this.vault.revokeTokenGrant(other);

        // 2 periods have passed. Expect:
        // - 2 periods to be vested, tokens with other
        // - 1 period remaining, tokens with owner
        expect((await this.token.balanceOf(owner)).toString()).to.equal("1334");
        expect((await this.token.balanceOf(other)).toString()).to.equal("666");
        expect((await this.token.balanceOf(this.vault.address)).toString()).to.equal("0");
    });
});
