'use client';
import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Group,MathUtils,MeshStandardMaterial,PlaneGeometry } from 'three';
import type { Card } from '../../game/types';
import { cardTexture } from '../textures';
const bodyGeometry=new RoundedBoxGeometry(.61,.026,.88,2,.025);
const faceGeometry=new PlaneGeometry(.585,.855);
const bodyMaterial=new MeshStandardMaterial({color:'#e7dfca',roughness:.6});
export function Card3D({card,position,faceUp=true,delay=0,folded=false,highlight=false,rotation=0,reduced=false}:{card:Card;position:[number,number,number];faceUp?:boolean;delay?:number;folded?:boolean;highlight?:boolean;rotation?:number;reduced?:boolean}){
  const ref=useRef<Group>(null),age=useRef(0);
  const face=useMemo(()=>new MeshStandardMaterial({map:cardTexture(card),roughness:.75,emissive:'#e83235',emissiveIntensity:0}),[card]);
  const back=useMemo(()=>new MeshStandardMaterial({map:cardTexture('back'),roughness:.8}),[]);
  useFrame((_,dt)=>{if(!ref.current)return;age.current+=dt;const t=reduced?1:Math.min(1,Math.max(0,(age.current-delay)/.6));const e=1-Math.pow(1-t,3);const g=ref.current;g.visible=t>0;
    const target=folded?[-1,.7,-1.5]:position;const ease=reduced?1:1-Math.exp(-dt*8);
    if(t<1&&!folded){g.position.set(-1+(position[0]+1)*e,.65+Math.sin(t*Math.PI)*.65+(position[1]-.65)*e,-1.5+(position[2]+1.5)*e);}else{g.position.x=MathUtils.lerp(g.position.x,target[0],ease);g.position.y=MathUtils.lerp(g.position.y,target[1],ease);g.position.z=MathUtils.lerp(g.position.z,target[2],ease);}
    g.rotation.y=rotation+(t<1&&!folded?(1-e)*Math.PI*2:0);g.rotation.z=MathUtils.lerp(g.rotation.z,faceUp?0:Math.PI,ease);const scale=MathUtils.lerp(g.scale.x,folded?0:1,ease);g.scale.setScalar(scale);face.emissiveIntensity=highlight?.25:0;
  });
  return <group ref={ref} position={reduced?position:[-1,.65,-1.5]} rotation={[0,rotation,faceUp?0:Math.PI]}><mesh geometry={bodyGeometry} material={bodyMaterial} castShadow/><mesh geometry={faceGeometry} material={face} position={[0,.014,0]} rotation={[-Math.PI/2,0,0]}/><mesh geometry={faceGeometry} material={back} position={[0,-.014,0]} rotation={[Math.PI/2,0,0]}/>{highlight&&<mesh position={[0,-.008,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.67,.94]}/><meshBasicMaterial color="#e83235"/></mesh>}</group>;
}
