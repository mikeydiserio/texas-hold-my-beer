import {CanvasTexture,SRGBColorSpace} from 'three';
import {BOARD_CELLS,WHEEL,betLabel,numberColor,pocketAngle} from '../../games/roulette';
import {halftone} from '../print';

const fontVar=(name:string,fallback:string)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback;
const display=(size:number)=>`${size}px ${fontVar('--font-display','Impact')}, Impact, sans-serif`;
const body=(size:number)=>`600 ${size}px ${fontVar('--font-body','Arial')}, Arial, sans-serif`;

function canvasTexture(w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d')!;draw(ctx);const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;
  // The display face can still be loading on first use; repaint once it is available.
  void document.fonts?.load(display(40)).then(()=>{ctx.clearRect(0,0,w,h);draw(ctx);texture.needsUpdate=true;}).catch(()=>{});
  return texture;
}
export function wheelTexture(){return canvasTexture(1024,1024,ctx=>{
  const center=512,scale=1024/4.5,step=Math.PI*2/37;
  WHEEL.forEach(n=>{
    const a=pocketAngle(n),theta=Math.PI/2-a;
    ctx.beginPath();ctx.arc(center,center,2.22*scale,theta-step/2,theta+step/2);ctx.arc(center,center,1.87*scale,theta+step/2,theta-step/2,true);ctx.closePath();
    ctx.fillStyle=n===0?'#256248':numberColor(n)==='red'?'#c9252f':'#18161a';ctx.fill();ctx.strokeStyle='#f3edda88';ctx.lineWidth=1;ctx.stroke();
    ctx.save();ctx.translate(center+Math.sin(a)*2.055*scale,center+Math.cos(a)*2.055*scale);ctx.rotate(-a);ctx.fillStyle='#f3edda';ctx.font=display(30);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),0,0);ctx.restore();
  });
});}
export function boardTexture(){return canvasTexture(2048,1024,ctx=>{
  ctx.fillStyle='#56212b';ctx.fillRect(0,0,2048,1024);
  halftone(ctx,2048,1024,12,1.8,'#0b030633');
  for(const cell of BOARD_CELLS){
    const x=cell.x*2048,y=cell.y*1024,w=cell.w*2048,h=cell.h*1024;
    const isNumber=cell.key.startsWith('number:'),n=Number(cell.key.split(':')[1]);
    ctx.fillStyle=isNumber?(n===0?'#256248':numberColor(n)==='red'?'#a12430':'#18161a'):cell.key==='red'?'#a12430':cell.key==='black'?'#18161a':'#56212b';if(isNumber||cell.key==='red'||cell.key==='black')ctx.fillRect(x+2,y+2,w-4,h-4);
    ctx.strokeStyle='#f3edda';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
    ctx.fillStyle='#f3edda';ctx.font=isNumber?display(66):cell.key.startsWith('column:')?display(30):body(40);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cell.key.startsWith('column:')?'2:1':betLabel(cell.key),x+w/2,y+h/2);
  }
});}
