import {CanvasTexture,SRGBColorSpace} from 'three';
import {BOARD_CELLS,WHEEL,betLabel,numberColor,pocketAngle} from '../../games/roulette';

function canvasTexture(w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  draw(canvas.getContext('2d')!);const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;return texture;
}
export function wheelTexture(){return canvasTexture(1024,1024,ctx=>{
  const center=512,scale=1024/4.5,step=Math.PI*2/37;
  WHEEL.forEach(n=>{
    const a=pocketAngle(n),theta=Math.PI/2-a;
    ctx.beginPath();ctx.arc(center,center,2.22*scale,theta-step/2,theta+step/2);ctx.arc(center,center,1.87*scale,theta+step/2,theta-step/2,true);ctx.closePath();
    ctx.fillStyle=n===0?'#236644':numberColor(n)==='red'?'#a12430':'#18161a';ctx.fill();ctx.strokeStyle='#f3edda66';ctx.lineWidth=1;ctx.stroke();
    ctx.save();ctx.translate(center+Math.sin(a)*2.055*scale,center+Math.cos(a)*2.055*scale);ctx.rotate(-a);ctx.fillStyle='#f6ead0';ctx.font='bold 29px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),0,0);ctx.restore();
  });
});}
export function boardTexture(){return canvasTexture(2048,1024,ctx=>{
  ctx.fillStyle='#56212b';ctx.fillRect(0,0,2048,1024);
  for(let y=0;y<1024;y+=4){ctx.fillStyle=y%8?'#ffffff02':'#00000005';ctx.fillRect(0,y,2048,1);}
  for(const cell of BOARD_CELLS){
    const x=cell.x*2048,y=cell.y*1024,w=cell.w*2048,h=cell.h*1024;
    const isNumber=cell.key.startsWith('number:'),n=Number(cell.key.split(':')[1]);
    ctx.fillStyle=isNumber?(n===0?'#246749':numberColor(n)==='red'?'#a12430':'#18161a'):cell.key==='red'?'#a12430':cell.key==='black'?'#18161a':'#56212b';ctx.fillRect(x+2,y+2,w-4,h-4);
    ctx.strokeStyle='#f3edda';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
    ctx.fillStyle='#f3edda';ctx.font=`${isNumber?62:cell.key.startsWith('column:')?26:43}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cell.key.startsWith('column:')?'2:1':betLabel(cell.key),x+w/2,y+h/2);
  }
});}
export function woodTexture(){return canvasTexture(512,128,ctx=>{
  ctx.fillStyle='#42242a';ctx.fillRect(0,0,512,128);
  for(let y=0;y<128;y++){ctx.strokeStyle=`rgba(${y%3?110:15},${y%3?65:10},${y%3?35:5},.25)`;ctx.beginPath();for(let x=0;x<=512;x+=8){const wave=y+Math.sin(x*.016+y*.22)*2; if(!x)ctx.moveTo(x,wave);else ctx.lineTo(x,wave);}ctx.stroke();}
});}
