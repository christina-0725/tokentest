import { Wechaty } from 'wechaty'
import { ScanStatus } from 'wechaty-puppet'
import QrcodeTerminal from 'qrcode-terminal';

const token = ''

const bot = new Wechaty({
  puppet: 'wechaty-puppet-hostie',
  puppetOptions: {
    token,
  }
});

//变量区
//牌
var totalCards = new Set();
for(var i=1;i<=52;i++){
  totalCards.add(i);
}

var cardsInHand = totalCards;

//牌桌
var flopCards = new Set();
var turnCard = null, riverCard = null;
var firstPool = 0, secondPool = 0;

//玩家集合
var totalPlayerSet = new Set();
var currentPlayerSet = new Set();

//玩家链表
var head, tail, currentPlayer, dealer, firstToRaise;

var flag=false;

//函数区
//创建玩家
function newPlayer(contact){
  this.contact = contact;
  this.buyIn = 1;
  this.rest = 1000;
  this.previous = null;
  this.next = null;
  this.front = 0;
  this.card = new Set();
  this.allInStatus = false;
  this.getValue = function(){
      return ;
  }
}

//数字形式牌转换成字符串
function cardToStr(card){
  var color;
  if(card<=13) color = 'c';
  else if(card<=26) color = 'd';
  else if(card<=39) color = 'h';
  else color = 's';
  
  var value;
  if(card%13==1) value = 'A';
  if(card%13==2) value = '2';
  if(card%13==3) value = '3';
  if(card%13==4) value = '4';
  if(card%13==5) value = '5';
  if(card%13==6) value = '6';
  if(card%13==7) value = '7';
  if(card%13==8) value = '8';
  if(card%13==9) value = '9';
  if(card%13==10) value = '10';
  if(card%13==11) value = 'J';
  if(card%13==12) value = 'Q';
  if(card%13==0) value = 'K';

  return color + value;
}

//抽一张牌
function drawACard(){
  let arr = Array.from(cardsInHand);
  var card = arr[Math.floor(Math.random()*arr.length)];
  cardsInHand.delete(card);
  return card;
}

//布置牌桌
async function setTable(){
  dealer = dealer.next;
  cardsInHand = totalCards;
  dealer.next.rest-=5;
  dealer.next.front+=5;
  dealer.next.next.rest-=10;
  dealer.next.next.front+=10;
  currentPlayer = dealer.next.next.next;
  firstToRaise = dealer.next.next;
  
  for(var player of currentPlayerSet){
    var a = drawACard();
    var b = drawACard();
    player.card.add(a);
    player.card.add(b);
    
    await player.contact.say(cardToStr(a)+' '+cardToStr(b));
    
  }
    
  flopCards.clear();
  turnCard = null;
  riverCard = null;
  
}

//生成牌桌现状
function statusToMsg(){
  var s = '';
  if(flopCards.size!=0){
    for(var card of flopCards){
      s+=cardToStr(card);
      s+=' ';
    }
  }
  if(turnCard!=null){
    s+=cardToStr(turnCard);
    s+=' ';
  }
  if(riverCard!=null){
    s+=cardToStr(riverCard);
    s+=' ';
  }
  s+='\n';
  
  s+=new Number(firstPool).toString();
  s+=' ';
  if(secondPool!=0) s+=new Number(secondPool).toString();
  s+=' \n';
  
  var pointer = dealer.next;
  for(i=1;i<currentPlayerSet.size;i++){
    s+=pointer.contact.name();
    s+=' ';
    s+=new Number(pointer.rest).toString();
    s+=' ';
    s+=new Number(pointer.front).toString();
    s+=' ';
    if(pointer.card.size!=0) s+='o ';
    else s+='  ';
    s+='\n';
    pointer=pointer.next;
  }
  
  s+=pointer.contact.name();
    s+=' ';
    s+=new Number(pointer.rest).toString();
    s+=' ';
    s+=new Number(pointer.front).toString();
    s+=' ';
    if(pointer.card.size!=0) s+='o ';
    else s+='  ';
    s+='D';
  
  return s;
}

//机器人
bot
  .on('scan', (qrcode, status) => {
    if (status === ScanStatus.Waiting) {
      QrcodeTerminal.generate(qrcode, {
        small: true
      })
    }
  })
  .on('login', async user => {
    console.log(`user: ${JSON.stringify(user)}`)
  })
  .on('message', async msg => {
    
    //console.log(msg.text());
    
    //只处理群聊
    if(msg.room()){
      var room = msg.room();
      //处理join
      if(msg.text()=='join'){
        
        //await room.say('welcome!');
        
        if(currentPlayerSet.size>=10) await room.say('too many players!');
        else{
          flag = false;
          var playerPointer = null;
          for(var player of totalPlayerSet){
            if(player.contact==msg.talker()){
              flag = true;
              playerPointer = player;
              break;
            }
          }
          if(flag==false){
            playerPointer = new newPlayer(msg.talker());
            totalPlayerSet.add(playerPointer);
          }
          currentPlayerSet.add(playerPointer);
          
          if(currentPlayerSet.size==1){
            head = playerPointer;
            tail = playerPointer;
            tail.next = head;
            head.previous = tail;
            dealer = playerPointer;
            
            await room.say('waiting for player');
            
          }
          else{
            tail.next = playerPointer;
            playerPointer.previous = tail;
            tail = tail.next;
            tail.next = head;
            head.previous = tail;
          }
          
          if(currentPlayerSet.size==2){
            await setTable();
            await room.say(statusToMsg());
            await room.say(msg.talker().name()+'your turn!');
          }
          else if(currentPlayerSet.size>2) await room.say(statusToMsg());
        }
      }
    
      //处理buy
      if(msg.text()=='buy'){
        flag = false;
        var playerPointer = null;
        for(var player of currentPlayerSet){
          if(player.contact==msg.talker()){
            flag = true;
            playerPointer = player;
            break;
          }
        }
        if(flag==false){
          await room.say('need to join first');
        }
        else{
          if(playerPointer.card.size!=0) await room.say('cannot buy now');
          else{
            playerPointer.buyIn++;
            playerPointer.rest+=1000;
            await room.say(statusToMsg());
          }
        }
      }
      
      //处理sell
      if(msg.text()=='sell'){
        flag = false;
        var playerPointer = null;
        for(var player of currentPlayerSet){
          if(player.contact==msg.talker()){
            flag = true;
            playerPointer = player;
            break;
          }
        }
        if(flag==false){
          await room.say('need to join first');
        }
        else{
          if(playerPointer.card.size!=0) await room.say('cannot sell now');
          else if(playerPointer.rest<1000) await room.say('not enough to sell');
          else{
            playerPointer.buyIn--;
            playerPointer.rest-=1000;
            await room.say(statusToMsg());
          }
        }
      }
      
      //处理status
      if(msg.text()=='status') await room.say(statusToMsg());
      
      //处理mybuyin
      if(msg.text()=='mybuyin'){
        flag = false;
        var playerPointer = null;
        for(var player of totalPlayerSet){
          if(player.contact==msg.talker()){
            flag = true;
            playerPointer = player;
            break;
          }
        }
        if(flag==false){
          await room.say('need to join first');
        }
        else{
          var s = 'buy-in: ';
          s+=new Number(playerPointer.buyIn).toString();
          await room.say(s);
        }
      }
      
      
    }
   
  
    
  })
  .start()


