import { CanvasTexture, SRGBColorSpace } from 'three';
import { INK, PAPER, RED, halftone, sunburst } from './print';
import { suit, SUIT_SYMBOLS } from '../game/cards';
import type { Card } from '../game/types';
const CARD_RED='#d42a31';
const cache=new Map<string,CanvasTexture>();
const fontVar=(name:string,fallback:string)=>(typeof document==='undefined'?'':getComputedStyle(document.documentElement).getPropertyValue(name).trim())||fallback;
const display=(size:number)=>`${size}px ${fontVar('--font-display','Impact')}, Impact, sans-serif`;
const body=(size:number,weight=600)=>`${weight} ${size}px ${fontVar('--font-body','Arial')}, Arial, sans-serif`;
function texture(key:string,w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void){
  const existing=cache.get(key);if(existing)return existing;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;
  const paint=()=>{ctx.clearRect(0,0,w,h);ctx.save();draw(ctx);ctx.restore();};paint();
  const t=new CanvasTexture(canvas);t.colorSpace=SRGBColorSpace;t.anisotropy=4;cache.set(key,t);
  // The display face can still be loading on first use; repaint once it is available.
  void document.fonts?.load(display(40)).then(()=>{paint();t.needsUpdate=true;}).catch(()=>{});
  return t;
}
function crown(ctx:CanvasRenderingContext2D,x:number,y:number,w:number){const s=w/100;ctx.save();ctx.translate(x-w/2,y);ctx.scale(s,s);ctx.beginPath();ctx.moveTo(4,58);ctx.lineTo(9,14);ctx.lineTo(30,36);ctx.lineTo(50,2);ctx.lineTo(70,36);ctx.lineTo(91,14);ctx.lineTo(96,58);ctx.closePath();ctx.fill();ctx.fillRect(4,63,92,11);ctx.restore();}
function cardBack(ctx:CanvasRenderingContext2D){
  ctx.fillStyle=PAPER;ctx.fillRect(0,0,256,368);ctx.fillStyle='#c9252f';ctx.fillRect(12,12,232,344);
  ctx.save();ctx.beginPath();ctx.rect(12,12,232,344);ctx.clip();ctx.fillStyle='#14131694';
  for(let i=0;i<18;i++){const a=(i*20+4)*Math.PI/180,b=a+7*Math.PI/180;ctx.beginPath();ctx.moveTo(128,184);ctx.lineTo(128+Math.cos(a)*420,184+Math.sin(a)*420);ctx.lineTo(128+Math.cos(b)*420,184+Math.sin(b)*420);ctx.closePath();ctx.fill();}
  halftone(ctx,256,368,8,1.4,'#14131640');ctx.restore();
  ctx.strokeStyle='#f3eddacc';ctx.lineWidth=4;ctx.strokeRect(24,24,208,320);
  ctx.save();ctx.translate(128,184);ctx.rotate(-.14);ctx.fillStyle='#14131699';ctx.beginPath();ctx.arc(7,7,52,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=INK;ctx.beginPath();ctx.arc(0,0,52,0,Math.PI*2);ctx.fill();ctx.strokeStyle=PAPER;ctx.lineWidth=7;ctx.stroke();
  ctx.fillStyle=PAPER;ctx.font='66px Georgia';ctx.textAlign='center';ctx.fillText('♠',0,23);ctx.restore();
}
export function cardTexture(card:Card|'back'){
  return texture(card,256,368,ctx=>{
    if(card==='back'){cardBack(ctx);return;}
    const symbol=SUIT_SYMBOLS[suit(card)],r=card[0]==='T'?'10':card[0],red=suit(card)==='h'||suit(card)==='d',col=red?CARD_RED:INK,offset=red?'#14131626':'#e8323566';
    const paper=ctx.createLinearGradient(0,0,256,368);paper.addColorStop(0,'#fcf7e8');paper.addColorStop(1,'#ebe2ca');ctx.fillStyle=paper;ctx.fillRect(0,0,256,368);
    halftone(ctx,256,368,6,.8,'#14131609');
    ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.strokeRect(2.5,2.5,251,363);ctx.globalAlpha=.3;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.strokeRect(15,15,226,338);ctx.globalAlpha=1;
    ctx.fillStyle=col;ctx.textAlign='center';
    const corner=()=>{ctx.font=display(60);ctx.fillText(r,40,70);ctx.font='38px Georgia';ctx.fillText(symbol,40,110);};corner();ctx.save();ctx.translate(256,368);ctx.rotate(Math.PI);corner();ctx.restore();
    if('JQK'.includes(r)){
      ctx.fillStyle=red?INK:RED;ctx.fillRect(66,94,136,196);ctx.fillStyle=col;ctx.fillRect(58,86,136,196);
      ctx.save();ctx.beginPath();ctx.rect(58,86,136,196);ctx.clip();halftone(ctx,256,368,5,1,'#f3edda2e');ctx.restore();
      ctx.fillStyle=PAPER;crown(ctx,126,112,78);ctx.font=display(116);ctx.fillText(r,126,262);
    }else{
      if(r==='A'){ctx.strokeStyle=col;ctx.lineWidth=5;ctx.beginPath();ctx.arc(128,184,76,0,Math.PI*2);ctx.stroke();}
      const size=r==='A'?96:118;ctx.font=`${size}px Georgia`;ctx.fillStyle=offset;ctx.fillText(symbol,133,184+size*.36+5);ctx.fillStyle=col;ctx.fillText(symbol,128,184+size*.36);
    }
  });
}
/** One non-repeating felt sheet, drawn 2:1 so the dot screen stays round on the oval table top. Same
 *  sunburst and halftone vignette as the CSS blackjack table. */
export function feltTexture(){return texture('felt',1024,512,ctx=>{
  const glow=ctx.createRadialGradient(512,256,0,512,256,560);glow.addColorStop(0,'#7c2632');glow.addColorStop(.55,'#56212b');glow.addColorStop(1,'#3b111a');
  ctx.fillStyle=glow;ctx.fillRect(0,0,1024,512);
  sunburst(ctx,512,256,700,36,'#f3edda0a');
  let seed=31;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
  for(let i=0;i<40000;i++){ctx.fillStyle=i%2?'#ffffff08':'#00000014';ctx.fillRect(rand()*1024,rand()*512,1,2);}
  halftone(ctx,1024,512,9,(x,y)=>{const d=Math.hypot((x-512)/512,(y-256)/256);return Math.max(0,(d-.7)/.3)*2.2;},'#0b030677');
});}
export function logoTexture(){return texture('logo',1024,256,ctx=>{ctx.textAlign='center';ctx.font=display(84);ctx.fillStyle='#e8323580';ctx.fillText('MIKEYS POKER CLUB',517,125);ctx.fillStyle='#f3edda8c';ctx.fillText('MIKEYS POKER CLUB',512,120);ctx.font=body(18);ctx.fillStyle='#f3edda66';ctx.fillText('T E X A S   H O L D ’ E M',512,166);});}
/** Chips stay inside the three inks; denominations differ by body/spot pairing and the printed value. */
export const chipColors:Record<number,{body:string;spot:string;label:string}>={
  1:{body:PAPER,spot:INK,label:INK},5:{body:RED,spot:PAPER,label:PAPER},25:{body:INK,spot:PAPER,label:PAPER},
  100:{body:PAPER,spot:RED,label:INK},500:{body:INK,spot:RED,label:PAPER},1000:{body:'#a12430',spot:INK,label:PAPER},
};
export function chipTexture(value:number){return texture(`chip-${value}`,128,128,ctx=>{
  const {body:fill,spot,label}=chipColors[value];ctx.fillStyle=fill;ctx.fillRect(0,0,128,128);
  ctx.fillStyle=spot;for(let i=0;i<8;i++){ctx.save();ctx.translate(64,64);ctx.rotate(i*Math.PI/4);ctx.fillRect(-7,-63,14,19);ctx.restore();}
  ctx.save();ctx.beginPath();ctx.arc(64,64,38,0,Math.PI*2);ctx.clip();halftone(ctx,128,128,5,.9,spot+'33');ctx.restore();
  ctx.strokeStyle=label;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(64,64,40,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=label;ctx.font=display(value>=1000?30:36);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(value),64,67);
});}
/** Chip edge: the body ink broken by eight spot blocks, wrapped around the cylinder side. */
export function chipEdgeTexture(value:number){return texture(`chip-edge-${value}`,128,8,ctx=>{
  const {body:fill,spot}=chipColors[value];ctx.fillStyle=fill;ctx.fillRect(0,0,128,8);
  ctx.fillStyle=spot;for(let i=0;i<8;i++)ctx.fillRect(i*16+5,0,6,8);
});}
/** Dealer button: paper puck, ink ring, a big display-face D. */
export function dealerTexture(){return texture('dealer',128,128,ctx=>{
  ctx.fillStyle=PAPER;ctx.fillRect(0,0,128,128);
  ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.beginPath();ctx.arc(64,64,52,0,Math.PI*2);ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=display(64);ctx.fillStyle='#e8323599';ctx.fillText('D',67,72);ctx.fillStyle=INK;ctx.fillText('D',64,69);
});}
