import { HardhatUserConfig } from "hardhat/types"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@openzeppelin/hardhat-upgrades"

import { privateKey, anotherKey, verifyKey  } from "./wallet"

import "solidity-coverage"

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.2",
        settings: {
          optimizer: { enabled: true, runs: 2000 },
        },
      }
    ]


  },
  networks: {
    bsctestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [privateKey, anotherKey],
      chainId: 97,
      gasPrice: 20000000000,
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: [privateKey, anotherKey],
      chainId: 56,
      gasPrice: 5000000000,
    },
  },
  etherscan: {
    apiKey: verifyKey,
  },
}

export default config
