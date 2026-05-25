'use strict';
const https = require('https');
const fs    = require('fs');

const USERNAME = 'altrin7311';
const TOKEN    = process.env.GITHUB_TOKEN || '';
const W = 860, H = 480, CX = 490, CY = 268;
const TILT = -18 * Math.PI / 180;
const FLAT = 0.22; // very flat orbits

const LANG_MAP = {
  Python:'python',JavaScript:'js',TypeScript:'typescript',
  Rust:'rust',HTML:'html',CSS:'js',Go:'python',
  'C++':'rust',C:'rust',Java:'typescript',Shell:'js',
  Vue:'js',Svelte:'js',Ruby:'rust',PHP:'js',Kotlin:'typescript',
};
const COLORS = {
  python:    {hi:'#44aaff',fill:'#1a5fa8',glow:'#2277cc'},
  js:        {hi:'#ffdd55',fill:'#cc9900',glow:'#ffcc00'},
  typescript:{hi:'#55aaff',fill:'#1155aa',glow:'#3388ff'},
  rust:      {hi:'#ff7744',fill:'#aa3300',glow:'#ff5522'},
  html:      {hi:'#ff6666',fill:'#aa2222',glow:'#ff4444'},
  archived:  {hi:'#556677',fill:'#223344',glow:'#334455'},
};
const ORBITS = [
  {rx:82, ry:0},{rx:120,ry:0},{rx:158,ry:0},
  {rx:196,ry:0},{rx:234,ry:0},{rx:270,ry:0},{rx:304,ry:0}
];
// compute ry from flat ratio
ORBITS.forEach(o=>o.ry=Math.round(o.rx*FLAT));

const SPEEDS  = [10,14,19,25,32,41,56];
const PRADII  = [13,11,10,9,8,7,5];
const STARTS  = [0,1.3,2.9,0.6,4.1,1.9,4.7];

function get(url){
  return new Promise((res,rej)=>{
    const opts={headers:{'User-Agent':'galaxy-gen','Accept':'application/vnd.github.v3+json',
      ...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};
    https.get(url,opts,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}})}).on('error',rej);
  });
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function prng(seed){
  let s=seed|0;
  return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
function orbitPath(rx,ry,start=0,n=80){
  const cosT=Math.cos(TILT),sinT=Math.sin(TILT);
  return Array.from({length:n+1},(_,i)=>{
    const t=start+(i/n)*2*Math.PI;
    const ex=rx*Math.cos(t),ey=ry*Math.sin(t);
    return `${i===0?'M':'L'}${(CX+ex*cosT-ey*sinT).toFixed(2)},${(CY+ex*sinT+ey*cosT).toFixed(2)}`;
  }).join(' ')+' Z';
}

function defs(repos){
  let d='<defs>';
  // Scanline pattern
  d+=`<pattern id="scan" x="0" y="0" width="1" height="3" patternUnits="userSpaceOnUse">
    <rect width="1" height="1" fill="rgba(0,0,0,0.18)"/>
  </pattern>`;
  // Dot grid
  d+=`<pattern id="grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="0" cy="0" r="0.6" fill="rgba(0,180,100,0.12)"/>
    <circle cx="24" cy="0" r="0.6" fill="rgba(0,180,100,0.12)"/>
    <circle cx="0" cy="24" r="0.6" fill="rgba(0,180,100,0.12)"/>
    <circle cx="24" cy="24" r="0.6" fill="rgba(0,180,100,0.12)"/>
  </pattern>`;
  // Vignette
  d+=`<radialGradient id="vig" cx="50%" cy="50%" r="70%">
    <stop offset="0%" stop-color="transparent"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.75)"/>
  </radialGradient>`;
  // Sun
  d+=`<radialGradient id="sg" cx="38%" cy="30%" r="62%">
    <stop offset="0%" stop-color="#ffe9b0"/>
    <stop offset="50%" stop-color="#ffaa20"/>
    <stop offset="100%" stop-color="#110a00"/>
  </radialGradient>`;
  d+=`<radialGradient id="sgl">
    <stop offset="0%" stop-color="#ffcc44" stop-opacity="0.55"/>
    <stop offset="55%" stop-color="#ff8800" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#ff8800" stop-opacity="0"/>
  </radialGradient>`;
  // Nebula
  ['#1a0a3a','#0a1a3a','#0a0a2e'].forEach((c,i)=>
    d+=`<radialGradient id="nb${i}"><stop offset="0%" stop-color="${c}" stop-opacity="0.5"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
  // Comet
  d+=`<linearGradient id="cg" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="rgba(0,255,180,0.9)"/><stop offset="100%" stop-color="rgba(0,255,180,0)"/></linearGradient>`;
  // Planets
  repos.forEach((r,i)=>{
    const c=COLORS[r.lang]||COLORS.archived;
    d+=`<radialGradient id="pg${i}" cx="35%" cy="28%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="60%" stop-color="${c.fill}"/><stop offset="100%" stop-color="#04040e"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.glow}" stop-opacity="0.7"/><stop offset="100%" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>`;
  });
  // Filters
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  d+=`<filter id="fs" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>`;
  // Orbit paths
  ORBITS.forEach(({rx,ry},i)=>d+=`<path id="op${i}" d="${orbitPath(rx,ry,STARTS[i])}" fill="none"/>`);
  d+='</defs>';
  return d;
}

function bg(){
  return `<rect width="${W}" height="${H}" fill="#02020c"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<ellipse cx="${CX-100}" cy="${CY-60}" rx="260" ry="160" fill="url(#nb0)" opacity="0.9"/>
<ellipse cx="${CX+200}" cy="${CY+70}" rx="220" ry="140" fill="url(#nb1)" opacity="0.8"/>
<ellipse cx="${CX-30}" cy="${CY+80}" rx="180" ry="110" fill="url(#nb2)" opacity="0.7"/>`;
}

function stars(){
  const rng=prng(4321);
  let s='<g>';
  for(let i=0;i<220;i++){
    const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1);
    const r=rng()<0.08?1.6:rng()<0.3?1.0:0.5;
    const op=(0.25+rng()*0.7).toFixed(2);
    const dur=(1.2+rng()*4.5).toFixed(1),beg=(rng()*8).toFixed(1);
    // slight amber tint for retro feel
    const warm=rng()<0.3?'255,240,200':'255,255,255';
    s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="rgb(${warm})" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*0.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;
  }
  return s+'</g>';
}

function rings(){
  return ORBITS.map(({rx,ry},i)=>{
    const path=orbitPath(rx,ry);
    const op=i===0?0.18:0.08;
    return `<path d="${path}" fill="none" stroke="rgba(0,200,120,${op})" stroke-width="${i===0?1:0.7}" stroke-dasharray="${i%2===0?'':'4,6'}"/>`;
  }).join('');
}

function belt(){
  const rng=prng(777),cosT=Math.cos(TILT),sinT=Math.sin(TILT);
  let dots='';
  const bRx=100,bRy=Math.round(100*FLAT);
  for(let i=0;i<100;i++){
    const t=(i/100)*2*Math.PI,jx=(rng()-0.5)*8,jy=(rng()-0.5)*2;
    const ex=(bRx+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);
    const x=(CX+ex*cosT-ey*sinT).toFixed(2),y=(CY+ex*sinT+ey*cosT).toFixed(2);
    const op=(0.15+rng()*0.45).toFixed(2);
    dots+=`<circle cx="${x}" cy="${y}" r="${(0.5+rng()*0.8).toFixed(1)}" fill="#c8a040" opacity="${op}"/>`;
  }
  return `<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="120s" repeatCount="indefinite"/>${dots}</g>`;
}

function sun(){
  return `<circle cx="${CX}" cy="${CY}" r="68" fill="url(#sgl)" filter="url(#fb)"><animate attributeName="r" values="62;76;62" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="${CX}" cy="${CY}" r="21" fill="url(#sg)"><animate attributeName="r" values="20;22;20" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="${CX-6}" cy="${CY-6}" r="9" fill="rgba(255,255,220,0.13)"/>
<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="Courier New,monospace" font-size="10" font-weight="bold" fill="#030308">AT</text>
<text x="${CX}" y="${CY+38}" text-anchor="middle" font-family="Courier New,monospace" font-size="7" fill="rgba(255,200,100,0.5)" letter-spacing="4">ALTRIN</text>`;
}

function planets(repos){
  return repos.slice(0,7).map((r,i)=>{
    const pr=PRADII[i],dur=SPEEDS[i],name=esc(r.name.slice(0,13));
    let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
    s+=`<circle r="${pr*2.8}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.65"/>`;
    s+=`<circle r="${pr}" fill="url(#pg${i})"/>`;
    s+=`<circle r="${pr*0.48}" cx="${-pr*0.32}" cy="${-pr*0.32}" fill="rgba(255,255,255,0.13)"/>`;
    if((r.moons||0)>0){
      const mo=pr+8,mr=Math.max(2,pr*0.2);
      s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*0.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${mo}" cy="0" r="${mr}" fill="#8899bb" opacity="0.7"/></g>`;
    }
    // Retro uppercase label
    s+=`<text y="${pr+12}" text-anchor="middle" font-family="Courier New,monospace" font-size="7.5" letter-spacing="0.5" fill="rgba(0,255,140,0.7)">${name}</text>`;
    return s+'</g>';
  }).join('');
}

function ufo(){
  return `<g><animateMotion dur="24s" repeatCount="indefinite" rotate="0" path="M -44,58 L ${W+44},58"/>
<ellipse rx="19" ry="6" fill="#cc44ff" opacity="0.92"/>
<ellipse ry="6" rx="9" cy="-5" fill="rgba(210,170,255,0.88)"/>
<circle cx="-7" cy="0" r="2.5"><animate attributeName="fill" values="#ff0;#f0f;#0ff;#ff0" dur="0.6s" repeatCount="indefinite"/></circle>
<circle cx="0"  cy="0" r="2.5"><animate attributeName="fill" values="#f0f;#0ff;#ff0;#f0f" dur="0.6s" repeatCount="indefinite"/></circle>
<circle cx="7"  cy="0" r="2.5"><animate attributeName="fill" values="#0ff;#ff0;#f0f;#0ff" dur="0.6s" repeatCount="indefinite"/></circle>
<polygon points="-11,6 11,6 18,26 -18,26" fill="rgba(180,80,255,0.1)"/>
<text y="-14" text-anchor="middle" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(200,140,255,0.85)">OPEN ISSUE</text>
</g>`;
}

function comets(){
  const mk=(beg,sy,ey)=>`<g opacity="0">
<animateMotion dur="2.5s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M -40,${sy} L ${W*0.82},${ey}"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.92;1" dur="2.5s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="2.5" fill="rgba(0,255,180,0.95)"/>
<rect x="-52" y="-1" width="52" height="2" fill="url(#cg)" rx="1"/>
<text x="6" y="-5" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(0,255,180,0.8)">COMMIT</text>
</g>`;
  return mk(2,108,330)+mk(10,155,385);
}

function shoots(){
  const mk=(beg,x1,y1,x2,y2)=>`<g opacity="0">
<animateMotion dur="1.1s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M ${x1},${y1} L ${x2},${y2}"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.84;1" dur="1.1s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="2.5" fill="rgba(255,255,80,0.95)"/>
<rect x="-42" y="-1" width="42" height="1.5" fill="rgba(255,255,80,0.55)" rx="0.5"/>
<text x="5" y="-5" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(255,240,80,0.85)">PR MERGED</text>
</g>`;
  return mk(4,160,22,560,195)+mk(15,330,16,730,230);
}

function blackhole(){
  const bx=W-75,by=H-70;
  return `<ellipse cx="${bx}" cy="${by}" rx="42" ry="14" fill="none" stroke="rgba(140,0,220,0.4)" stroke-width="2.5" stroke-dasharray="8,4"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="360 ${bx} ${by}" dur="5s" repeatCount="indefinite"/></ellipse>
<ellipse cx="${bx}" cy="${by}" rx="32" ry="10" fill="none" stroke="rgba(180,50,255,0.5)" stroke-width="2"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="-360 ${bx} ${by}" dur="3.5s" repeatCount="indefinite"/></ellipse>
<ellipse cx="${bx}" cy="${by}" rx="22" ry="7" fill="none" stroke="rgba(210,100,255,0.6)" stroke-width="1.5"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="360 ${bx} ${by}" dur="2.2s" repeatCount="indefinite"/></ellipse>
<circle cx="${bx}" cy="${by}" r="14" fill="#000"/>
<circle cx="${bx}" cy="${by}" r="14" fill="none" stroke="rgba(180,80,255,0.75)" stroke-width="1"/>
<text x="${bx}" y="${by+27}" text-anchor="middle" font-family="Courier New,monospace" font-size="7" letter-spacing="2" fill="rgba(160,70,220,0.75)">ARCHIVED</text>`;
}

function hud(stats){
  const x=14,y=14,w=192,h=216;
  // Two sections: all-time + last 30 days
  const rows1=[
    ['REPOS',   stats.repos],
    ['STARS',   stats.stars],
    ['LANGUAGES',stats.langs],
    ['ACTIVE SINCE',stats.since],
  ];
  const rows2=[
    ['COMMITS',     stats.commits],
    ['PRS MERGED',  stats.prs],
    ['OPEN ISSUES', stats.issues],
  ];

  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="rgba(0,12,2,0.92)" stroke="rgba(0,255,80,0.28)" stroke-width="0.8"/>`;
  // header
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="22" rx="2" fill="rgba(0,255,80,0.08)"/>`;
  // corner brackets - retro style
  const corners=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]];
  corners.forEach(([px,py])=>{
    const sx=px===x?1:-1,sy=py===y?1:-1;
    s+=`<line x1="${px}" y1="${py+sy*12}" x2="${px}" y2="${py}" stroke="#00ff44" stroke-width="2"/>`;
    s+=`<line x1="${px}" y1="${py}" x2="${px+sx*12}" y2="${py}" stroke="#00ff44" stroke-width="2"/>`;
  });
  s+=`<text x="${x+11}" y="${y+15}" font-family="Courier New,monospace" font-size="8" letter-spacing="0.5" fill="rgba(0,255,68,0.92)">[ ATLAS · /usr/altrin ]</text>`;
  s+=`<circle cx="${x+w-13}" cy="${y+11}" r="4" fill="#00ff44"><animate attributeName="opacity" values="1;0.15;1" dur="1.6s" repeatCount="indefinite"/></circle>`;
  s+=`<line x1="${x+6}" y1="${y+24}" x2="${x+w-6}" y2="${y+24}" stroke="rgba(0,255,70,0.18)" stroke-width="0.8" stroke-dasharray="4,5"/>`;

  // All-time rows
  rows1.forEach(([label,val],i)=>{
    const ry=y+37+i*17;
    if(i%2===0) s+=`<rect x="${x+1}" y="${ry-11}" width="${w-2}" height="16" fill="rgba(0,255,80,0.025)"/>`;
    s+=`<text x="${x+10}" y="${ry}" font-family="Courier New,monospace" font-size="7.5" fill="rgba(0,200,70,0.7)">${esc(label)}</text>`;
    s+=`<text x="${x+w-10}" y="${ry}" text-anchor="end" font-family="Courier New,monospace" font-size="7.5" font-weight="bold" fill="rgba(0,255,80,0.95)">${esc(String(val))}</text>`;
  });

  // Divider with label
  const dy=y+37+rows1.length*17+4;
  s+=`<line x1="${x+6}" y1="${dy}" x2="${x+w-6}" y2="${dy}" stroke="rgba(0,255,70,0.18)" stroke-width="0.8" stroke-dasharray="4,5"/>`;
  s+=`<text x="${x+w/2}" y="${dy+11}" text-anchor="middle" font-family="Courier New,monospace" font-size="6.5" letter-spacing="2" fill="rgba(0,200,60,0.5)">── LAST 30 DAYS ──</text>`;

  // Last 30 days rows
  rows2.forEach(([label,val],i)=>{
    const ry=dy+23+i*17;
    if(i%2===0) s+=`<rect x="${x+1}" y="${ry-11}" width="${w-2}" height="16" fill="rgba(0,255,80,0.025)"/>`;
    s+=`<text x="${x+10}" y="${ry}" font-family="Courier New,monospace" font-size="7.5" fill="rgba(0,200,70,0.7)">${esc(label)}</text>`;
    s+=`<text x="${x+w-10}" y="${ry}" text-anchor="end" font-family="Courier New,monospace" font-size="7.5" font-weight="bold" fill="rgba(0,255,80,0.95)">${esc(String(val))}</text>`;
  });

  // Sync line + caret
  s+=`<line x1="${x+6}" y1="${y+h-23}" x2="${x+w-6}" y2="${y+h-23}" stroke="rgba(0,255,70,0.18)" stroke-width="0.8" stroke-dasharray="4,5"/>`;
  s+=`<text x="${x+10}" y="${y+h-10}" font-family="Courier New,monospace" font-size="6.5" fill="rgba(0,180,55,0.5)">› SYNC · DAILY</text>`;
  s+=`<rect x="${x+w-20}" y="${y+h-18}" width="6" height="9" rx="1" fill="#00ff44"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></rect>`;
  return s;
}

function legend(){
  const x=W-148,y=H-112,w=136,h=100;
  const items=[['#44aaff','PYTHON'],['#ffdd55','JS'],['#55aaff','TYPESCRIPT'],['#ff7744','RUST'],['#445566','ARCHIVED']];
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="rgba(2,5,18,0.92)" stroke="rgba(0,180,255,0.2)" stroke-width="0.8"/>`;
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="18" rx="2" fill="rgba(0,180,255,0.07)"/>`;
  s+=`<text x="${x+12}" y="${y+13}" font-family="Courier New,monospace" font-size="7" letter-spacing="2" fill="rgba(100,200,255,0.88)">LANG · COLOR MAP</text>`;
  s+=`<line x1="${x+6}" y1="${y+19}" x2="${x+w-6}" y2="${y+19}" stroke="rgba(0,180,255,0.15)" stroke-width="0.5"/>`;
  items.forEach(([col,lab],i)=>{
    const iy=y+27+i*15;
    s+=`<rect x="${x+10}" y="${iy}" width="9" height="9" rx="1" fill="${col}" opacity="0.85"/>`;
    s+=`<text x="${x+24}" y="${iy+7}" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(160,210,255,0.82)">${lab}</text>`;
  });
  return s;
}

function retro(){
  // Scanlines overlay
  let s=`<rect width="${W}" height="${H}" fill="url(#scan)" pointer-events="none"/>`;
  // Vignette
  s+=`<rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>`;
  // Corner crosshairs
  const corners=[[20,20],[W-20,20],[20,H-20],[W-20,H-20]];
  corners.forEach(([cx,cy])=>{
    s+=`<line x1="${cx-8}" y1="${cy}" x2="${cx+8}" y2="${cy}" stroke="rgba(0,255,80,0.25)" stroke-width="0.8"/>`;
    s+=`<line x1="${cx}" y1="${cy-8}" x2="${cx}" y2="${cy+8}" stroke="rgba(0,255,80,0.25)" stroke-width="0.8"/>`;
    s+=`<circle cx="${cx}" cy="${cy}" r="1.5" fill="rgba(0,255,80,0.3)"/>`;
  });
  // Bottom status bar
  s+=`<rect x="0" y="${H-18}" width="${W}" height="18" fill="rgba(0,20,5,0.7)"/>`;
  s+=`<line x1="0" y1="${H-18}" x2="${W}" y2="${H-18}" stroke="rgba(0,255,80,0.15)" stroke-width="0.5"/>`;
  s+=`<text x="12" y="${H-6}" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(0,200,60,0.55)">SYS:ONLINE</text>`;
  s+=`<text x="${W/2}" y="${H-6}" text-anchor="middle" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(0,200,60,0.4)">ALTRIN7311 · GITHUB GALAXY</text>`;
  s+=`<text x="${W-12}" y="${H-6}" text-anchor="end" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(0,200,60,0.55)">v1.0</text>`;
  return s;
}

function title(){
  const mid=W/2+20;
  return `<text x="${mid}" y="20" text-anchor="middle" font-family="Courier New,monospace" font-size="12" font-weight="bold" fill="rgba(0,220,255,0.88)" letter-spacing="6">ALTRIN'S GALAXY  v1.0</text>
<line x1="${mid-130}" y1="24" x2="${mid+130}" y2="24" stroke="rgba(0,200,255,0.15)" stroke-width="0.5"/>
<text x="${mid-12}" y="35" text-anchor="middle" font-family="Courier New,monospace" font-size="7" fill="rgba(80,160,220,0.45)" letter-spacing="2">AUTO-UPDATES DAILY ·</text>
<text x="${mid+77}" y="35" text-anchor="middle" font-family="Courier New,monospace" font-size="7" fill="rgba(0,255,100,0.78)" letter-spacing="2">LIVE GITHUB DATA</text>`;
}

async function main(){
  console.log('🌌 Fetching GitHub data...');
  const user   = await get(`https://api.github.com/users/${USERNAME}`);
  const repos  = await get(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed`);
  const events = await get(`https://api.github.com/users/${USERNAME}/events?per_page=100`).catch(()=>[]);

  const thirtyDays = Date.now() - 30*24*60*60*1000;
  const recentEvents = Array.isArray(events) ? events.filter(e=>new Date(e.created_at).getTime()>thirtyDays) : [];
  
  const commits = recentEvents.filter(e=>e.type==='PushEvent').reduce((s,e)=>s+(e.payload.commits?.length||0),0);
  const prs     = recentEvents.filter(e=>e.type==='PullRequestEvent'&&e.payload.action==='closed'&&e.payload.pull_request?.merged).length;
  const totalStars  = repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalIssues = repos.reduce((s,r)=>s+r.open_issues_count,0);
  const langs       = [...new Set(repos.map(r=>r.language).filter(Boolean))];

  const active = repos.filter(r=>!r.fork&&!r.archived)
    .sort((a,b)=>(b.stargazers_count*3+b.size)-(a.stargazers_count*3+a.size)).slice(0,6);
  const arch = repos.filter(r=>r.archived).slice(0,1);
  let planetRepos=[...active,...arch].slice(0,7).map(r=>({
    name:r.name,lang:r.archived?'archived':(LANG_MAP[r.language]||'python'),moons:Math.min(r.forks_count,2)
  }));
  while(planetRepos.length<7) planetRepos.push({name:'...',lang:'archived',moons:0});

  const stats={
    repos:user.public_repos, stars:totalStars, langs:langs.length,
    since:new Date(user.created_at).getFullYear(),
    commits, prs, issues:totalIssues
  };

  console.log('Stats:', JSON.stringify(stats));
  console.log('Planets:', planetRepos.map(r=>r.name).join(', '));

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs(planetRepos)}
${bg()}
${stars()}
${rings()}
${belt()}
${comets()}
${shoots()}
${planets(planetRepos)}
${sun()}
${ufo()}
${blackhole()}
${hud(stats)}
${legend()}
${title()}
${retro()}
</svg>`;

  fs.writeFileSync('galaxy.svg',svg,'utf8');
  console.log('✅ galaxy.svg written!');
}
main().catch(e=>{console.error('❌',e.message);process.exit(1);});
