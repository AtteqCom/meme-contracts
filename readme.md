# Meme.com - Contracts

Contracts used by [meme.com](https://meme.com) for automated creation of ERC20 token markets with [Bancor](https://github.com/bancorprotocol/contracts-solidity/blob/master/solidity/contracts/converter/BancorFormula.sol) formula for evaluation of minting and burning strategy.

## Developer notes

Current version is in progress state. Development is based on truffle and ganache. Follow instructions below to interact with 
contracts in docker containers.

### Docker

1. Run `docker-compose build` in root directory of repository.
2. Copy `.env.template` to `.env` and fill `.env` with desired config values
3. `docker-compose up -d`

note: `src` and `build` folders are mounted to contianer.

### Migration - Ganache/Development

1. Ganache should be listening on 7545 if u did not change truffle configuration than just run

    ```
    npx truffle migrate
    ```

### Test - Ganache

1. Enter builder container.

    ```
    docker-compose exec builder bash
    ```

2. Run tests

    ```
    inside@container:/marblegame# npx truffle test ./test/contracts/mTokenTest.js
    inside@container:/marblegame# npx truffle test ./test/contracts/memecoinRegisterTest.js
    inside@container:/marblegame# npx truffle test ./test/contracts/mTokenFactoryTest.js
    ```
