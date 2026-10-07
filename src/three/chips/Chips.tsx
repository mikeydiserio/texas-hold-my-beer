'use client';
import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry,Group,MeshToonMaterial } from 'three';
import { chipEdgeTexture,chipTexture } from '../textures';
const geometry=new CylinderGeometry(.145,.145,.047,24);
const materials=new Map<number,MeshToonMaterial[]>();
function material(value:number){if(!materials.has(value)){const top=new MeshToonMaterial({map:chipTexture(value)});materials.set(value,[new MeshToonMaterial({map:chipEdgeTexture(value)}),top,top]);}return materials.get(value)!;}
export function ChipStack({amount,position=[0,.5,0]}:{amount:number;position?:[number,number,number]}){
  const stacks=useMemo(()=>{let remaining=amount;return [1000,500,100,25,5,1].flatMap(value=>{const n=Math.floor(remaining/value);remaining%=value;return n?[{value,count:Math.min(n,8)}]:[];});},[amount]);
  return <group position={position}>{stacks.map(({value,count},col)=>Array.from({length:count},(_,i)=><mesh key={`${value}-${i}`} geometry={geometry} material={material(value)} position={[(col-(stacks.length-1)/2)*.29,i*.048+.024,0]} rotation={[0,(i%3)*.17,0]} castShadow/>))}</group>;
}
export function MovingChips({from,to,amount,reduced}:{from:[number,number,number];to:[number,number,number];amount:number;reduced:boolean}){
  const ref=useRef<Group>(null),age=useRef(0);useFrame((_,dt)=>{if(!ref.current)return;age.current+=dt;const t=Math.min(1,age.current/.7),e=1-Math.pow(1-t,3);ref.current.visible=!reduced&&t<1;ref.current.position.set(from[0]+(to[0]-from[0])*e,from[1]+(to[1]-from[1])*e+Math.sin(t*Math.PI)*.28,from[2]+(to[2]-from[2])*e);});
  return <group ref={ref}><ChipStack amount={Math.min(amount,1500)} position={[0,0,0]}/></group>;
}
