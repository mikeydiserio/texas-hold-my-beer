'use client';
import {Component,Suspense,useMemo,useRef,type ReactNode,type RefObject} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {Group,MathUtils,PCFShadowMap,PerspectiveCamera,Vector3} from 'three';
import {useGame} from '../state/game-store';
import type {GameState} from '../game/types';
import {Card3D} from './cards/Card3D';
import {ChipStack,MovingChips} from './chips/Chips';
import {seatPosition} from './table/positions';
import {feltTexture,logoTexture} from './textures';
const fmt=(n:number)=>n.toLocaleString('en-US');
function Camera({overhead,reduced,cue}:{overhead:boolean;reduced:boolean;cue:string}){
  const {camera,size}=useThree(),target=useMemo(()=>new Vector3(),[]),last=useRef(cue),pulse=useRef(0);
  useFrame((_,dt)=>{if(last.current!==cue){pulse.current=reduced?0:.10;last.current=cue;}pulse.current=Math.max(0,pulse.current-dt*.25);
    const distance=Math.max(1,1.8/(size.width/size.height));target.set(0,(overhead?10.2:6.7)*distance,(overhead?3.8:7.8)*distance+pulse.current);
    camera.position.lerp(target,reduced?1:1-Math.exp(-dt*4));camera.lookAt(0,0,0);(camera as PerspectiveCamera).fov=40;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  });return null;
}
/** HTML belongs to the main React root. Only CSS positions are updated by rendering. */
function ProjectLabels({root,revision}:{root:RefObject<HTMLDivElement|null>;revision:number}){
  const {camera,size}=useThree(),point=useMemo(()=>new Vector3(),[]),last=useRef(-1),anchors=useRef<{el:HTMLElement;pos:number[]}[]>([]);
  useFrame((state)=>{if(root.current&&state.gl.info.render.calls>10)root.current.dataset.renderReady='true';if(last.current!==revision||!anchors.current.length){anchors.current=Array.from(root.current?.parentElement?.parentElement?.querySelectorAll<HTMLElement>('[data-table-anchor]')||[]).map(el=>({el,pos:el.dataset.tableAnchor!.split(',').map(Number)}));last.current=revision;}
    for(const {el,pos} of anchors.current){point.set(pos[0],pos[1],pos[2]).project(camera);let x=(point.x+1)*size.width/2,y=(-point.y+1)*size.height/2;if(el.classList.contains('seat-anchor')){const pad=size.width<700?37:70;x=MathUtils.clamp(x,pad,size.width-pad);y=MathUtils.clamp(y,70,size.height-45);}el.style.left='0';el.style.top='0';el.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;}
  });return null;
}
function Table(){const felt=useMemo(feltTexture,[]),logo=useMemo(logoTexture,[]);return <group>
  <mesh position={[0,-.3,0]} scale={[5.72,1,3.16]} castShadow receiveShadow><cylinderGeometry args={[1,1,.42,96]}/><meshStandardMaterial color="#211c16" roughness={.35} metalness={.2}/></mesh>
  <mesh position={[0,-.065,0]} scale={[5.68,1,3.12]} castShadow><cylinderGeometry args={[1,1,.05,96]}/><meshStandardMaterial color="#a18d5f" roughness={.3} metalness={.6}/></mesh>
  <mesh position={[0,.13,0]} scale={[5.62,1,3.06]} castShadow receiveShadow><cylinderGeometry args={[1,1,.34,96]}/><meshStandardMaterial color="#121915" roughness={.76}/></mesh>
  <mesh position={[0,.28,0]} rotation={[-Math.PI/2,0,0]} scale={[5.32,2.78,1.8]} castShadow receiveShadow><torusGeometry args={[1,.075,16,96]}/><meshStandardMaterial color="#171e19" roughness={.58}/></mesh>
  <mesh position={[0,.305,0]} scale={[5.12,1,2.59]} receiveShadow><cylinderGeometry args={[1,1,.03,96]}/><meshStandardMaterial map={felt} roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.335,0]} scale={[4.84,2.32,1]}><torusGeometry args={[1,.003,4,96]}/><meshBasicMaterial color="#b6c4a0" transparent opacity={.38}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.34,1]}><planeGeometry args={[3.3,.825]}/><meshBasicMaterial map={logo} transparent depthWrite={false}/></mesh>
  <mesh position={[0,-2.05,0]} receiveShadow rotation={[-Math.PI/2,0,0]}><planeGeometry args={[200,200]}/><meshStandardMaterial color="#0b140f" roughness={1}/></mesh>
  {[-3.3,3.3].map(x=><mesh key={x} position={[x,-1.25,0]} castShadow><cylinderGeometry args={[.35,.55,2.2,24]}/><meshStandardMaterial color="#151916" metalness={.5} roughness={.6}/></mesh>)}
  <ChipStack amount={750} position={[-2.2,.35,-1.6]}/><Card3D card="As" position={[-1.5,.4,-1.65]} faceUp={false} reduced/>
  </group>;}
function Dealer({index,count,reduced}:{index:number;count:number;reduced:boolean}){
  const ref=useRef<Group>(null),target=useMemo(()=>new Vector3(),[]);useFrame((_,dt)=>{const p=seatPosition(index,count,.76);target.set(p[0]+.6,.39,p[2]+.35);ref.current?.position.lerp(target,reduced?1:1-Math.exp(-dt*5));});return <group ref={ref}><mesh><cylinderGeometry args={[.16,.16,.045,24]}/><meshStandardMaterial color="#e5dbb5" roughness={.65}/></mesh><mesh position={[0,.024,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.1,.11,24]}/><meshBasicMaterial color="#2a3824"/></mesh></group>;
}
function TablePlayers({game}:{game:GameState}){
  const prefs=useGame(s=>s.preferences),n=game.players.length;
  return <>{game.players.map((p,i)=>{const pos=seatPosition(i,n,.87),bet=seatPosition(i,n,.63),result=game.results[i];const won=game.awards.some(a=>a.playerIndex===i&&!a.refund),reveal=p.isHuman||!!result||(!prefs.autoMuck&&won);
    return <group key={p.id}>{p.holeCards.map((card,j)=><Card3D key={`${game.handNumber}-${card}`} card={card} position={[pos[0]+(j-.5)*.45,pos[1]+j*.01,pos[2]]} rotation={(j-.5)*-.16} faceUp={reveal} delay={(j*n+(i-game.dealerIndex-1+n)%n)*.11} folded={p.folded||(game.phase==='HAND_COMPLETE'&&prefs.autoMuck)} highlight={won&&!!result?.bestFive.includes(card)} reduced={prefs.reducedMotion||prefs.speed==='Instant'}/>)}
      {!p.eliminated&&<ChipStack amount={p.stack} position={[pos[0]+(pos[0]>0?-.7:.7),.35,pos[2]+.25]}/>} {p.currentBet>0&&<ChipStack amount={p.currentBet} position={[bet[0],.35,bet[2]]}/>}
    </group>;
  })}</>;
}
function Labels({game}:{game:GameState}){return <div className="seat-overlays" data-count={game.players.length}>{game.players.map((p,i)=>{const pos=seatPosition(i,game.players.length,p.isHuman?1.48:1.22),bet=seatPosition(i,game.players.length,.63),won=game.awards.some(a=>a.playerIndex===i&&!a.refund),active=i===game.currentPlayerIndex;return <div key={p.id}>
  <div className="seat-anchor" data-table-anchor={[pos[0],p.isHuman?.3:.65,pos[2]].join(',')}><div className={`seat ${active?'acting':''} ${p.folded||p.eliminated?'inactive':''} ${won?'winner':''} ${p.isHuman?'human':''}`} title={`${p.aiProfile.toLowerCase()} personality`}><span className={`avatar avatar-${i}`}>{p.isHuman?'Y':p.name[0]}</span><div className="seat-info"><strong>{p.name}{p.isHuman&&<em>YOU</em>}</strong><span>{p.eliminated?'OUT':fmt(p.stack)}</span></div><div className="seat-status">{active?'Thinking…':game.results[i]?.name||p.lastAction||p.aiProfile.toLowerCase()}</div>{(i===game.dealerIndex||i===game.smallBlindIndex||i===game.bigBlindIndex)&&<div className="seat-markers">{i===game.dealerIndex&&<b>D</b>}{i===game.smallBlindIndex&&<span>SB</span>}{i===game.bigBlindIndex&&<span>BB</span>}</div>}</div></div>
  {p.currentBet>0&&<div className="bet-anchor" data-table-anchor={[bet[0],.75,bet[2]].join(',')}><span className="bet-label">{fmt(p.currentBet)}</span></div>}
  </div>;})}</div>;}
function Contents({game,inspect,root}:{game:GameState|null;inspect:boolean;root:RefObject<HTMLDivElement|null>}){
  const prefs=useGame(s=>s.preferences),n=game?.players.length||6,reduced=prefs.reducedMotion||prefs.speed==='Instant';
  const winnerCards=new Set(game?.awards.filter(a=>!a.refund).flatMap(a=>game.results[a.playerIndex]?.bestFive||[]));
  return <><color attach="background" args={['#0c1410']}/><fog attach="fog" args={['#0c1410',28,65]}/><ambientLight intensity={.8}/><hemisphereLight args={['#f1eed9','#24372b',1.2]}/><directionalLight position={[-3,9,3]} intensity={2.3} color="#fff2d5" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.001}/><pointLight position={[3,4,-4]} intensity={25} color="#98bba4"/>
    {!inspect&&<Camera overhead={prefs.camera==='overhead'} reduced={reduced} cue={`${game?.handNumber}-${game?.phase}`}/>}<ProjectLabels root={root} revision={game?.nextEventId||0}/><Table/>
    {game?<><TablePlayers game={game}/>{game.communityCards.map((c,i)=><Card3D key={`${game.handNumber}-${c}`} card={c} position={[(i-2)*.75,.38,0]} delay={i<3?i*.13:0} folded={game.phase==='HAND_COMPLETE'} highlight={winnerCards.has(c)} reduced={reduced}/>)}
      <ChipStack amount={Math.max(0,game.pot-game.players.reduce((v,p)=>v+p.currentBet,0))} position={[0,.35,-1.05]}/><Dealer index={game.dealerIndex} count={n} reduced={reduced}/>
      {game.events.slice(-20).filter(e=>e.type==='BET'||e.type==='AWARD').map(e=><MovingChips key={e.id} from={e.type==='BET'?seatPosition(e.playerIndex!,n,.9):[0,.4,-1.05]} to={e.type==='AWARD'?seatPosition(e.playerIndex!,n,.9):seatPosition(e.playerIndex!,n,.63)} amount={e.amount||100} reduced={reduced}/>)}
      {game.events.slice(-12).filter(e=>e.type==='COLLECT').flatMap(e=>(e.contributions||[]).map(c=><MovingChips key={`${e.id}-${c.playerIndex}`} from={seatPosition(c.playerIndex,n,.63)} to={[0,.4,-1.05]} amount={c.amount} reduced={reduced}/>))}
    </>:<>{Array.from({length:6},(_,i)=><group key={i}><ChipStack amount={2500} position={seatPosition(i,6,.85)}/>{[0,1].map(j=><Card3D key={j} card={j?'Kh':'As'} position={[seatPosition(i,6,.84)[0]+(j-.5)*.45,.5,seatPosition(i,6,.84)[2]]} faceUp={false} reduced/>)}</group>)}</>}
    {inspect&&<OrbitControls makeDefault target={[0,0,0]} minDistance={8} maxDistance={25} minPolarAngle={.15} maxPolarAngle={1.25} enablePan={false}/>}
  </>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="scene-fallback">3D is unavailable on this device. Your game is fully playable using the cards, seat list, and controls below.</div>:this.props.children;}}
export default function PokerScene({inspect=false}:{inspect?:boolean}){const game=useGame(s=>s.game),root=useRef<HTMLDivElement>(null);return <div ref={root} style={{width:'100%',height:'100%',position:'relative'}}><SceneBoundary><Canvas shadows={{type:PCFShadowMap}} dpr={[1,1.6]} camera={{position:[0,6.7,7.8],fov:40,near:.1,far:100}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}><Suspense fallback={null}><Contents game={game} inspect={inspect} root={root}/></Suspense></Canvas></SceneBoundary>{game&&<Labels game={game}/>}</div>;}
