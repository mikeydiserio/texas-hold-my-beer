'use client';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry,CapsuleGeometry,Color,CylinderGeometry,Group,LatheGeometry,SphereGeometry,TorusGeometry,Vector2} from 'three';
import {INK,PAPER,RED,printMaterial} from '../print';

/** Seated figures and chairs are scaled down so they frame the table instead of crowding the corners of the view. */
const FIGURE_SCALE=.84;
import type {GameState,Personality} from '../../game/types';
import {silhouetteMaterial} from './silhouette';

// Shared low-poly parts. Arm parts hang from their pivot (the top sits at the origin).
// Torso profile from hips to collar: narrow waist, broad rounded shoulders, so figures read as people rather than capsules.
const torso=new LatheGeometry([[0,0],[.4,0],[.45,.12],[.4,.5],[.43,.85],[.53,1.25],[.56,1.46],[.47,1.66],[.2,1.8],[0,1.82]].map(([r,y])=>new Vector2(r,y)),20),neck=new CylinderGeometry(.15,.17,.38,10),head=new SphereGeometry(.34,16,12);
const upperArm=new CapsuleGeometry(.14,.6,3,8).translate(0,-.44,0),foreArm=new CapsuleGeometry(.12,.62,3,8).translate(0,-.43,0),hand=new SphereGeometry(.14,10,8);
const chairBack=new BoxGeometry(1.6,1.75,.2),chairRoll=new CylinderGeometry(.14,.14,1.66,12).rotateZ(Math.PI/2),chairSeat=new BoxGeometry(1.45,.28,1.2);
const crown=new CylinderGeometry(.28,.33,.3,16),brim=new CylinderGeometry(.58,.58,.03,24),band=new CylinderGeometry(.335,.335,.07,16);
const capDome=new SphereGeometry(.37,16,8,0,Math.PI*2,0,Math.PI/2),capBill=new BoxGeometry(.42,.03,.32);
const headband=new TorusGeometry(.39,.045,6,20,Math.PI),earCup=new CylinderGeometry(.13,.13,.09,12).rotateZ(Math.PI/2),bun=new SphereGeometry(.16,10,8);
const lens=new BoxGeometry(.22,.11,.05),bridge=new BoxGeometry(.1,.025,.04);
const chairMaterial=printMaterial('#262126'),chairTrim=printMaterial('#3a2a2e');
const glassMaterial=printMaterial(INK),bandMaterial=printMaterial(RED);
const ACCESSORY:Record<Personality,'glasses'|'fedora'|'cap'|'headphones'|'bun'|null>={TIGHT:'glasses',AGGRESSIVE:'fedora',MANIAC:'cap',PASSIVE:'headphones',LOOSE:'bun',BALANCED:null};
const CELEBRATION:Record<Personality,'big'|'fist'|'nod'>={MANIAC:'big',LOOSE:'big',AGGRESSIVE:'big',BALANCED:'fist',TIGHT:'nod',PASSIVE:'nod'};
/** lean, head pitch, head yaw, head roll, left upper/fore/spread, right upper/fore/spread. Negative arm pitch reaches toward the table. */
type Pose=[number,number,number,number,number,number,number,number,number,number];
const REST:Pose=[.1,.06,0,0,-.55,-1,.12,-.55,-1,.12];
const THINK:Pose=[.24,.3,0,.12,-.6,-1,.12,-.62,-2.55,.04];
const PUSH:Pose=[.3,.12,0,0,-1.15,-.35,.06,-1.15,-.35,.06];
const ALL_IN:Pose=[.34,.18,0,0,-1.25,-.22,.2,-1.25,-.22,.2];
const FOLD:Pose=[-.14,-.04,.38,0,.05,-.9,.1,.05,-.9,.1];
const CHEER:Pose=[0,-.32,0,0,-2.75,-.3,.38,-2.75,-.3,.38];
const FIST:Pose=[.06,-.12,0,0,-.55,-1,.12,-2.6,-.95,.14];
const NOD:Pose=[.2,.32,0,0,-.55,-1,.14,-.55,-1,.14];
const RAKE:Pose=[.3,.2,0,0,-1.02,-.5,.46,-1.02,-.5,.46];

export interface SeatState { index:number; count:number; name:string; profile:Personality; active:boolean; folded:boolean; allIn:boolean; won:string|null; lastBet:number; }
/** Seat placement just outside the rail, facing the seat's own cards. */
function placement(index:number,count:number){
  const a=index*Math.PI*2/count,x=Math.sin(a)*6.55,z=Math.cos(a)*4.02;
  return {x,z,yaw:Math.atan2(Math.sin(a)*4.13-x,Math.cos(a)*2-z)};
}
function hash(text:string){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296;}

function SeatedPlayer({seat,reduced}:{seat:SeatState;reduced:boolean}){
  const {x,z,yaw}=placement(seat.index,seat.count);
  const rimColor=seat.index===1||seat.index===3?RED:PAPER;
  const material=useMemo(()=>silhouetteMaterial({rim:rimColor,rimStrength:.5,power:2,tone:'#7a2029',toneStrength:.5,dot:4}),[rimColor]);
  const build=useMemo(()=>{const h=hash(seat.name);return {shoulders:.92+h*.2,height:(hash(seat.name+'h')-.5)*.14,phase:h*20};},[seat.name]);
  const hips=useRef<Group>(null),headRef=useRef<Group>(null),armL=useRef<Group>(null),armR=useRef<Group>(null),elbowL=useRef<Group>(null),elbowR=useRef<Group>(null);
  const pose=useRef<Pose>([...REST]),bet=useRef({id:seat.lastBet,until:0}),win=useRef({key:'',since:0}),winRim=useMemo(()=>new Color(PAPER),[]),base=useMemo(()=>new Color(rimColor),[rimColor]);
  useFrame(({clock},dt)=>{
    const t=clock.elapsedTime;
    if(seat.lastBet!==bet.current.id){bet.current={id:seat.lastBet,until:t+.75};}
    if(seat.won!==win.current.key){win.current={key:seat.won||'',since:t};}
    const celebrating=!!seat.won&&t-win.current.since<1.9;
    let target=REST;
    if(seat.won)target=!celebrating?RAKE:CELEBRATION[seat.profile]==='big'?CHEER:CELEBRATION[seat.profile]==='fist'?FIST:NOD;
    else if(seat.folded)target=FOLD;
    else if(t<bet.current.until)target=PUSH;
    else if(seat.allIn)target=ALL_IN;
    else if(seat.active)target=THINK;
    const k=reduced?1:1-Math.exp(-dt*(celebrating?9:6)),p=pose.current;
    for(let i=0;i<p.length;i++)p[i]+=(target[i]-p[i])*k;
    const idle=reduced?0:1,wave=celebrating&&CELEBRATION[seat.profile]==='big'?Math.sin(t*11)*.18:0;
    if(hips.current){hips.current.rotation.x=p[0]+Math.sin(t*1.1+build.phase)*.015*idle;hips.current.scale.y=1+Math.sin(t*1.7+build.phase)*.012*idle;}
    if(headRef.current){
      const look=seat.active||seat.won?0:Math.sin(t*.31+build.phase)*.28*idle;
      headRef.current.rotation.set(p[1]+(celebrating&&CELEBRATION[seat.profile]==='nod'?Math.sin(t*7)*.12*idle:0),p[2]+look,p[3]);
    }
    armL.current?.rotation.set(p[4]+wave*idle,0,-p[6]);armR.current?.rotation.set(p[7]-wave*idle,0,p[9]);
    if(elbowL.current)elbowL.current.rotation.x=p[5];if(elbowR.current)elbowR.current.rotation.x=p[8];
    const u=material.uniforms;
    u.uRim.value.copy(seat.won?winRim:base);
    const rim=seat.won?1.5+Math.sin(t*6)*.3*idle:seat.folded?.15:seat.active?1.1+Math.sin(t*4)*.3*idle:.5;
    u.uRimStrength.value+=(rim-u.uRimStrength.value)*(reduced?1:1-Math.exp(-dt*5));
  });
  const accessory=ACCESSORY[seat.profile];
  return <group position={[x,build.height,z]} rotation={[0,yaw,0]} scale={FIGURE_SCALE}>
    <mesh geometry={chairBack} material={chairMaterial} position={[0,.42,-.82]} rotation={[-.08,0,0]}/>
    <mesh geometry={chairRoll} material={chairTrim} position={[0,1.32,-.9]}/>
    <mesh geometry={chairSeat} material={chairMaterial} position={[0,-.62,-.25]}/>
    <group ref={hips} position={[0,-.45,-.1]}>
      <mesh geometry={torso} material={material} position={[0,.04,0]} scale={[1.18*build.shoulders,1,.64]}/>
      <mesh geometry={neck} material={material} position={[0,1.86,.02]}/>
      <group ref={headRef} position={[0,2.2,.04]}>
        <mesh geometry={head} material={material} scale={[1,1.12,1.05]}/>
        {accessory==='glasses'&&<group position={[0,.04,.33]}><mesh geometry={lens} material={glassMaterial} position={[-.12,0,0]}/><mesh geometry={lens} material={glassMaterial} position={[.12,0,0]}/><mesh geometry={bridge} material={glassMaterial}/></group>}
        {accessory==='fedora'&&<group position={[0,.3,0]} rotation={[-.08,0,0]}><mesh geometry={crown} material={material} position={[0,.14,0]}/><mesh geometry={band} material={bandMaterial} position={[0,.03,0]}/><mesh geometry={brim} material={material}/></group>}
        {accessory==='cap'&&<group position={[0,.12,0]}><mesh geometry={capDome} material={material}/><mesh geometry={capBill} material={material} position={[0,.02,-.48]}/></group>}
        {accessory==='headphones'&&<group><mesh geometry={headband} material={material} position={[0,.04,0]}/><mesh geometry={earCup} material={material} position={[-.38,0,0]}/><mesh geometry={earCup} material={material} position={[.38,0,0]}/></group>}
        {accessory==='bun'&&<mesh geometry={bun} material={material} position={[0,.3,-.24]}/>}
      </group>
      {([[-1,armL,elbowL],[1,armR,elbowR]] as const).map(([side,arm,elbow])=><group key={side} ref={arm} position={[side*.66*build.shoulders,1.62,0]}>
        <mesh geometry={upperArm} material={material}/>
        <group ref={elbow} position={[0,-.88,0]}><mesh geometry={foreArm} material={material}/><mesh geometry={hand} material={material} position={[0,-.88,0]}/></group>
      </group>)}
    </group>
  </group>;
}

const DEMO:Personality[]=['BALANCED','TIGHT','AGGRESSIVE','LOOSE','PASSIVE','MANIAC'];
/** Every AI seat gets a figure; the human seat is the camera's point of view. Eliminated seats leave an empty chair. */
export function SeatedPlayers({game,reduced}:{game:GameState|null;reduced:boolean}){
  const seats:SeatState[]=game?game.players.flatMap((p,i)=>{
    if(p.isHuman||p.eliminated)return [];
    const won=game.awards.some(a=>a.playerIndex===i&&!a.refund)?`${game.handNumber}`:null;
    const lastBet=game.events.reduce((id,e)=>e.type==='BET'&&e.playerIndex===i&&e.id>id?e.id:id,0);
    return [{index:i,count:game.players.length,name:p.name,profile:p.aiProfile,active:i===game.currentPlayerIndex,folded:p.folded,allIn:p.allIn,won,lastBet}];
  }):DEMO.slice(1).map((profile,i)=>({index:i+1,count:6,name:`demo-${i}`,profile,active:false,folded:false,allIn:false,won:null,lastBet:0}));
  const chairs=game?game.players.flatMap((p,i)=>p.eliminated&&!p.isHuman?[placement(i,game.players.length)]:[]):[];
  return <>
    {seats.map(s=><SeatedPlayer key={`${s.index}-${s.name}`} seat={s} reduced={reduced}/>)}
    {chairs.map((c,i)=><group key={i} position={[c.x,0,c.z]} rotation={[0,c.yaw,0]} scale={FIGURE_SCALE}><mesh geometry={chairBack} material={chairMaterial} position={[0,.42,-.82]} rotation={[-.08,0,0]}/><mesh geometry={chairRoll} material={chairTrim} position={[0,1.32,-.9]}/><mesh geometry={chairSeat} material={chairMaterial} position={[0,-.62,-.25]}/></group>)}
  </>;
}
