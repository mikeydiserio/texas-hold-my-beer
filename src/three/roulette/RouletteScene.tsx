'use client';
import {Component,Suspense,useEffect,useMemo,useRef,type ReactNode,type RefObject} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {DoubleSide,Group,Mesh,Vector2,Vector3,type CanvasTexture} from 'three';
import {BOARD_CELLS,WHEEL,boardBetAt,numberColor,pocketAngle,spinPose,type BetKey,type RouletteState} from '../../games/roulette';
import {boardTexture,wheelTexture,woodTexture} from './textures';
import {feltTexture} from '../textures';
import {ChipStack} from '../chips/Chips';
const gold='#c9c3b6',wood='#614349';
function useTexture(factory:()=>CanvasTexture){const texture=useMemo(factory,[factory]);useEffect(()=>()=>texture.dispose(),[texture]);return texture;}
function Ring({radius,y,tube=.024,color=gold}:{radius:number;y:number;tube?:number;color?:string}){return <mesh position={[0,y,0]} rotation={[-Math.PI/2,0,0]} castShadow><torusGeometry args={[radius,tube,12,128]}/><meshStandardMaterial color={color} metalness={.78} roughness={.26}/></mesh>;}

function Wheel({game,root}:{game:RouletteState;root:RefObject<HTMLDivElement|null>}){
  const rotor=useRef<Group>(null),ball=useRef<Mesh>(null),rim=useTexture(wheelTexture),grain=useTexture(woodTexture);
  const profile=useMemo(()=>[[2.23,.16],[2.37,.24],[2.52,.48],[2.66,.59],[2.81,.59],[2.88,.42],[2.86,.06],[2.7,-.16]].map(([x,y])=>new Vector2(x,y)),[]);
  useFrame(()=>{
    const spin=game.spin,t=spin?(spin.reduced?1:Math.max(0,Math.min(1,(Date.now()-spin.startedAt)/spin.duration))):1;
    const pose=spin?spinPose(spin,t):{wheel:0,angle:0,radius:1.62,height:.235};
    if(rotor.current)rotor.current.rotation.y=pose.wheel;
    if(ball.current){ball.current.position.set(Math.sin(pose.angle)*pose.radius,pose.height,Math.cos(pose.angle)*pose.radius);ball.current.rotation.x=pose.angle*20;}
    if(root.current){root.current.dataset.renderReady='true';root.current.dataset.ballSettled=String(t===1);if(spin&&t===1)root.current.dataset.pocket=String(spin.number);else delete root.current.dataset.pocket;}
  });
  return <group position={[-3,.38,0]}>
    <mesh castShadow receiveShadow position={[0,-.12,0]}><cylinderGeometry args={[2.8,2.56,.38,128]}/><meshStandardMaterial color={wood} map={grain} roughness={.29} metalness={.12}/></mesh>
    <mesh castShadow receiveShadow><latheGeometry args={[profile,128]}/><meshStandardMaterial map={grain} color="#b28c68" roughness={.3} metalness={.12} side={DoubleSide}/></mesh>
    <Ring radius={2.81} y={.59} tube={.045}/><Ring radius={2.67} y={.6} tube={.02}/><Ring radius={2.5} y={.465} tube={.015}/><Ring radius={2.83} y={.04} tube={.028}/>
    {Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <mesh key={i} position={[Math.sin(a)*2.4,.33,Math.cos(a)*2.4]} rotation={[0,a,Math.PI/4]} castShadow><boxGeometry args={[.09,.09,.2]}/><meshStandardMaterial color={gold} metalness={.8} roughness={.22}/></mesh>;})}
    <group ref={rotor}>
      <mesh receiveShadow position={[0,.07,0]}><cylinderGeometry args={[2.24,2.24,.12,128]}/><meshStandardMaterial color="#211912" roughness={.4}/></mesh>
      {WHEEL.map(n=>{const a=pocketAngle(n),step=Math.PI*2/37,border=a+step/2;return <group key={n}>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.15,0]} receiveShadow><ringGeometry args={[1.36,1.87,5,1,a-Math.PI/2-step/2,step]}/><meshStandardMaterial color={n===0?'#267147':numberColor(n)==='red'?'#a12430':'#18161a'} roughness={.46}/></mesh>
        <mesh position={[Math.sin(border)*1.62,.20,Math.cos(border)*1.62]} rotation={[0,border,0]} castShadow><boxGeometry args={[.018,.13,.53]}/><meshStandardMaterial color={gold} metalness={.75} roughness={.27}/></mesh>
      </group>;})}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.245,0]}><planeGeometry args={[4.5,4.5]}/><meshStandardMaterial map={rim} transparent roughness={.48} depthWrite={false}/></mesh>
      <Ring radius={2.235} y={.245} tube={.025}/><Ring radius={1.875} y={.22} tube={.024}/><Ring radius={1.36} y={.19} tube={.034}/>
      <mesh position={[0,.32,0]} castShadow receiveShadow><cylinderGeometry args={[.31,1.36,.37,96]}/><meshStandardMaterial color="#624b31" map={grain} metalness={.28} roughness={.34}/></mesh>
      <Ring radius={.85} y={.42} tube={.017}/>
      <mesh position={[0,.65,0]} castShadow><cylinderGeometry args={[.13,.23,.51,40]}/><meshStandardMaterial color={gold} metalness={.88} roughness={.2}/></mesh>
      <mesh position={[0,.96,0]} castShadow><sphereGeometry args={[.2,32,24]}/><meshStandardMaterial color={gold} metalness={.88} roughness={.2}/></mesh>
      {[0,Math.PI/2].map(a=><group key={a} rotation={[0,a,0]}><mesh position={[0,.83,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.038,.038,1.13,16]}/><meshStandardMaterial color={gold} metalness={.85} roughness={.2}/></mesh>{[-.57,.57].map(x=><mesh key={x} position={[x,.83,0]} castShadow><sphereGeometry args={[.085,20,12]}/><meshStandardMaterial color={gold} metalness={.85} roughness={.2}/></mesh>)}</group>)}
    </group>
    <mesh ref={ball} castShadow><sphereGeometry args={[.078,28,20]}/><meshPhysicalMaterial color="#fff7db" roughness={.16} metalness={.04} clearcoat={1}/></mesh>
  </group>;
}

function BettingBoard({game,onBet}:{game:RouletteState;onBet:(key:BetKey)=>void}){
  const texture=useTexture(boardTexture);
  const bets=new Map<BetKey,number>();if(game.phase!=='settled')for(const bet of game.bets)bets.set(bet.key,(bets.get(bet.key)??0)+bet.amount);
  return <group position={[3,.43,0]}>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow onClick={e=>{e.stopPropagation();if(game.phase==='spinning'||!e.uv)return;const key=boardBetAt(e.uv.x,1-e.uv.y);if(key)onBet(key);}}><planeGeometry args={[5.85,3.55]}/><meshStandardMaterial map={texture} roughness={1}/></mesh>
    {BOARD_CELLS.map(cell=>{
      const amount=bets.get(cell.key),won=game.phase==='settled'&&cell.key===`number:${game.spin?.number}`;
      const x=(cell.x+cell.w/2-.5)*5.85,z=(cell.y+cell.h/2-.5)*3.55;
      return <group key={cell.key} position={[x,0,z]}>
        {won&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]}><ringGeometry args={[.12,.16,32]}/><meshBasicMaterial color="#f3edda"/></mesh>}
        {amount&&<group scale={.83} onClick={e=>{e.stopPropagation();if(game.phase!=='spinning')onBet(cell.key);}}><ChipStack amount={amount} position={[0,.02,0]}/></group>}
      </group>;
    })}
  </group>;
}

function Camera({game,inspect}:{game:RouletteState;inspect:boolean}){
  const {camera,size}=useThree(),target=useRef(new Vector3()),look=useRef(new Vector3()),desired=useMemo(()=>new Vector3(),[]);
  useFrame((_,dt)=>{
    if(inspect)return;
    const aspect=size.width/size.height,reduced=game.spin?.reduced;
    const spinning=!reduced&&(game.phase==='spinning'||game.phase==='settled'&&!!game.spin&&Date.now()<game.spin.startedAt+game.spin.duration+2200);
    const distance=Math.max((spinning?7.1:16.5)/aspect,spinning?5.7:7.2)/(2*Math.tan(22*Math.PI/180));
    desired.set(spinning?-3:0,distance*(spinning?.85:.78),distance*(spinning?.53:.63));
    camera.position.lerp(desired,reduced?1:1-Math.exp(-dt*3));target.current.set(spinning?-3:0,0,0);look.current.lerp(target.current,reduced?1:1-Math.exp(-dt*3));camera.lookAt(look.current);
  });return null;
}
function Contents({game,onBet,inspect,root}:{game:RouletteState;onBet:(key:BetKey)=>void;inspect:boolean;root:RefObject<HTMLDivElement|null>}){
  const felt=useMemo(feltTexture,[]);
  return <><color attach="background" args={['#141316']}/><fog attach="fog" args={['#141316',30,70]}/>
    <ambientLight intensity={.65}/><hemisphereLight args={['#fff1d6','#35272d',1.7]}/><directionalLight position={[-4,10,5]} color="#fff1ce" intensity={3} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-.0005}/><pointLight position={[4,5,-4]} color="#e8c9c1" intensity={38}/><pointLight position={[-6,4,-1]} color="#ffe6d1" intensity={15}/>
    <Camera game={game} inspect={inspect}/>
    <mesh position={[0,-.05,0]} scale={[7.3,1,4.05]} castShadow receiveShadow><cylinderGeometry args={[1,1,.58,128]}/><meshStandardMaterial color="#31242a" roughness={.4}/></mesh>
    <mesh position={[0,.25,0]} scale={[7.28,1,4.03]}><cylinderGeometry args={[1,1,.05,128]}/><meshStandardMaterial color={gold} metalness={.7} roughness={.3}/></mesh>
    <mesh position={[0,.34,0]} scale={[7.17,1,3.92]} receiveShadow><cylinderGeometry args={[1,1,.13,128]}/><meshStandardMaterial color="#201d21" roughness={.66}/></mesh>
    <mesh position={[0,.4,0]} scale={[6.92,1,3.67]} receiveShadow><cylinderGeometry args={[1,1,.014,128]}/><meshStandardMaterial map={felt} roughness={1}/></mesh>
    <Wheel game={game} root={root}/><BettingBoard game={game} onBet={onBet}/>
    <mesh position={[0,-1,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#141316" roughness={1}/></mesh>
    {inspect&&<OrbitControls makeDefault target={[-1,0,0]} enablePan={false} minDistance={6} maxDistance={24} minPolarAngle={.15} maxPolarAngle={1.25}/>}
  </>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="roulette-loading">3D is unavailable on this device. The betting controls below remain playable.</div>:this.props.children;}}
export default function RouletteScene({game,onBet,inspect}:{game:RouletteState;onBet:(key:BetKey)=>void;inspect:boolean}){
  const root=useRef<HTMLDivElement>(null);
  return <div ref={root} className="roulette-canvas" aria-label="3D roulette wheel and betting table"><SceneBoundary><Canvas shadows dpr={[1,1.6]} camera={{position:[-.3,10.6,9.5],fov:44,near:.1,far:100}} gl={{antialias:true,powerPreference:'high-performance'}}><Suspense fallback={null}><Contents game={game} onBet={onBet} inspect={inspect} root={root}/></Suspense></Canvas></SceneBoundary></div>;
}
