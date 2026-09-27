// Builds the character-free Hold'em and Blackjack posters and composites them into
// public/wild-hand-posters.png (panels 1 and 2 of the four-panel atlas).
// Run: node design/posters/build.mjs
import {chromium} from 'playwright';
import {unlinkSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url)),root=join(here,'..','..');
const W=444,H=887,INK='#131313',PAPER='#f3edda',RED='#e83235',DEEP='#b31f29';

// Seeded PRNG so the print texture is identical on every build.
function rng(seed){return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}

const SUITS={
  s:'M50 4C31 30 5 44 5 64c0 18 20 28 38 17-2 8-6 14-13 17h40c-7-3-11-9-13-17 18 11 38 1 38-17C95 44 69 30 50 4Z',
  h:'M50 95C21 71 3 53 3 32 3 15 16 5 30 5c10 0 17 7 20 15 3-8 10-15 20-15 14 0 27 10 27 27 0 21-18 39-47 63Z',
  d:'M50 3 91 50 50 97 9 50Z',
  c:'M50 7a20 20 0 0 1 17 30 20 20 0 1 1-11 25c1 15 6 26 14 35H30c8-9 13-20 14-35a20 20 0 1 1-11-25A20 20 0 0 1 50 7Z',
};
const glyph=(s,x,y,size,fill)=>`<path d="${SUITS[s]}" fill="${fill}" transform="translate(${x-size/2} ${y-size/2}) scale(${size/100})"/>`;
const crown=(x,y,w,fill)=>`<g transform="translate(${x-w/2} ${y}) scale(${w/100})" fill="${fill}"><path d="M4 58 9 14 30 36 50 2 70 36 91 14 96 58Z"/><rect x="4" y="63" width="92" height="11"/><circle cx="9" cy="11" r="6"/><circle cx="50" cy="3" r="6"/><circle cx="91" cy="11" r="6"/></g>`;

// A playing card in the print style: ivory stock, ink keyline, hard offset shadow.
function card({x,y,w,h,rot,rank,suit,shadow=INK,shadowOffset=8,bold=true}){
  const col=suit==='h'||suit==='d'?RED:INK,label=rank==='T'?'10':rank,fs=w*.27;
  const corner=`<text x="${w*.14}" y="${w*.3}" font-family="Anton" font-size="${fs}" text-anchor="middle" fill="${col}">${label}</text>${glyph(suit,w*.14,w*.42,w*.15,col)}`;
  let centre;
  if(rank==='A')centre=`<circle cx="${w/2}" cy="${h/2}" r="${w*.36}" fill="none" stroke="${col}" stroke-width="${w*.018}"/><circle cx="${w/2}" cy="${h/2}" r="${w*.31}" fill="none" stroke="${col}" stroke-width="${w*.008}" stroke-dasharray="${w*.03} ${w*.025}"/>${glyph(suit,w/2,h/2,w*.44,col)}`;
  else if('KQJ'.includes(rank)&&!bold)centre=`${crown(w/2,h*.28,w*.34,col)}<text x="${w/2}" y="${h*.7}" font-family="Anton" font-size="${w*.42}" text-anchor="middle" fill="${col}">${rank}</text>`;
  else if('KQJ'.includes(rank))centre=`<rect x="${w*.22}" y="${h*.2}" width="${w*.56}" height="${h*.6}" fill="${col}"/>${crown(w/2,h*.25,w*.4,PAPER)}<text x="${w/2}" y="${h*.72}" font-family="Anton" font-size="${w*.44}" text-anchor="middle" fill="${PAPER}">${rank}</text>`;
  else centre=`<text x="${w/2}" y="${h*.63}" font-family="Anton" font-size="${w*.5}" text-anchor="middle" fill="${col}">${label}</text>${glyph(suit,w/2,h*.77,w*.2,col)}`;
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><g transform="translate(${-w/2} ${-h/2})">
    <rect x="${shadowOffset}" y="${shadowOffset}" width="${w}" height="${h}" rx="${w*.05}" fill="${shadow}"/>
    <rect width="${w}" height="${h}" rx="${w*.05}" fill="${PAPER}" stroke="${INK}" stroke-width="3.5"/>
    <rect x="${w*.06}" y="${w*.06}" width="${w*.88}" height="${h-w*.12}" rx="${w*.03}" fill="none" stroke="${col}" stroke-width="1.4" opacity=".55"/>
    ${centre}${corner}<g transform="rotate(180 ${w/2} ${h/2})">${corner}</g></g></g>`;
}

// Chip seen at an angle: edge band with paper inserts, then the face.
function chip(x,y,r,face,edge=INK,tilt=.34){
  const ry=r*tilt,band=r*.22;let out=`<ellipse cx="${x}" cy="${y+band}" rx="${r}" ry="${ry}" fill="${edge}"/><rect x="${x-r}" y="${y}" width="${r*2}" height="${band}" fill="${edge}"/>`;
  for(let i=0;i<6;i++){const a=-Math.PI/2+i/5*Math.PI,sx=x+Math.cos(a)*r*.93;out+=`<rect x="${sx-3}" y="${y+2}" width="6" height="${band-1}" fill="${PAPER}" opacity="${Math.abs(Math.cos(a))>.95?0:.95}"/>`;}
  return out+`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${ry}" fill="${face}" stroke="${INK}" stroke-width="2.5"/><ellipse cx="${x}" cy="${y}" rx="${r*.8}" ry="${ry*.8}" fill="none" stroke="${PAPER}" stroke-width="${r*.13}" stroke-dasharray="${r*.28} ${r*.22}"/><ellipse cx="${x}" cy="${y}" rx="${r*.5}" ry="${ry*.5}" fill="none" stroke="${PAPER}" stroke-width="1.5" opacity=".8"/>`;
}
const stack=(x,y,r,faces,lean=0,edge=INK)=>faces.map((f,i)=>chip(x+i*lean,y-i*r*.22,r,f,edge)).join('');

// Halftone field: dot radius follows a shade function, as a real screen would.
function halftone(step,shade,fill,clip=''){const r=[];for(let y=0;y<=H+step;y+=step)for(let x=(y/step)%2?step/2:0;x<=W+step;x+=step){const v=shade(x,y);if(v>.04)r.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(v*step*.58).toFixed(2)}"/>`);}return `<g fill="${fill}"${clip}>${r.join('')}</g>`;}
const clamp=v=>Math.max(0,Math.min(1,v));

const defs=seed=>`<defs>
  <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="worn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed+4}" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 13 0 0 0 -8.3" result="holes"/><feComposite in="SourceGraphic" in2="holes" operator="out"/></filter>
  <filter id="speck" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="${seed+9}"/><feColorMatrix type="matrix" values="0 0 0 0 .075 0 0 0 0 .075 0 0 0 0 .075 11 0 0 0 -6.9"/></filter>
  <filter id="speck-paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="${seed+17}"/><feColorMatrix type="matrix" values="0 0 0 0 .95 0 0 0 0 .93 0 0 0 0 .85 10 0 0 0 -7.1"/></filter>
</defs>`;
const finish=`<rect width="${W}" height="${H}" filter="url(#speck)" opacity=".3"/><rect width="${W}" height="${H}" filter="url(#speck-paper)" opacity=".35"/>`;
const svg=(seed,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs(seed)}${body}${finish}</svg>`;

function holdem(){
  const cx=222,cy=404,rand=rng(71);
  const rays=Array.from({length:22},(_,i)=>{const a=i/22*Math.PI*2+.08,da=.055;return `<path d="M${cx} ${cy}L${cx+Math.cos(a-da)*900} ${cy+Math.sin(a-da)*900}L${cx+Math.cos(a+da)*900} ${cy+Math.sin(a+da)*900}Z"/>`;}).join('');
  const fan=[['T',-30],['J',-15],['Q',0],['K',15],['A',30]].map(([rank,a])=>`<g transform="rotate(${a} 222 800)">${card({x:222,y:548,w:150,h:214,rot:0,rank,suit:'s',bold:false})}</g>`).join('');
  const streaks=Array.from({length:7},(_,i)=>{const y=150+i*13+rand()*6,x=298+rand()*30;return `<path d="M${x} ${y}l${-70-rand()*60} ${34+rand()*10}" stroke="${INK}" stroke-width="${2+rand()*2.5}" stroke-linecap="round"/>`;}).join('');
  return svg(3,`<rect width="${W}" height="${H}" fill="${RED}"/>
    ${halftone(9,(x,y)=>clamp((y/H)*1.25-.18+(1-x/W)*.25),DEEP)}
    <g filter="url(#rough)"><g fill="${INK}" filter="url(#worn)">${rays}</g>
      <circle cx="${cx}" cy="${cy}" r="176" fill="${INK}" filter="url(#worn)"/><circle cx="${cx}" cy="${cy}" r="156" fill="none" stroke="${PAPER}" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="146" fill="none" stroke="${RED}" stroke-width="2"/>
      ${glyph('s',cx,cy-18,236,PAPER)}<clipPath id="spade"><path d="${SUITS.s}" transform="translate(${cx-118} ${cy-136}) scale(2.36)"/></clipPath>
      ${halftone(7,(x,y)=>clamp((x-cx)/150+(y-cy)/260),INK,' clip-path="url(#spade)"')}
      <path d="M0 742 L${W} 648 L${W} ${H} L0 ${H}Z" fill="${INK}" filter="url(#worn)"/><path d="M0 726 L${W} 632" stroke="${PAPER}" stroke-width="6"/>
      ${fan}
      ${stack(70,752,50,[RED,PAPER,RED,PAPER,RED,PAPER,RED],.8,DEEP)}${stack(390,712,38,[PAPER,RED,PAPER,RED],0,DEEP)}
      ${streaks}<g transform="rotate(-24 348 144)">${chip(348,144,34,PAPER)}</g><g transform="rotate(31 394 244)">${chip(394,244,24,RED)}</g>
    </g>`);
}

function blackjack(){
  const cx=226,cy=384,rand=rng(19);
  const burst=Array.from({length:30},(_,i)=>{const a=i/30*Math.PI*2+rand()*.08,r0=205+rand()*25,r1=r0+45+rand()*120;return `<path d="M${cx+Math.cos(a)*r0} ${cy+Math.sin(a)*r0}L${cx+Math.cos(a)*r1} ${cy+Math.sin(a)*r1}" stroke="${PAPER}" stroke-width="${2+rand()*4}" stroke-linecap="square"/>`;}).join('');
  const dx=cx-.7*190,dy=cy-.7*190;
  return svg(11,`<rect width="${W}" height="${H}" fill="${INK}"/>
    <g filter="url(#rough)">
      <circle cx="${cx}" cy="${cy}" r="190" fill="${RED}"/>
      <clipPath id="sun"><circle cx="${cx}" cy="${cy}" r="190"/></clipPath>
      ${halftone(8,(x,y)=>clamp(Math.hypot(x-dx,y-dy)/380-.25),INK,' clip-path="url(#sun)"')}
      <circle cx="${cx}" cy="${cy}" r="206" fill="none" stroke="${PAPER}" stroke-width="3"/>
      ${burst}
      <path d="M0 660 L${W} 750 L${W} ${H} L0 ${H}Z" fill="${RED}" filter="url(#worn)"/><path d="M0 646 L${W} 736" stroke="${PAPER}" stroke-width="4"/>
      ${card({x:160,y:430,w:176,h:252,rot:-15,rank:'A',suit:'s',shadow:RED,shadowOffset:10})}
      ${card({x:292,y:470,w:176,h:252,rot:11,rank:'J',suit:'h',shadow:RED,shadowOffset:10})}
      ${stack(362,772,44,[PAPER,INK,PAPER,INK,PAPER,INK,PAPER],1.6,INK)}
      <g transform="rotate(-38 92 170)">${chip(92,170,30,RED)}</g><path d="M112 202l38 44M96 212l30 38M126 190l40 40" stroke="${PAPER}" stroke-width="3" stroke-linecap="round"/>
    </g>`);
}

const posters={holdem:holdem(),blackjack:blackjack()};
for(const [name,markup] of Object.entries(posters))writeFileSync(join(here,`${name}.svg`),markup);

const font=pathToFileURL(join(root,'public','fonts','Anton-Regular.ttf')).href;
const atlas=pathToFileURL(join(here,'atlas-base.png')).href;
const page=`<!doctype html><html><head><style>@font-face{font-family:Anton;src:url('${font}')}html,body{margin:0;width:1774px;height:887px;overflow:hidden;background:${INK}}img,svg{position:absolute;top:0}</style></head><body><img src="${atlas}" width="887" height="887" style="left:887px"><div style="position:absolute;left:0;top:0">${posters.holdem}</div><div style="position:absolute;left:443px;top:0">${posters.blackjack}</div></body></html>`;
const pagePath=join(here,'.compose.html');writeFileSync(pagePath,page);

const browser=await chromium.launch();
try{
  const tab=await browser.newPage({viewport:{width:1774,height:887}});
  await tab.goto(pathToFileURL(pagePath).href);
  await tab.evaluate(()=>document.fonts.ready);
  await tab.waitForTimeout(150);
  await tab.screenshot({path:join(root,'public','wild-hand-posters.png')});
}finally{await browser.close();unlinkSync(pagePath);}
console.log('Wrote public/wild-hand-posters.png');
