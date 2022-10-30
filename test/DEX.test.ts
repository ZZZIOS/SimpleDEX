import { ethers, upgrades } from "hardhat"
//import { ethers } from "hardhat"
import { expect } from "chai"
import { Contract, Signer } from "ethers"
import { bytes32, timeout, wait, now, timeoutAppended } from "./utils/utils"
import { BUSD, WBNB, DEX} from "../typechain";
import { tokens } from "./utils/utils"

describe("DEX", async () => {
  let owner: Signer
  let owner2: Signer
  let users: Signer[]
  let busd: BUSD
  let wbnb: WBNB
  let con: DEX

  beforeEach(async () => {
    ;[owner, owner2, ...users] = await ethers.getSigners()

    
    busd = await (await ethers.getContractFactory("BUSD")).deploy() as BUSD
	await busd.deployed()
    wbnb = await (await ethers.getContractFactory("WBNB")).deploy() as WBNB
	await wbnb.deployed()
    con = (await (await ethers.getContractFactory("DEX")).deploy(busd.address, wbnb.address)) as DEX
	await con.deployed()

    await busd.giveTokens(await owner.getAddress(), 10000)
    await wbnb.giveTokens(await owner.getAddress(), 10000)
    await busd.giveTokens(await owner2.getAddress(), 10000)
    await wbnb.giveTokens(await owner2.getAddress(), 10000)
    for (const user of users) {
      await busd.giveTokens(await user.getAddress(), 10000)
      await wbnb.giveTokens(await user.getAddress(), 10000)
    }
  })

  it("Users get tokens", async () => { // у пользователей должны быть токены
      for (const user of users) {
           const balance = await busd.balanceOf(await user.getAddress())
	   expect(balance.eq(10000)).to.be.true
           const balance2 = await wbnb.balanceOf(await user.getAddress())
	   expect(balance2.eq(10000)).to.be.true
    }
  })

  it("Test of makeOrder()", async () => {

    await wbnb.connect(owner).approve(con.address, 1)
    await busd.connect(owner2).approve(con.address, 1)

    await con.connect(owner).makeOrder(1, 1, 1) // owner хочет купить 1 ubsd за 1 wbnb

    const s = await con.orderBook1Size() // ордер должен попасть в первый orderBook, тк противоположных ордеров пока нет
    expect(s.eq(1)).to.be.true
    const s2 = await con.orderBook2Size()
    expect(s2.eq(0)).to.be.true

    await con.connect(owner2).makeOrder(1, 1, 2) // owner2 хочет продать 1 ubsd за 1 wbnb

    const s3 = await con.orderBook1Size() // ордеры должны "схлопнуться"
    expect(s3.eq(0)).to.be.true
    const s4 = await con.orderBook2Size()
    expect(s4.eq(0)).to.be.true


    const bWbnb1 = await wbnb.balanceOf(await owner.getAddress())
    const bBusd1 = await busd.balanceOf(await owner.getAddress())
    const bWbnb2 = await wbnb.balanceOf(await owner2.getAddress())
    const bBusd2 = await busd.balanceOf(await owner2.getAddress())


    expect(bWbnb1.eq(9999)).to.be.true // проверка баланса
    expect(bBusd1.eq(10001)).to.be.true
    expect(bWbnb2.eq(10001)).to.be.true
    expect(bBusd2.eq(9999)).to.be.true
	
  })

  it("Find a better price", async () => {

    await wbnb.connect(owner).approve(con.address, 100)
    await busd.connect(owner).approve(con.address, 100)
    await wbnb.connect(owner2).approve(con.address, 100)
    await busd.connect(owner2).approve(con.address, 100)
    await wbnb.connect(users[0]).approve(con.address, 100)
    await busd.connect(users[0]).approve(con.address, 100)
    await wbnb.connect(users[1]).approve(con.address, 100)
    await busd.connect(users[1]).approve(con.address, 100)

    await con.connect(owner).makeOrder(10, 1, 1)

    const s = await con.orderBook1Size() // ордер должен попасть в первый orderBook, тк противоположных ордеров пока нет


    await con.connect(owner2).makeOrder(50, 1, 1)

    const s3 = await con.orderBook1Size() // ордер должен попасть в первый orderBook, тк противоположных ордеров пока нет

    await con.connect(users[0]).makeOrder(60, 1, 1) 

    const s5 = await con.orderBook1Size() // ордер должен попасть в первый orderBook, тк противоположных ордеров пока нет

    await con.connect(users[1]).makeOrder(50, 1, 2) // должен поменять 1 usd за 10 bnb, ткт это вгоднее всего

    const s7 = await con.orderBook1Size() 
    expect(s7.eq(2)).to.be.true
    const s8 = await con.orderBook2Size()
    expect(s8.eq(0)).to.be.true


    const bWbnb1 = await wbnb.balanceOf(await owner.getAddress())
    const bBusd1 = await busd.balanceOf(await owner.getAddress())
    const bWbnb2 = await wbnb.balanceOf(await owner2.getAddress())
    const bBusd2 = await busd.balanceOf(await owner2.getAddress())
    const bWbnb3 = await wbnb.balanceOf(await users[0].getAddress())
    const bBusd3 = await busd.balanceOf(await users[0].getAddress())
    const bWbnb4 = await wbnb.balanceOf(await users[1].getAddress())
    const bBusd4 = await busd.balanceOf(await users[1].getAddress())

    expect(bWbnb1.eq(9990)).to.be.true // проверка баланса
    expect(bBusd1.eq(10001)).to.be.true
    expect(bWbnb2.eq(10000)).to.be.true
    expect(bBusd2.eq(10000)).to.be.true
    expect(bWbnb3.eq(10000)).to.be.true
    expect(bBusd3.eq(10000)).to.be.true
    expect(bWbnb4.eq(10010)).to.be.true
    expect(bBusd4.eq(9999)).to.be.true
  })

  it("Partial of an order", async () => {

    await wbnb.connect(owner).approve(con.address, 10)
    await busd.connect(owner2).approve(con.address, 5)
    await busd.connect(users[0]).approve(con.address, 3)
    await busd.connect(users[1]).approve(con.address, 2)

    await con.connect(owner).makeOrder(1, 10, 1) 

    await con.connect(owner2).makeOrder(1, 5, 2)  // ордер из первого orderBook исполнен частично

    await con.connect(users[0]).makeOrder(1, 3, 2)  // ордер из первого orderBook исполнен частично

    await con.connect(users[1]).makeOrder(1, 2, 2)  // ордер из первого orderBook исполнен до конца

    const s7 = await con.orderBook1Size()
    expect(s7.eq(0)).to.be.true
    const s8 = await con.orderBook2Size()
    expect(s8.eq(0)).to.be.true


    const bWbnb1 = await wbnb.balanceOf(await owner.getAddress())
    const bBusd1 = await busd.balanceOf(await owner.getAddress())
    const bWbnb2 = await wbnb.balanceOf(await owner2.getAddress())
    const bBusd2 = await busd.balanceOf(await owner2.getAddress())
    const bWbnb3 = await wbnb.balanceOf(await users[0].getAddress())
    const bBusd3 = await busd.balanceOf(await users[0].getAddress())
    const bWbnb4 = await wbnb.balanceOf(await users[1].getAddress())
    const bBusd4 = await busd.balanceOf(await users[1].getAddress())


    expect(bWbnb1.eq(9990)).to.be.true // проверка баланса
    expect(bBusd1.eq(10010)).to.be.true
    expect(bWbnb2.eq(10005)).to.be.true
    expect(bBusd2.eq(9995)).to.be.true
    expect(bWbnb3.eq(10003)).to.be.true
    expect(bBusd3.eq(9997)).to.be.true
    expect(bWbnb4.eq(10002)).to.be.true
    expect(bBusd4.eq(9998)).to.be.true
  })

  it("Test of claim()", async () => {
    await wbnb.connect(owner).approve(con.address, 10)
    await busd.connect(owner2).approve(con.address, 2)
    await busd.connect(users[0]).approve(con.address, 8)

    await con.connect(owner).makeOrder(1, 10, 1)

    const clSize = await con.claimListSize()	  // не было исполненых ордеров 
    expect(clSize.eq(0)).to.be.true

    await con.connect(owner2).makeOrder(1, 2, 2)

    const clSize2 = await con.claimListSize() // был исполнен один ордер
    expect(clSize2.eq(1)).to.be.true

    await con.connect(users[0]).makeOrder(1, 8, 2)
     
    const clSize3 = await con.claimListSize() // было исполнено два ордера
    expect(clSize3.eq(2)).to.be.true
  })
})
