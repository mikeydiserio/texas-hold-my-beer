import { Color, DataTexture, MeshToonMaterial, NearestFilter, RedFormat, type ColorRepresentation } from 'three';

/** Brand inks, shared with the CSS tokens in wild-hand.css. */
export const INK='#141316',PAPER='#f3edda',RED='#e83235',DEEP_RED='#a12430',FELT='#56212b';

let gradient:DataTexture|null=null;
/** Three hard tone steps, so lit surfaces read as flat screenprinted layers instead of smooth gradients. */
function toonGradient(){
  if(gradient)return gradient;
  gradient=new DataTexture(new Uint8Array([70,150,255]),3,1,RedFormat);
  gradient.minFilter=gradient.magFilter=NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;
  return gradient;
}
const materials=new Map<string,MeshToonMaterial>();
/** Flat, posterized material in a brand ink. Cached by color so scenes share instances. */
export function printMaterial(color:ColorRepresentation){
  const key=new Color(color).getHexString();
  let m=materials.get(key);
  if(!m){m=new MeshToonMaterial({color,gradientMap:toonGradient()});materials.set(key,m);}
  return m;
}

/** Offset dot screen, the same motif the UI paints with radial-gradient backgrounds. */
export function halftone(ctx:CanvasRenderingContext2D,w:number,h:number,step:number,radius:number|((x:number,y:number)=>number),color:string){
  ctx.fillStyle=color;
  for(let y=0;y<h+step;y+=step)for(let x=(y/step)%2?step/2:0;x<w+step;x+=step){
    const r=typeof radius==='number'?radius:radius(x,y);if(r<=0)continue;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
}
/** Poster sunburst: alternating wedges radiating from (cx,cy). */
export function sunburst(ctx:CanvasRenderingContext2D,cx:number,cy:number,reach:number,rays:number,color:string,offset=0){
  ctx.fillStyle=color;const step=Math.PI*2/rays;
  for(let i=0;i<rays;i++){const a=offset+i*step,b=a+step/2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*reach,cy+Math.sin(a)*reach);ctx.lineTo(cx+Math.cos(b)*reach,cy+Math.sin(b)*reach);ctx.closePath();ctx.fill();}
}
