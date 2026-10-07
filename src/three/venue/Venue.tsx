'use client';
import {useMemo} from 'react';
import {BackSide,CanvasTexture,CylinderGeometry,MeshBasicMaterial,MeshStandardMaterial,QuadraticBezierCurve3,RepeatWrapping,SRGBColorSpace,SphereGeometry,TubeGeometry,Vector3} from 'three';
import {PAPER,RED,halftone,printMaterial,sunburst} from '../print';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const FLOOR=-2.05;
function canvasTexture(w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d')!);
  const t=new CanvasTexture(canvas);t.colorSpace=SRGBColorSpace;return t;
}
/** Club carpet: ink with a thin vermilion diamond lattice and a faint dot screen. */
function carpet(){
  const t=canvasTexture(256,256,ctx=>{
    ctx.fillStyle='#161417';ctx.fillRect(0,0,256,256);
    halftone(ctx,256,256,8,1.3,'#2a1e23');
    ctx.strokeStyle='#3d161c';ctx.lineWidth=3;for(const o of [-256,0,256]){ctx.beginPath();ctx.moveTo(o,0);ctx.lineTo(o+256,256);ctx.moveTo(o+256,0);ctx.lineTo(o,256);ctx.stroke();}
    ctx.fillStyle='#4a1a20';for(const [x,y] of [[128,0],[0,128],[256,128],[128,256]]){ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+9,y);ctx.lineTo(x,y+9);ctx.lineTo(x-9,y);ctx.fill();}
  });
  t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(40,40);t.anisotropy=8;return t;
}
/** Darkness that closes in beyond the table's pool of light. */
function falloff(){
  return canvasTexture(256,256,ctx=>{
    const g=ctx.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0,'#0c0b0e00');g.addColorStop(.2,'#0c0b0e00');g.addColorStop(.42,'#0c0b0eb0');g.addColorStop(.75,'#0c0b0ef0');g.addColorStop(1,'#0c0b0eff');
    ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
  });
}
/** The far wall as a gig poster: dark sunbursts rising off a halftone horizon, seen when inspecting the room. */
function backdrop(){
  const t=canvasTexture(1024,256,ctx=>{
    ctx.fillStyle='#100f12';ctx.fillRect(0,0,1024,256);
    for(const cx of [170,512,854])sunburst(ctx,cx,300,620,30,'#1d1418',cx*.002);
    halftone(ctx,1024,256,7,(_,y)=>Math.max(0,(y-120)/136)*2.6,'#3a151a');
    ctx.fillStyle='#4a1a20';ctx.fillRect(0,250,1024,6);
  });
  t.wrapS=RepeatWrapping;t.repeat.set(3,1);return t;
}
/** Ink stanchions with paper finials and vermilion rope between the players and the rail crowd. */
function barrier(){
  const posts=[],ropes=[],tops:Vector3[]=[];
  const finials=[];
  for(let deg=96;deg<=264;deg+=24){
    const a=deg*Math.PI/180,x=Math.sin(a)*9.7,z=Math.cos(a)*7.2;
    posts.push(new CylinderGeometry(.26,.3,.06,20).translate(x,FLOOR+.03,z),new CylinderGeometry(.045,.055,2,10).translate(x,FLOOR+1.03,z));
    finials.push(new SphereGeometry(.09,12,8).translate(x,FLOOR+2.08,z));
    tops.push(new Vector3(x,FLOOR+1.92,z));
  }
  for(let i=0;i<tops.length-1;i++){const a=tops[i],b=tops[i+1],mid=a.clone().lerp(b,.5);mid.y-=.32;ropes.push(new TubeGeometry(new QuadraticBezierCurve3(a,mid,b),16,.04,6));}
  return {posts:mergeGeometries(posts)!,finials:mergeGeometries(finials)!,ropes:mergeGeometries(ropes)!};
}

export function Venue(){
  const parts=useMemo(()=>({
    floor:new MeshStandardMaterial({map:carpet(),roughness:1}),
    shade:new MeshBasicMaterial({map:falloff(),transparent:true,depthWrite:false}),
    wall:new MeshBasicMaterial({map:backdrop(),side:BackSide}),
    post:printMaterial('#242026'),finial:printMaterial(PAPER),rope:printMaterial(RED),
    ...barrier(),
  }),[]);
  return <group>
    <mesh position={[0,FLOOR,0]} rotation={[-Math.PI/2,0,0]} receiveShadow material={parts.floor}><circleGeometry args={[60,64]}/></mesh>
    <mesh position={[0,FLOOR+.01,0]} rotation={[-Math.PI/2,0,0]} scale={[1.38,1,1]} material={parts.shade} renderOrder={1}><circleGeometry args={[30,64]}/></mesh>
    <mesh position={[0,8,0]} material={parts.wall}><cylinderGeometry args={[34,34,30,48,1,true]}/></mesh>
    <mesh geometry={parts.posts} material={parts.post} castShadow/>
    <mesh geometry={parts.finials} material={parts.finial}/>
    <mesh geometry={parts.ropes} material={parts.rope}/>
  </group>;
}
