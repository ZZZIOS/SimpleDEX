import { ethers } from "hardhat";
import { Signer } from "ethers"
import { BUSD, WBNB, DEX} from "../typechain";

async function main() {
  
  const owner = (await ethers.getSigners())[0]

  const busd = await (await ethers.getContractFactory("BUSD")).deploy() as BUSD
  await busd.deployed()
  const  wbnb = await (await ethers.getContractFactory("WBNB")).deploy() as WBNB
  await wbnb.deployed()
        
  const dex = (await (await ethers.getContractFactory("DEX")).deploy(busd.address, wbnb.address))
  await dex.deployed()

  console.log(dex.address)
  console.log(busd.address)
  console.log(wbnb.address)
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
