import { newDeck, random, rank, shuffle, suit } from './cards';
import { evaluate } from './evaluator';
import type { Action, Card, Observation, Personality, Phase, PublicAction } from './types';
const profiles: Record<Personality,{vpip:number;aggression:number;bluff:number;calling:number;trap:number}>={
  TIGHT:{vpip:.18,aggression:.5,bluff:.04,calling:-.02,trap:.25},
  LOOSE:{vpip:.42,aggression:.45,bluff:.09,calling:.05,trap:.15},
  AGGRESSIVE:{vpip:.28,aggression:.8,bluff:.14,calling:.01,trap:.1},
  PASSIVE:{vpip:.34,aggression:.22,bluff:.025,calling:.06,trap:.35},
  BALANCED:{vpip:.25,aggression:.58,bluff:.08,calling:.02,trap:.2},
  MANIAC:{vpip:.6,aggression:.92,bluff:.25,calling:.07,trap:.05},
};

/** Chen formula, with a high-card tiebreak, ranking the 169 starting-hand classes. */
function chen(a:number,b:number,suited:boolean):number {
  const hi=Math.max(a,b),lo=Math.min(a,b),points=(r:number)=>r===14?10:r===13?8:r===12?7:r===11?6:r/2;
  if(hi===lo)return Math.max(5,points(hi)*2)+hi/100;
  const gap=hi-lo-1;
  return Math.ceil(points(hi)+(suited?2:0)-([0,1,2,4][gap]??5)+(gap<=1&&hi<12?1:0))+hi/100+lo/1000;
}
const classKey=(a:number,b:number,suited:boolean)=>Math.max(a,b)*15+Math.min(a,b)+(suited&&a!==b?300:0);
const percentiles=(()=>{
  const classes:{key:number;score:number;combos:number}[]=[];
  for(let hi=2;hi<=14;hi++)for(let lo=2;lo<=hi;lo++){
    if(hi===lo)classes.push({key:classKey(hi,lo,false),score:chen(hi,lo,false),combos:6});
    else classes.push({key:classKey(hi,lo,true),score:chen(hi,lo,true),combos:4},{key:classKey(hi,lo,false),score:chen(hi,lo,false),combos:12});
  }
  const table=new Map<number,number>();let below=0;
  for(const c of classes.sort((x,y)=>x.score-y.score)){table.set(c.key,(below+c.combos/2)/1326);below+=c.combos;}
  return table;
})();
/** Fraction of all 1,326 starting hands that rank below this one: AA ≈ 1, 72o ≈ 0. */
export function preflopPercentile(hole:Card[]):number {
  return percentiles.get(classKey(rank(hole[0]),rank(hole[1]),suit(hole[0])===suit(hole[1])))!;
}

const STREET_CARDS:Partial<Record<Phase,number>>={FLOP:3,TURN:4,RIVER:5};
type Preflop='none'|'limp'|'callRaise'|'raise'|'reraise';
type Postflop='call'|'bet'|'raise';
interface Read { preflop:Preflop; streets:{cards:number;action:Postflop}[]; }
/** Summarises one opponent's public actions this hand into the strongest line taken on each street. */
function readOpponent(actions:PublicAction[],seat:number):Read {
  const read:Read={preflop:'none',streets:[]};
  for(const street of ['PREFLOP','FLOP','TURN','RIVER'] as const){
    let raisedBefore=false,strongest:Postflop|null=null,pre:Preflop='none';
    for(const a of actions.filter(x=>x.street===street)){
      if(a.seat===seat){
        if(a.aggressive){strongest=raisedBefore?'raise':'bet';pre=raisedBefore?'reraise':'raise';}
        else if(a.type==='CALL'||a.type==='ALL_IN'){strongest??='call';if(pre==='none')pre=raisedBefore?'callRaise':'limp';}
      }
      if(a.aggressive)raisedBefore=true;
    }
    if(street==='PREFLOP')read.preflop=pre;else if(strongest)read.streets.push({cards:STREET_CARDS[street]!,action:strongest});
  }
  return read;
}
/** 0 nothing · 1 any pair or draw using a hole card · 2 top pair, overpair or two pair · 3 two hole cards in two pair, trips or better. */
function tier(hole:Card[],board:Card[]):number {
  const made=evaluate([...hole,...board]).category,hr=hole.map(rank),br=board.map(rank),top=Math.max(...br);
  const pocket=hr[0]===hr[1],hits=hr.filter(r=>br.includes(r));
  if(made>=4||(made>=3&&(pocket||hits.length>0))||(made===2&&!pocket&&hits.length===2&&new Set(br).size===br.length))return 3;
  if((pocket&&hr[0]>top)||hits.includes(top)||(made===2&&(pocket||hits.length>0)))return 2;
  if(pocket||hits.length)return 1;
  if(board.length<5){
    const all=[...hole,...board];
    if(hole.some(h=>all.filter(c=>suit(c)===suit(h)).length>=4))return 1;
    const ranks=new Set(all.map(rank));if(ranks.has(14))ranks.add(1);
    for(let low=1;low<=10;low++){
      let count=0,usesHole=false;
      for(let r=low;r<low+5;r++)if(ranks.has(r)){count++;if(hr.includes(r)||(r===1&&hr.includes(14)))usesHole=true;}
      if(count>=4&&usesHole)return 1;
    }
  }
  return 0;
}
const PREFLOP_WEIGHT:Record<Preflop,(pct:number)=>number>={
  none:()=>1, limp:pct=>pct>=.4?1:.4,
  callRaise:pct=>pct>=.62?1:pct>=.4?.3:.06,
  raise:pct=>pct>=.78?1:pct>=.55?.25:.06,
  reraise:pct=>pct>=.92?1:pct>=.8?.3:.04,
};
const STREET_WEIGHT:Record<Postflop,number[]>={call:[.3,1,1,1],bet:[.25,.65,1,1],raise:[.1,.25,.55,1]};
/** Relative likelihood an opponent would have played this way holding `hole`. Bluffs keep a non-zero weight. */
function weigh(read:Read,hole:Card[],board:Card[]):number {
  let w=PREFLOP_WEIGHT[read.preflop](preflopPercentile(hole));
  for(const s of read.streets){if(w<.02)break;w*=STREET_WEIGHT[s.action][tier(hole,board.slice(0,s.cards))];}
  return w;
}

/**
 * Monte Carlo equity built only from the public information boundary. With `reads`, each opponent's hand is
 * rejection-sampled against what their betting suggests, rather than assumed to be any two cards.
 */
export function estimateEquity(o:Observation,seed:number,samples=64,reads=true):number {
  const known=new Set([...o.holeCards,...o.communityCards]);const unseen=newDeck().filter(c=>!known.has(c));
  const opponents=o.opponents.map(q=>{const read=reads?readOpponent(o.actions,q.seat):null;return read&&(read.preflop!=='none'||read.streets.length)?{read,cache:new Map<string,number>()}:null;});
  let wins=0;
  for(let n=0;n<samples;n++){
    const result=shuffle(seed,unseen);seed=result.seed;const deck=result.deck;
    const board:Card[]=[...o.communityCards,...deck.splice(0,5-o.communityCards.length)];
    const score=evaluate([...o.holeCards,...board]).score;let tie=1,beaten=false;
    for(const opponent of opponents){
      let hole:Card[];
      if(!opponent)hole=deck.splice(0,2);
      else {
        let pick=0,best=-1;
        for(let k=0;k+1<deck.length&&k<24;k+=2){
          const candidate=[deck[k],deck[k+1]],key=candidate.join('');
          let w=opponent.cache.get(key);if(w===undefined){w=weigh(opponent.read,candidate,o.communityCards);opponent.cache.set(key,w);}
          const [roll,next]=random(seed);seed=next;
          if(w>best){best=w;pick=k;}
          if(roll<w){pick=k;break;}
        }
        hole=deck.splice(pick,2);
      }
      const other=evaluate([...hole,...board]).score;if(other>score){beaten=true;break;}if(other===score)tie++;
    }
    if(!beaten)wins+=1/tie;
  }
  return wins/samples;
}

export function decide(o:Observation,seed:number):Action {
  const p=profiles[o.player.aiProfile],l=o.legal,me=o.player.seat;
  const [noise,s1]=random(seed),[choice,s2]=random(s1),[sizing,s3]=random(s2),[mood]=random(s3);
  const spread={Casual:.22,Normal:.08,Strong:.03}[o.difficulty];
  // 0 = first to act after the button (small blind), 1 = the button.
  const position=((me-o.dealerIndex-1+o.seatCount)%o.seatCount)/Math.max(1,o.seatCount-1);
  const street=o.actions.filter(a=>a.street===o.phase&&a.seat!==me);
  const facing=street.filter(a=>a.aggressive).length;
  const odds=l.callAmount/(o.pot+l.callAmount||1);
  const effective=Math.min(o.player.stack+o.player.currentBet,Math.max(0,...o.opponents.map(q=>q.stack+q.currentBet)));
  const unit=Math.max(1,Math.round(o.bigBlind/2));
  const passive=():Action=>l.check?{type:'CHECK'}:{type:'FOLD'};
  const call=():Action=>l.check?{type:'CHECK'}:{type:l.call?'CALL':'ALL_IN'};
  const raiseTo=(target:number):Action=>{
    if(!l.bet&&!l.raise)return l.allIn?{type:'ALL_IN'}:call();
    const amount=Math.min(l.maxRaiseTo,Math.max(l.minRaiseTo,Math.round(target/unit)*unit));
    // Leaving under a third of the stack behind only invites a cheap shove; commit instead.
    if(l.allIn&&l.maxRaiseTo-amount<=(l.maxRaiseTo-o.player.currentBet)*.3)return {type:'ALL_IN'};
    return {type:l.bet?'BET':'RAISE',amount};
  };

  if(o.communityCards.length===0){
    const pct=preflopPercentile(o.holeCards)+(noise-.5)*spread;
    const width=Math.min(1,p.vpip*(.75+.5*position)*(o.opponents.length<=2?1.4:1));
    const callWidth=Math.min(1,width*Math.pow(.42,facing)*(odds<.2?1.4:1));
    const raiseWidth=callWidth*(.2+.5*p.aggression);
    if(effective<=o.bigBlind*12&&l.allIn&&pct>=1-callWidth*.9)return {type:'ALL_IN'};
    const bluff=facing<=1&&pct>.35&&choice<p.bluff*.5;
    if(pct>=1-raiseWidth||bluff){
      const limpers=street.filter(a=>a.type==='CALL').length;
      const facingTo=o.player.currentBet+l.toCall;
      return raiseTo(facing===0?o.bigBlind*(2.2+p.aggression*.8+limpers):facingTo*(position>.5?2.8:3.3));
    }
    if(pct>=1-callWidth||l.callAmount<=o.bigBlind*.25)return call();
    return passive();
  }

  const samples=o.difficulty==='Strong'?128:o.difficulty==='Casual'?24:56;
  const equity=estimateEquity(o,s3,samples,o.difficulty!=='Casual')+(noise-.5)*spread;
  const share=1/(o.opponents.length+1);
  const ranks=o.communityCards.map(rank),suits=o.communityCards.map(suit);
  const wet=new Set(suits).size<=2||Math.max(...ranks)-Math.min(...ranks)<=5;
  const river=o.phase==='RIVER';
  // Slow-play strong hands on dry boards; checking first lets a check-raise follow.
  const trap=equity>.85&&!wet&&!river&&sizing<p.trap;
  const fraction=(bluffing:boolean)=>bluffing?(sizing<.5?.5:.7):equity>.85&&river&&sizing>.6?1.25:(wet?.7:.45)+(sizing-.5)*.3;
  if(l.check){
    const bluff=choice<p.bluff*(wet?.6:1.2)/(1+o.opponents.length*.4);
    if(trap&&!bluff)return {type:'CHECK'};
    if((equity>Math.max(.5,share+.18)&&mood<.35+p.aggression*.65)||bluff){
      if(equity>.72&&effective<o.pot*1.2&&l.allIn)return {type:'ALL_IN'};
      return raiseTo(o.pot*fraction(bluff&&equity<share));
    }
    return {type:'CHECK'};
  }
  const value=equity>Math.max(.6,share+.25)&&mood<.3+p.aggression*.7&&!(trap&&o.phase==='FLOP');
  const bluffRaise=!river&&facing===1&&choice<p.bluff*.35;
  if(value||bluffRaise){
    if(equity>.72&&effective<o.pot*1.2&&l.allIn)return {type:'ALL_IN'};
    return raiseTo(o.player.currentBet+l.toCall+(o.pot+l.toCall)*fraction(!value));
  }
  const committed=l.callAmount>=o.player.stack*.5?.03:0;
  if(equity>odds+.02+committed-p.calling)return call();
  return passive();
}
