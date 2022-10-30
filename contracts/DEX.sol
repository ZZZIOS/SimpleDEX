// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BUSD is ERC20("BUSD", "BUSD") {
    function giveTokens(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract WBNB is ERC20("WBNB", "WBNB") {
    function giveTokens(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract DEX{

    BUSD busd;
    WBNB wbnb;

    struct Order{
        uint256 orderType;
        uint256 id;
        uint256 price;
        uint256 num;
        address initiator;
    }

    uint256 orderUniqueId1 = 1;
    uint256 orderUniqueId2 = 1;

    constructor(address _busd, address _wbnb) {
        nextOrder1[GUARD] = GUARD;
        nextOrder2[GUARD] = GUARD;
        busd=BUSD(_busd);
        wbnb=WBNB(_wbnb);
        help.price = 0;//uint_max
        orderBook1[0] = help;
        orderBook2[0] = help;
    }

    Order help;

    mapping(uint256 => Order) orderBook1;   // -- список неисполненных ордеров bwbn за busd
    mapping(uint256 => uint256) nextOrder1; //id order -> id next order, sorted by price in orderBook1
    uint256 public orderBook1Size = 0;

    mapping(uint256 => Order) orderBook2;   // -- список неисполненных ордеров busd за bwbn
    mapping(uint256 => uint256) nextOrder2; //id order -> id next order, sorted by price in orderBook2
    uint256 public orderBook2Size = 0;

    uint256 constant GUARD = 0;

    mapping(uint256 => Order) claimList;// -- id -> исполенный ордер
    uint256 public claimListSize = 0;

    function makeOrder(uint256 price, uint256 num, uint256 token) public {
        if(token == 1){
        uint256 idInOrderBook = nextOrder2[GUARD];
            while(idInOrderBook != GUARD && orderBook2[idInOrderBook].price <= price){
                if(orderBook2[idInOrderBook].num <= num){
                    
                    wbnb.transferFrom(msg.sender, orderBook2[idInOrderBook].initiator, orderBook2[idInOrderBook].num);
                    busd.transferFrom(orderBook2[idInOrderBook].initiator, msg.sender, orderBook2[idInOrderBook].num * orderBook1[idInOrderBook].price);
                    
                    num -= orderBook2[idInOrderBook].num;
                    removeOrder(orderBook2, nextOrder2, idInOrderBook, 2);
                    idInOrderBook = nextOrder2[idInOrderBook];

                    claimList[claimListSize++] = orderBook2[idInOrderBook];
                }
                else if(orderBook2[idInOrderBook].num > num){
                    
                    wbnb.transferFrom(msg.sender, orderBook2[idInOrderBook].initiator, num);
                    busd.transferFrom(orderBook2[idInOrderBook].initiator, msg.sender, num * orderBook1[idInOrderBook].price);
                    
                    orderBook2[idInOrderBook].num -= num;
                    num = 0;

                    claimList[claimListSize++] = orderBook2[idInOrderBook];
                    break;
                }
            }
            if(num != 0){
                Order storage order1 = orderBook1[orderUniqueId1];
                order1.id = orderUniqueId1++;
                order1.price = price;
                order1.num = num;
                order1.initiator = msg.sender;
                order1.orderType = token;
                addOrder(orderBook1, nextOrder1, order1);
                orderBook1Size++;
            }
        }
        else if(token == 2){
        uint256 idInOrderBook = nextOrder1[GUARD];
            while(idInOrderBook != GUARD && orderBook1[idInOrderBook].price <= price){
                if(orderBook1[idInOrderBook].num <= num){
                    
                    busd.transferFrom(msg.sender, orderBook1[idInOrderBook].initiator, orderBook1[idInOrderBook].num);
                    wbnb.transferFrom(orderBook1[idInOrderBook].initiator, msg.sender, orderBook1[idInOrderBook].num * orderBook1[idInOrderBook].price);
                    
                    num -= orderBook1[idInOrderBook].num;
                    removeOrder(orderBook1, nextOrder1, idInOrderBook, 1);
                    idInOrderBook = nextOrder1[idInOrderBook];
                    claimList[claimListSize++] = orderBook1[idInOrderBook];
                }
                else if(orderBook1[idInOrderBook].num > num){
                                      
                    busd.transferFrom(msg.sender, orderBook1[idInOrderBook].initiator, num);
                    wbnb.transferFrom(orderBook1[idInOrderBook].initiator, msg.sender, num * orderBook1[idInOrderBook].price);
                    
                    orderBook1[idInOrderBook].num -= num;
                    num = 0;

                    claimList[claimListSize++] = orderBook1[idInOrderBook];
                    break;
                }
            }
            if(num != 0){
                Order storage order2 = orderBook2[orderUniqueId2];
                order2.id = orderUniqueId2++;
                order2.price = price;
                order2.num = num;
                order2.initiator = msg.sender;
                order2.orderType = token;
                addOrder(orderBook2, nextOrder2, order2);
                orderBook2Size++;
            }
        }
    }

    function claim(uint256 orderId) public view returns (Order memory) {
        return claimList[orderId];
    }

    uint256 public a;
    uint256 public b;
    uint256 public c;
    uint256 public d;

    function addOrder(mapping(uint256 => Order) storage orderBook, mapping(uint256 => uint256) storage nextOrder, Order storage order) private {
        uint256 index = GUARD;
        while(nextOrder[index] != GUARD && orderBook[nextOrder[index]].price < order.price) {
            index = nextOrder[index];
        }
        nextOrder[order.id] = nextOrder[index];
        nextOrder[index] = order.id;
    }

    function removeOrder(mapping(uint256 => Order) storage orderBook, mapping(uint256 => uint256) storage nextOrder, uint256 id, uint256 orderBookSize) private {
        if(id != GUARD){
            uint256 index = findPrevOrder(orderBook, nextOrder, id);
            nextOrder[index] = nextOrder[id];
            nextOrder[id] = uint256(0);
            delete orderBook[id];
            if(orderBookSize == 1)
                orderBook1Size--;
            else
                orderBook2Size--;
        }
    }
    
    function findPrevOrder(mapping(uint256 => Order) storage orderBook, mapping(uint256 => uint256) storage nextOrder, uint256 id) internal view returns(uint256) {
        uint256 currentId = GUARD;
        while(nextOrder[currentId] != GUARD) {
            if(orderBook[id].id == id)
                return currentId;
            currentId = nextOrder[currentId];
        }
        return uint256(0);
    }

    function firstE() public view returns(uint256){
        return orderBook1[nextOrder1[0]].price;
    }
    function secondE() public view returns(uint256){
        return orderBook1[nextOrder1[1]].price;
    }    
    function thirdE() public view returns(uint256){
        return orderBook1[nextOrder1[2]].price;
    }
    function forthE() public view returns(uint256){
        return orderBook1[nextOrder1[3]].price;
    }
    function fifthE() public view returns(uint256){
        return orderBook1[nextOrder1[4]].price;
    }
    function firstI() public view returns(uint256){
        return nextOrder1[0];
    }
    function secondI() public view returns(uint256){
        return nextOrder1[1];
    }
    function thirdI() public view returns(uint256){
        return nextOrder1[2];
    }
    function forthI() public view returns(uint256){
        return nextOrder1[3];
    }
    function fifthI() public view returns(uint256){
        return nextOrder1[4];
    }
}