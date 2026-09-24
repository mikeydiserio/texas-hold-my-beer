import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { suit, SUIT_SYMBOLS } from '../game/cards';
import type { Card } from '../game/types';
const cache=new Map<string,CanvasTexture>();
function texture(key:string,w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void){
  const existing=cache.get(key);if(existing)return existing;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;draw(ctx);
  const t=new CanvasTexture(canvas);t.colorSpace=SRGBColorSpace;t.anisotropy=4;cache.set(key,t);return t;
}
export function cardTexture(card:Card|'back'){
  return texture(card,256,368,ctx=>{
    ctx.fillStyle='#f6f1df';ctx.fillRect(0,0,256,368);
    if(card==='back'){
      ctx.fillStyle='#1c3430';ctx.fillRect(10,10,236,348);ctx.strokeStyle='#c5b88b';ctx.lineWidth=2;ctx.strokeRect(18,18,220,332);
      ctx.strokeStyle='#b5bd9b35';ctx.lineWidth=1;
      for(let x=-368;x<624;x+=18){ctx.beginPath();ctx.moveTo(x,20);ctx.lineTo(x+328,348);ctx.stroke();ctx.beginPath();ctx.moveTo(x,348);ctx.lineTo(x+328,20);ctx.stroke();}
      ctx.fillStyle='#1c3430';ctx.beginPath();ctx.ellipse(128,184,60,74,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c5b88b';ctx.stroke();ctx.fillStyle='#d8c798';ctx.font='76px Georgia';ctx.textAlign='center';ctx.fillText('♠',128,208);return;
    }
    const symbol=SUIT_SYMBOLS[suit(card)],r=card[0]==='T'?'10':card[0];ctx.fillStyle=suit(card)==='h'||suit(card)==='d'?'#b8423d':'#1b2727';
    const corner=()=>{ctx.font='bold 52px Arial';ctx.textAlign='center';ctx.fillText(r,39,61);ctx.font='40px Georgia';ctx.fillText(symbol,39,101);};corner();ctx.save();ctx.translate(256,368);ctx.rotate(Math.PI);corner();ctx.restore();
    ctx.font='110px Georgia';ctx.textAlign='center';ctx.fillText(symbol,128,224);
    ctx.strokeStyle='#242c241a';ctx.lineWidth=2;ctx.strokeRect(5,5,246,358);
  });
}
export function feltTexture(){const t=texture('felt',256,256,ctx=>{ctx.fillStyle='#123e2e';ctx.fillRect(0,0,256,256);let seed=31;for(let i=0;i<18000;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;const x=seed%256;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;ctx.fillStyle=i%2?'#ffffff09':'#00000012';ctx.fillRect(x,seed%256,1,2);}});t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(7,4);return t;}
export function logoTexture(){return texture('logo',1024,256,ctx=>{ctx.textAlign='center';ctx.fillStyle='#d8d5b746';ctx.font='32px Arial';ctx.fillText('A F T E R   H O U R S',512,110);ctx.font='17px Arial';ctx.fillText('T E X A S   H O L D ’ E M',512,160);});}
export const chipColors:Record<number,string>={1:'#e3ded1',5:'#b74441',25:'#43816c',100:'#567e9d',500:'#b69858',1000:'#252d32'};
export function chipTexture(value:number){return texture(`chip-${value}`,128,128,ctx=>{ctx.fillStyle=chipColors[value];ctx.fillRect(0,0,128,128);ctx.strokeStyle='#efe9d6';ctx.lineWidth=9;ctx.setLineDash([10,11]);ctx.beginPath();ctx.arc(64,64,53,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(64,64,38,0,Math.PI*2);ctx.stroke();ctx.fillStyle=value===1?'#25372e':'#fff6df';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.fillText(String(value),64,75);});}
