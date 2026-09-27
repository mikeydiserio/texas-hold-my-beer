// European single-zero wheel, clockwise from zero.
export const WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
export const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const numberColor = (n:number) => n===0?'green':RED.has(n)?'red':'black';
export type BetKey = `number:${number}` | `dozen:${number}` | `column:${number}` | 'red'|'black'|'even'|'odd'|'low'|'high';
export type Bet = {key:BetKey;amount:number};
export type Spin = {id:number;number:number;startedAt:number;duration:number;rotation:number;travel:number;ballStart:number;ballTurns:number;reduced:boolean};
export type RouletteState = {bank:number;bets:Bet[];previous:Bet[];phase:'betting'|'spinning'|'settled';spin:Spin|null;history:number[];returned:number;stake:number;round:number};
export const initialRoulette:RouletteState = {bank:1000,bets:[],previous:[],phase:'betting',spin:null,history:[],returned:0,stake:0,round:0};
export const stakeTotal = (bets:Bet[])=>bets.reduce((sum,bet)=>sum+bet.amount,0);
export function validBet(key:string):key is BetKey {
  if(['red','black','even','odd','low','high'].includes(key))return true;
  if(!/^(number|dozen|column):\d+$/.test(key))return false;
  const [kind,value]=key.split(':'),n=Number(value);
  return String(n)===value&&(kind==='number'?n>=0&&n<=36:n>=1&&n<=3);
}
export function betLabel(key:BetKey){
  const [kind,value]=key.split(':');
  if(kind==='number')return value;
  if(kind==='dozen')return ['1st 12','2nd 12','3rd 12'][Number(value)-1];
  if(kind==='column')return `Column ${value}`;
  return key==='low'?'1–18':key==='high'?'19–36':key[0].toUpperCase()+key.slice(1);
}
/** Includes the returned stake: 35:1 pays 36 chips for each chip wagered. */
export function returnMultiplier(key:BetKey,n:number):number {
  if(!Number.isInteger(n)||n<0||n>36||!validBet(key))return 0;
  if(key.startsWith('number:'))return Number(key.split(':')[1])===n?36:0;
  if(n===0)return 0;
  if(key.startsWith('dozen:'))return Math.ceil(n/12)===Number(key.split(':')[1])?3:0;
  if(key.startsWith('column:'))return (n-1)%3+1===Number(key.split(':')[1])?3:0;
  return (key==='red'?RED.has(n):key==='black'?!RED.has(n):key==='even'?n%2===0:key==='odd'?n%2===1:key==='low'?n<=18:n>=19)?2:0;
}
export const cryptoUint32=()=>crypto.getRandomValues(new Uint32Array(1))[0];
/** Rejection sampling avoids modulo bias. Previous outcomes are deliberately irrelevant. */
export function randomPocket(read:()=>number=cryptoUint32):number {
  const limit=Math.floor(0x100000000/37)*37;
  let value:number;do{value=read();}while(value>=limit);
  return value%37;
}
export function makeSpin(id:number,rotation:number,reduced:boolean,now=Date.now(),read=cryptoUint32):Spin {
  const number=randomPocket(read),variation=read()/0x100000000,launch=read()/0x100000000;
  return {id,number,rotation,reduced,startedAt:now,duration:reduced?700:8500+variation*1400,travel:Math.PI*(5.5+variation*2),ballStart:launch*Math.PI*2,ballTurns:5+variation*2};
}
const TAU=Math.PI*2;
export const pocketAngle=(n:number)=>-WHEEL.indexOf(n)*TAU/37;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-(1-n)**3;
/** Shared by the renderer and tests. The final ball angle is exactly the winning pocket. */
export function spinPose(spin:Spin,progress:number){
  const t=clamp(progress),wheel=spin.rotation+spin.travel*ease(t),exit=.64;
  let angle:number,radius=2.48,height=.57;
  const freeAngle=(u:number)=>spin.ballStart-spin.ballTurns*TAU*(1-(1-u)**1.65);
  if(t<exit){angle=freeAngle(t/exit);height+=1.25*(1-clamp(t/.075))**2;}
  else {
    const u=(t-exit)/(1-exit),relativeStart=freeAngle(1)-(spin.rotation+spin.travel*ease(exit));
    const target=pocketAngle(spin.number);
    const distance=((relativeStart-target)%TAU+TAU)%TAU;
    const end=relativeStart-distance;
    angle=wheel+relativeStart+(end-relativeStart)*ease(u);
    const drop=ease(clamp(u/.7));radius=2.48+(1.62-2.48)*drop;
    height=.57+(.235-.57)*drop+Math.abs(Math.sin(u*Math.PI*7))*.24*(1-u)**1.7;
  }
  return {wheel,angle,radius,height};
}
export type RouletteAction={type:'bet';key:BetKey;amount:number}|{type:'undo'|'clear'|'repeat'|'refill'}|{type:'spin';spin:Spin}|{type:'settle';id:number};
export function rouletteReducer(s:RouletteState,a:RouletteAction):RouletteState {
  if(a.type==='settle'){
    if(s.phase!=='spinning'||s.spin?.id!==a.id)return s;
    const returned=s.bets.reduce((sum,b)=>sum+b.amount*returnMultiplier(b.key,s.spin!.number),0);
    return {...s,bank:s.bank+returned,returned,phase:'settled',history:[s.spin.number,...s.history].slice(0,12)};
  }
  if(s.phase==='spinning')return s;
  if(a.type==='refill')return s.bank<5&&(s.phase==='settled'||!s.bets.length)?{...s,bank:1000,bets:[],phase:'betting'}:s;
  if(a.type==='spin'){
    if(!s.bets.length||s.phase==='settled'||a.spin.id!==s.round+1||!Number.isInteger(a.spin.number)||a.spin.number<0||a.spin.number>36)return s;
    return {...s,phase:'spinning',spin:a.spin,round:a.spin.id,stake:stakeTotal(s.bets),previous:s.bets.map(b=>({...b})),returned:0};
  }
  const pending=s.phase==='settled'?[]:s.bets;
  if(a.type==='bet'){
    if(!validBet(a.key)||!Number.isInteger(a.amount)||a.amount<5||a.amount%5||a.amount>s.bank)return s;
    return {...s,phase:'betting',bank:s.bank-a.amount,bets:[...pending,{key:a.key,amount:a.amount}]};
  }
  if(a.type==='undo'){
    if(!pending.length)return s;
    return {...s,bets:pending.slice(0,-1),bank:s.bank+pending.at(-1)!.amount};
  }
  if(a.type==='clear')return {...s,phase:'betting',bank:s.bank+stakeTotal(pending),bets:[]};
  if(a.type==='repeat'){
    const cost=stakeTotal(s.previous);if(!cost||cost>s.bank||pending.length)return s;
    return {...s,phase:'betting',bank:s.bank-cost,bets:s.previous.map(b=>({...b}))};
  }
  return s;
}
export type BoardCell={key:BetKey;x:number;y:number;w:number;h:number};
// Normalized coordinates shared by the physical layout texture, raycasting, and chip positions.
export const BOARD_CELLS:BoardCell[]=[
  {key:'number:0',x:0,y:0,w:1/14,h:3/5},
  ...Array.from({length:36},(_,i)=>({key:`number:${i+1}` as BetKey,x:(Math.floor(i/3)+1)/14,y:(2-i%3)/5,w:1/14,h:1/5})),
  ...[1,2,3].map(n=>({key:`column:${n}` as BetKey,x:13/14,y:(3-n)/5,w:1/14,h:1/5})),
  ...[1,2,3].map(n=>({key:`dozen:${n}` as BetKey,x:(1+(n-1)*4)/14,y:3/5,w:4/14,h:1/5})),
  ...(['low','even','red','black','odd','high'] as BetKey[]).map((key,i)=>({key,x:(1+i*2)/14,y:4/5,w:2/14,h:1/5})),
];
export function boardBetAt(x:number,y:number){return BOARD_CELLS.find(c=>x>=c.x&&x<c.x+c.w&&y>=c.y&&y<c.y+c.h)?.key;}
