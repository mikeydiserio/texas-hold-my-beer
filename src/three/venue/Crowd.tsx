'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CapsuleGeometry,Color,CylinderGeometry,Euler,InstancedMesh,Matrix4,Quaternion,SphereGeometry,Vector3} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {GameState} from '../../game/types';
import {silhouetteMaterial} from './silhouette';

const FLOOR=-2.05;
// One merged standing figure (origin at the feet, facing +z) plus separately posed arms.
const body=mergeGeometries([
  new CapsuleGeometry(.2,1.9,3,8).translate(-.21,1.15,0),new CapsuleGeometry(.2,1.9,3,8).translate(.21,1.15,0),
  new CapsuleGeometry(.48,1.1,4,10).scale(1.28,1,.74).translate(0,3.1,0),
  new CylinderGeometry(.14,.16,.36,8).translate(0,4.2,0),new SphereGeometry(.34,12,10).scale(1,1.12,1.05).translate(0,4.62,0),
])!;
const arm=new CapsuleGeometry(.13,1.3,3,6).translate(0,-.78,0);
const SHOULDER=new Vector3(.62,3.95,0);
const TINTS=['#8f8879','#7a2a2e','#6e6862','#8f8879'].map(c=>new Color(c));

interface Spectator { x:number; z:number; yaw:number; scale:number; width:number; phase:number; energy:number; raiser:boolean; tint:Color; }
/** Deterministic rows of spectators on an arc behind and beside the table, leaving the camera side open. */
function spectators():Spectator[]{
  let seed=20240607;const rand=()=>{seed=Math.imul(seed^(seed>>>15),2246822507)+0x9e3779b9>>>0;return seed/4294967296;};
  const out:Spectator[]=[];
  [[12,9.4],[13.8,11]].forEach(([rx,rz],row)=>{
    for(let a=(98-row*3)*Math.PI/180;a<(262+row*3)*Math.PI/180;){
      const step=Math.hypot(rx*Math.cos(a),rz*Math.sin(a));
      if(rand()>.1){
        const push=(rand()-.5)*.7,x=Math.sin(a)*(rx+push),z=Math.cos(a)*(rz+push);
        const toTable=Math.atan2(-x,-z),chatting=rand()<.15;
        out.push({x,z,yaw:toTable+(chatting?(rand()<.5?-1:1)*.9:(rand()-.5)*.45),scale:.92+rand()*.17,width:.9+rand()*.25,phase:rand()*30,energy:.45+rand()*.55,raiser:rand()<.55,tint:TINTS[Math.floor(rand()*TINTS.length)]});
      }
      a+=(1.7+rand()*.5)/step;
    }
  });
  return out;
}

/** Crowd mood follows public table events: all-ins draw people in, showdowns and big pots get a cheer. */
function useMood(game:GameState|null){
  const mood=useRef({cheer:0,tension:0,lastHand:0,lastPhase:''});
  useEffect(()=>{
    if(!game)return;const m=mood.current,key=`${game.handNumber}-${game.phase}`;
    if(key===m.lastPhase)return;m.lastPhase=key;
    const awarded=game.awards.filter(a=>!a.refund),biggest=Math.max(0,...awarded.map(a=>a.amount)),bb=game.config.bigBlind;
    if(game.phase==='SHOWDOWN')m.cheer=Math.max(m.cheer,Math.min(1,.35+biggest/(bb*30))*(awarded.some(a=>a.playerIndex===0)?1.15:1));
    else if(game.phase==='HAND_COMPLETE'&&biggest>bb*12)m.cheer=Math.max(m.cheer,.25);
    else if(game.phase==='TABLE_COMPLETE')m.cheer=1.2;
  },[game]);
  const tension=!!game&&['PREFLOP','FLOP','TURN','RIVER','SHOWDOWN'].includes(game.phase)&&game.players.some(p=>p.allIn&&!p.folded);
  return {mood,tension};
}

export function Crowd({game,reduced}:{game:GameState|null;reduced:boolean}){
  const people=useMemo(spectators,[]),count=people.length;
  const bodies=useRef<InstancedMesh>(null),left=useRef<InstancedMesh>(null),right=useRef<InstancedMesh>(null);
  const material=useMemo(()=>silhouetteMaterial({rim:'#ffffff',rimStrength:.25,base:'#121015',tone:'#3a1519',toneStrength:.35,fade:[8,12],dot:5}),[]);
  const {mood,tension}=useMood(game);
  const tmp=useMemo(()=>({m:new Matrix4(),a:new Matrix4(),q:new Quaternion(),e:new Euler(0,0,0,'YXZ'),p:new Vector3(),s:new Vector3(),o:new Vector3()}),[]);
  useEffect(()=>{for(const mesh of [bodies.current,left.current,right.current])people.forEach((s,i)=>mesh?.setColorAt(i,s.tint));for(const mesh of [bodies.current,left.current,right.current])if(mesh?.instanceColor)mesh.instanceColor.needsUpdate=true;},[people]);
  useFrame(({clock},dt)=>{
    const m=mood.current,t=clock.elapsedTime,motion=reduced?0:1;
    m.cheer=Math.max(0,m.cheer-dt*.28);m.tension+=((tension?1:0)-m.tension)*(1-Math.exp(-dt*2));
    const {m:matrix,a,q,e,p,s,o}=tmp;
    people.forEach((person,i)=>{
      const cheer=Math.min(1,m.cheer*person.energy)*motion,bounce=Math.abs(Math.sin(t*8.5+person.phase))*.32*cheer;
      e.set(m.tension*.1+cheer*.05+Math.sin(t*.9+person.phase)*.012*motion,person.yaw+Math.sin(t*.23+person.phase)*.06*motion,Math.sin(t*.7+person.phase)*.025*motion);
      matrix.compose(p.set(person.x,FLOOR+bounce,person.z),q.setFromEuler(e),s.set(person.width*person.scale,person.scale,person.width*person.scale));
      bodies.current?.setMatrixAt(i,matrix);
      const raise=person.raiser?cheer*2.6:cheer*.9,flap=Math.sin(t*10+person.phase)*.25*cheer;
      for(const [side,mesh] of [[-1,left.current],[1,right.current]] as const){
        e.set(-.08-raise-(side>0?flap:-flap),0,side*(.12+cheer*.35));
        a.compose(o.set(SHOULDER.x*side,SHOULDER.y,SHOULDER.z),q.setFromEuler(e),s.set(1,1,1));
        mesh?.setMatrixAt(i,a.premultiply(matrix));
      }
    });
    for(const mesh of [bodies.current,left.current,right.current])if(mesh)mesh.instanceMatrix.needsUpdate=true;
  });
  return <group>
    <instancedMesh ref={bodies} args={[body,material,count]} frustumCulled={false}/>
    <instancedMesh ref={left} args={[arm,material,count]} frustumCulled={false}/>
    <instancedMesh ref={right} args={[arm,material,count]} frustumCulled={false}/>
  </group>;
}
