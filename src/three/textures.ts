import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { suit, SUIT_SYMBOLS } from '../game/cards';
import type { Card } from '../game/types';
const INK='#141316',PAPER='#f3edda',RED='#e83235',CARD_RED='#d42a31';
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
function halftone(ctx:CanvasRenderingContext2D,w:number,h:number,step:number,radius:number,color:string){ctx.fillStyle=color;for(let y=0;y<h+step;y+=step)for(let x=(y/step)%2?step/2:0;x<w+step;x+=step){ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();}}
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
export function feltTexture(){const t=texture('felt',256,256,ctx=>{ctx.fillStyle='#5a1f29';ctx.fillRect(0,0,256,256);let seed=31;for(let i=0;i<18000;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;const x=seed%256;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;ctx.fillStyle=i%2?'#ffffff09':'#00000012';ctx.fillRect(x,seed%256,1,2);}halftone(ctx,256,256,16,1.7,'#0000001c');});t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(7,4);return t;}
export function logoTexture(){return texture('logo',1024,256,ctx=>{ctx.textAlign='center';ctx.font=display(84);ctx.fillStyle='#e8323580';ctx.fillText('MIKEYS POKER CLUB',517,125);ctx.fillStyle='#f3edda8c';ctx.fillText('MIKEYS POKER CLUB',512,120);ctx.font=body(18);ctx.fillStyle='#f3edda66';ctx.fillText('T E X A S   H O L D ’ E M',512,166);});}
export const chipColors:Record<number,string>={1:'#ece4cf',5:'#e0353a',25:'#2a282c',100:'#cf9f3f',500:'#7a1f2c',1000:'#243a5e'};
export function chipTexture(value:number){return texture(`chip-${value}`,128,128,ctx=>{
  const light=value===1||value===100;ctx.fillStyle=chipColors[value];ctx.fillRect(0,0,128,128);
  ctx.fillStyle=light?RED:PAPER;for(let i=0;i<8;i++){ctx.save();ctx.translate(64,64);ctx.rotate(i*Math.PI/4);ctx.fillRect(-7,-63,14,19);ctx.restore();}
  ctx.strokeStyle=light?INK:PAPER;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(64,64,40,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=light?INK:PAPER;ctx.font=display(value>=1000?30:36);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(value),64,67);
});}
