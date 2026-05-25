'use strict';
const https = require('https');
const fs    = require('fs');

const USERNAME = 'altrin7311';
const TOKEN    = process.env.GITHUB_TOKEN || '';
const W = 860, H = 480, CX = 490, CY = 262;
const TILT = -18 * Math.PI / 180;
const FLAT = 0.22;

const LANG_MAP = {
  Python:'python',JavaScript:'js',TypeScript:'typescript',
  Rust:'rust',HTML:'html',CSS:'js',Go:'python',
  'C++':'rust',C:'rust',Java:'typescript',Shell:'js',
  Vue:'js',Svelte:'js',Ruby:'rust',PHP:'js',Kotlin:'typescript',
};
const COLORS = {
  python:    {hi:'#00e5ff',fill:'#0077cc',glow:'#00bbff'},
  js:        {hi:'#ffd700',fill:'#cc8800',glow:'#ffcc00'},
  typescript:{hi:'#22aaff',fill:'#0055cc',glow:'#0099ff'},
  rust:      {hi:'#ff7722',fill:'#cc3300',glow:'#ff5500'},
  html:      {hi:'#ff0088',fill:'#aa0044',glow:'#ff0066'},
  archived:  {hi:'#445566',fill:'#1a2233',glow:'#334455'},
};
const ORBITS=[
  {rx:82,ry:0},{rx:122,ry:0},{rx:162,ry:0},
  {rx:200,ry:0},{rx:238,ry:0},{rx:274,ry:0},{rx:308,ry:0}
];
ORBITS.forEach(o=>o.ry=Math.round(o.rx*FLAT));
const SPEEDS=[10,15,21,28,36,46,60];
const PRADII=[13,11,10,9,8,7,5];
const STARTS=[0,1.3,2.9,0.6,4.1,1.9,4.7];

function get(url){
  return new Promise((res,rej)=>{
    const opts={headers:{'User-Agent':'galaxy-gen/2','Accept':'application/vnd.github.v3+json',
      ...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};
    https.get(url,opts,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}})}).on('error',rej);
  });
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function prng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function orbitPt(rx,ry,t){
  const cosT=Math.cos(TILT),sinT=Math.sin(TILT);
  const ex=rx*Math.cos(t),ey=ry*Math.sin(t);
  return {x:CX+ex*cosT-ey*sinT, y:CY+ex*sinT+ey*cosT};
}
function orbitPath(rx,ry,start=0,n=80){
  return Array.from({length:n+1},(_,i)=>{
    const t=start+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t);
    return `${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ')+' Z';
}

function defs(repos,commitMsgs){
  let d='<defs>';
  // Scanlines
  d+=`<pattern id="scan" x="0" y="0" width="1" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="rgba(0,0,0,0.15)"/></pattern>`;
  // Tactical grid
  d+=`<pattern id="grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
    <line x1="30" y1="0" x2="30" y2="30" stroke="rgba(0,255,80,0.04)" stroke-width="0.5"/>
    <line x1="0" y1="30" x2="30" y2="30" stroke="rgba(0,255,80,0.04)" stroke-width="0.5"/>
  </pattern>`;
  // Vignette
  d+=`<radialGradient id="vig" cx="50%" cy="50%" r="68%"><stop offset="0%" stop-color="transparent"/><stop offset="100%" stop-color="rgba(0,0,0,0.8)"/></radialGradient>`;
  // Sun
  d+=`<radialGradient id="sg" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#fff0c0"/><stop offset="50%" stop-color="#ffaa20"/><stop offset="100%" stop-color="#110800"/></radialGradient>`;
  d+=`<radialGradient id="sgl"><stop offset="0%" stop-color="#ffcc44" stop-opacity="0.6"/><stop offset="55%" stop-color="#ff8800" stop-opacity="0.1"/><stop offset="100%" stop-color="#ff8800" stop-opacity="0"/></radialGradient>`;
  // Nebula
  ['#120626','#060e26','#060618'].forEach((c,i)=>
    d+=`<radialGradient id="nb${i}"><stop offset="0%" stop-color="${c}" stop-opacity="0.7"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
  // Comet gradient
  d+=`<linearGradient id="cg" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="rgba(0,255,200,0.95)"/><stop offset="100%" stop-color="rgba(0,255,200,0)"/></linearGradient>`;
  d+=`<linearGradient id="cg2" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="rgba(255,220,0,0.95)"/><stop offset="100%" stop-color="rgba(255,220,0,0)"/></linearGradient>`;
  // Planets
  repos.forEach((r,i)=>{
    const c=COLORS[r.lang]||COLORS.archived;
    d+=`<radialGradient id="pg${i}" cx="32%" cy="26%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="55%" stop-color="${c.fill}"/><stop offset="100%" stop-color="#020210"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.glow}" stop-opacity="0.75"/><stop offset="100%" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>`;
  });
  // Filters
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>`;
  // Phosphor text glow
  d+=`<filter id="glow" x="-30%" y="-60%" width="160%" height="220%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;
  d+=`<filter id="glowS" x="-20%" y="-50%" width="140%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;
  // Ring glow
  d+=`<filter id="ringGlow" x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="1.5"/></filter>`;
  // Orbit paths
  ORBITS.forEach(({rx,ry},i)=>d+=`<path id="op${i}" d="${orbitPath(rx,ry,STARTS[i])}" fill="none"/>`);
  d+='</defs>';
  return d;
}

function bg(){
  return `<rect width="${W}" height="${H}" fill="#010108"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<ellipse cx="${CX-110}" cy="${CY-65}" rx="270" ry="170" fill="url(#nb0)" opacity="1"/>
<ellipse cx="${CX+200}" cy="${CY+75}" rx="230" ry="150" fill="url(#nb1)" opacity="0.9"/>
<ellipse cx="${CX-40}" cy="${CY+85}" rx="190" ry="120" fill="url(#nb2)" opacity="0.8"/>`;
}

function stars(){
  const rng=prng(9999);
  let s='';
  // Layer 1: tiny dim (180)
  for(let i=0;i<180;i++){
    const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1);
    const op=(0.15+rng()*0.35).toFixed(2);
    const dur=(2+rng()*5).toFixed(1),beg=(rng()*9).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="0.5" fill="white" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*0.1).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;
  }
  // Layer 2: medium (70)
  for(let i=0;i<70;i++){
    const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1);
    const op=(0.4+rng()*0.45).toFixed(2);
    const dur=(1.5+rng()*4).toFixed(1),beg=(rng()*7).toFixed(1);
    const warm=rng()<0.25?'255,240,180':'255,255,255';
    s+=`<circle cx="${x}" cy="${y}" r="1" fill="rgb(${warm})" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*0.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;
  }
  // Layer 3: bright accent (20)
  for(let i=0;i<20;i++){
    const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1);
    const op=(0.6+rng()*0.35).toFixed(2);
    const dur=(1+rng()*2.5).toFixed(1),beg=(rng()*5).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${(1.2+rng()*0.8).toFixed(1)}" fill="white" opacity="${op}"><animate attributeName="opacity" values="${op};0.05;${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;
  }
  return `<g>${s}</g>`;
}

function rings(){
  return ORBITS.map(({rx,ry},i)=>{
    const path=orbitPath(rx,ry);
    const base=i===0?0.22:0.12;
    const dur=40+i*12;
    const offset=i*0.15;
    return `<!-- orbit ring glow --><path d="${path}" fill="none" stroke="rgba(255,255,255,${(base*0.4).toFixed(2)})" stroke-width="1" filter="url(#ringGlow)"/>
<path d="${path}" fill="none" stroke="rgba(255,255,255,${base.toFixed(2)})" stroke-width="0.7" stroke-dasharray="${i%3===0?'':'5,8'}">
  <animate attributeName="stroke-opacity" values="${base};${(base*1.8).toFixed(2)};${base}" dur="${dur}s" begin="${offset}s" repeatCount="indefinite"/>
</path>`;
  }).join('');
}

function belt(){
  const rng=prng(555),cosT=Math.cos(TILT),sinT=Math.sin(TILT);
  let dots='';
  for(let i=0;i<110;i++){
    const t=(i/110)*2*Math.PI,jx=(rng()-0.5)*9,jy=(rng()-0.5)*2.5;
    const bRx=102,bRy=Math.round(102*FLAT);
    const ex=(bRx+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);
    const x=(CX+ex*cosT-ey*sinT).toFixed(2),y=(CY+ex*sinT+ey*cosT).toFixed(2);
    dots+=`<circle cx="${x}" cy="${y}" r="${(0.5+rng()*0.9).toFixed(1)}" fill="#c8a040" opacity="${(0.2+rng()*0.5).toFixed(2)}"/>`;
  }
  return `<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="130s" repeatCount="indefinite"/>${dots}</g>`;
}

function sun(){
  return `<circle cx="${CX}" cy="${CY}" r="70" fill="url(#sgl)" filter="url(#fb)"><animate attributeName="r" values="65;80;65" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="${CX}" cy="${CY}" r="21" fill="url(#sg)"><animate attributeName="r" values="20;22.5;20" dur="3.8s" repeatCount="indefinite"/></circle>
<circle cx="${CX-6}" cy="${CY-6}" r="9" fill="rgba(255,255,230,0.13)"/>
<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="Courier New,monospace" font-size="10" font-weight="bold" fill="#020210">AT</text>
<text x="${CX}" y="${CY+38}" text-anchor="middle" font-family="Courier New,monospace" font-size="7" fill="rgba(255,200,100,0.45)" letter-spacing="4">ALTRIN</text>`;
}

function planets(repos){
  return repos.slice(0,7).map((r,i)=>{
    const pr=PRADII[i],dur=SPEEDS[i],name=esc(r.name.slice(0,13));
    let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
    s+=`<circle r="${pr*3}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.65"/>`;
    s+=`<circle r="${pr}" fill="url(#pg${i})">`;
    s+=`<animate attributeName="r" values="${pr};${pr*1.08};${pr}" dur="${4+i*0.7}s" repeatCount="indefinite"/>`;
    s+=`</circle>`;
    s+=`<circle r="${pr*0.48}" cx="${-pr*0.3}" cy="${-pr*0.3}" fill="rgba(255,255,255,0.14)"/>`;
    if((r.moons||0)>0){
      const mo=pr+8,mr=Math.max(2,pr*0.2);
      s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*0.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${mo}" cy="0" r="${mr}" fill="#88aacc" opacity="0.7"/></g>`;
    }
    s+=`<text y="${pr+13}" text-anchor="middle" font-family="Courier New,monospace" font-size="7.5" letter-spacing="0.5" fill="rgba(0,255,160,0.75)" filter="url(#glowS)">${name}</text>`;
    return s+'</g>';
  }).join('');
}

function ufo(){
  return `<g><animateMotion dur="28s" repeatCount="indefinite" rotate="0" path="M -44,55 L ${W+44},55"/>
<ellipse rx="20" ry="6" fill="#cc00ff" opacity="0.9"/>
<ellipse ry="6" rx="9" cy="-5" fill="rgba(220,160,255,0.88)"/>
<circle cx="-7" cy="0" r="2.5"><animate attributeName="fill" values="#ff0;#f0f;#0ff;#ff0" dur="0.5s" repeatCount="indefinite"/></circle>
<circle cx="0"  cy="0" r="2.5"><animate attributeName="fill" values="#f0f;#0ff;#ff0;#f0f" dur="0.5s" repeatCount="indefinite"/></circle>
<circle cx="7"  cy="0" r="2.5"><animate attributeName="fill" values="#0ff;#ff0;#f0f;#0ff" dur="0.5s" repeatCount="indefinite"/></circle>
<polygon points="-11,6 11,6 18,28 -18,28" fill="rgba(180,0,255,0.1)"/>
<text y="-14" text-anchor="middle" font-family="Courier New,monospace" font-size="7" letter-spacing="1.5" fill="rgba(220,100,255,0.9)" filter="url(#glowS)">OPEN ISSUE</text>
</g>`;
}

function buildComets(repos, commitData){
  let s='';
  // Use real commit messages if available, else generic
  const entries = commitData.length > 0 ? commitData : [
    {repoIdx:0, msg:'update'},{repoIdx:1, msg:'fix bug'},
    {repoIdx:2, msg:'refactor'},{repoIdx:3, msg:'add feature'},
  ];

  entries.slice(0,6).forEach((entry,ci)=>{
    const ri = entry.repoIdx % 7;
    const {rx,ry} = ORBITS[ri];
    // Target: a point on this orbit ring
    const impactAngle = STARTS[ri] + (ci * 0.8);
    const tp = orbitPt(rx, ry, impactAngle);
    // Start from off-screen upper-left area
    const sx = Math.max(10, tp.x - 160 - ci*15);
    const sy = Math.max(10, tp.y - 55  - ci*8);
    const dur = 7 + ci * 1.2; // slow: 7-14s
    const beg = ci * 3.5;
    const msg = esc(entry.msg.slice(0, 22));
    const isEven = ci%2===0;
    const grad = isEven?'cg':'cg2';
    const col = isEven?'rgba(0,255,200,0.9)':'rgba(255,220,0,0.9)';
    const colDim = isEven?'rgba(0,255,200,0.75)':'rgba(255,220,0,0.75)';
    s+=`<g opacity="0">
<animateMotion dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite" rotate="auto" path="M ${sx.toFixed(1)},${sy.toFixed(1)} L ${tp.x.toFixed(1)},${tp.y.toFixed(1)}"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.88;1" dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite"/>
<circle r="3" fill="${col}"/>
<rect x="-58" y="-1.5" width="58" height="3" fill="url(#${grad})" rx="1.5"/>
<text x="5" y="-6" font-family="Courier New,monospace" font-size="6.5" letter-spacing="0.5" fill="${colDim}" filter="url(#glowS)">${msg}</text>
</g>`;
  });
  return s;
}

function blackhole(){
  const bx=W-74,by=H-68;
  return `<ellipse cx="${bx}" cy="${by}" rx="42" ry="14" fill="none" stroke="rgba(140,0,220,0.45)" stroke-width="2.5" stroke-dasharray="8,4"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="360 ${bx} ${by}" dur="5s" repeatCount="indefinite"/></ellipse>
<ellipse cx="${bx}" cy="${by}" rx="32" ry="10" fill="none" stroke="rgba(200,0,255,0.55)" stroke-width="2"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="-360 ${bx} ${by}" dur="3.5s" repeatCount="indefinite"/></ellipse>
<ellipse cx="${bx}" cy="${by}" rx="22" ry="7" fill="none" stroke="rgba(220,100,255,0.65)" stroke-width="1.5"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="360 ${bx} ${by}" dur="2.2s" repeatCount="indefinite"/></ellipse>
<circle cx="${bx}" cy="${by}" r="14" fill="#000"/>
<circle cx="${bx}" cy="${by}" r="14" fill="none" stroke="rgba(200,80,255,0.8)" stroke-width="1.2"/>
<text x="${bx}" y="${by+27}" text-anchor="middle" font-family="Courier New,monospace" font-size="7" letter-spacing="2" fill="rgba(180,60,255,0.8)" filter="url(#glowS)">ARCHIVED</text>`;
}

function hud(stats){
  const x=14,y=14,w=192,h=218;
  const rows1=[['REPOS',stats.repos],['STARS',stats.stars],['LANGUAGES',stats.langs],['ACTIVE SINCE',stats.since]];
  const rows2=[['COMMITS',stats.commits],['PRS MERGED',stats.prs],['OPEN ISSUES',stats.issues]];
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="rgba(0,8,1,0.94)" stroke="rgba(0,255,80,0.22)" stroke-width="0.8"/>`;
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="22" rx="2" fill="rgba(0,255,80,0.07)"/>`;
  // Corner brackets with glow
  [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([px,py])=>{
    const sx=px===x?1:-1,sy=py===y?1:-1;
    s+=`<line x1="${px}" y1="${py+sy*12}" x2="${px}" y2="${py}" stroke="#00ff44" stroke-width="2" filter="url(#glowS)"/>`;
    s+=`<line x1="${px}" y1="${py}" x2="${px+sx*12}" y2="${py}" stroke="#00ff44" stroke-width="2" filter="url(#glowS)"/>`;
  });
  s+=`<text x="${x+11}" y="${y+15}" font-family="Courier New,monospace" font-size="8" letter-spacing="0.8" fill="rgba(0,255,68,0.95)" filter="url(#glow)">[ ATLAS · /usr/altrin ]</text>`;
  // Blinking cursor
  s+=`<text x="${x+w-22}" y="${y+15}" font-family="Courier New,monospace" font-size="9" fill="#00ff44" filter="url(#glow)">█<animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></text>`;
  s+=`<line x1="${x+6}" y1="${y+24}" x2="${x+w-6}" y2="${y+24}" stroke="rgba(0,255,70,0.15)" stroke-width="0.8" stroke-dasharray="4,5"/>`;

  rows1.forEach(([label,val],i)=>{
    const ry=y+37+i*17;
    if(i%2===0) s+=`<rect x="${x+1}" y="${ry-12}" width="${w-2}" height="16" fill="rgba(0,255,80,0.03)"/>`;
    s+=`<text x="${x+10}" y="${ry}" font-family="Courier New,monospace" font-size="7.5" fill="rgba(0,200,70,0.7)">${esc(label)}</text>`;
    s+=`<text x="${x+w-10}" y="${ry}" text-anchor="end" font-family="Courier New,monospace" font-size="7.5" font-weight="bold" fill="rgba(0,255,80,0.95)" filter="url(#glowS)">${esc(String(val))}</text>`;
  });

  const dy=y+37+rows1.length*17+5;
  s+=`<line x1="${x+6}" y1="${dy}" x2="${x+w-6}" y2="${dy}" stroke="rgba(0,255,70,0.15)" stroke-width="0.8" stroke-dasharray="4,5"/>`;
  s+=`<text x="${x+w/2}" y="${dy+11}" text-anchor="middle" font-family="Courier New,monospace" font-size="6.5" letter-spacing="2" fill="rgba(0,220,60,0.55)" filter="url(#glowS)">── LAST 30 DAYS ──</text>`;

  rows2.forEach(([label,val],i)=>{
    const ry=dy+24+i*17;
    if(i%2===0) s+=`<rect x="${x+1}" y="${ry-12}" width="${w-2}" height="16" fill="rgba(0,255,80,0.03)"/>`;
    s+=`<text x="${x+10}" y="${ry}" font-family="Courier New,monospace" font-size="7.5" fill="rgba(0,200,70,0.7)">${esc(label)}</text>`;
    s+=`<text x="${x+w-10}" y="${ry}" text-anchor="end" font-family="Courier New,monospace" font-size="7.5" font-weight="bold" fill="rgba(0,255,80,0.95)" filter="url(#glowS)">${esc(String(val))}</text>`;
  });

  s+=`<line x1="${x+6}" y1="${y+h-24}" x2="${x+w-6}" y2="${y+h-24}" stroke="rgba(0,255,70,0.15)" stroke-width="0.8" stroke-dasharray="4,5"/>`;
  s+=`<text x="${x+10}" y="${y+h-11}" font-family="Courier New,monospace" font-size="6.5" fill="rgba(0,180,55,0.55)">› SYNC · DAILY</text>`;
  s+=`<rect x="${x+w-20}" y="${y+h-19}" width="6" height="9" rx="1" fill="#00ff44" filter="url(#glowS)"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></rect>`;
  return s;
}

function legend(){
  const x=W-150,y=H-114,w=138,h=102;
  // Neon colors matching COLORS object
  const items=[
    ['#00e5ff','PYTHON'],['#ffd700','JS'],
    ['#22aaff','TYPESCRIPT'],['#ff7722','RUST'],['#445566','ARCHIVED']
  ];
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="rgba(1,3,14,0.94)" stroke="rgba(0,180,255,0.2)" stroke-width="0.8"/>`;
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="18" rx="2" fill="rgba(0,180,255,0.07)"/>`;
  s+=`<text x="${x+12}" y="${y+13}" font-family="Courier New,monospace" font-size="7" letter-spacing="2" fill="rgba(80,200,255,0.9)" filter="url(#glowS)">LANG · COLOR MAP</text>`;
  s+=`<line x1="${x+6}" y1="${y+19}" x2="${x+w-6}" y2="${y+19}" stroke="rgba(0,180,255,0.12)" stroke-width="0.5"/>`;
  items.forEach(([col,lab],i)=>{
    const iy=y+27+i*15;
    s+=`<rect x="${x+10}" y="${iy}" width="9" height="9" rx="2" fill="${col}" opacity="0.9"/>`;
    s+=`<circle cx="${x+14.5}" cy="${iy+4.5}" r="3" fill="${col}" opacity="0.4" filter="url(#fg)"/>`;
    s+=`<text x="${x+25}" y="${iy+7.5}" font-family="Courier New,monospace" font-size="7.5" letter-spacing="1" fill="rgba(180,220,255,0.85)">${lab}</text>`;
  });
  return s;
}

function overlay(){
  let s=`<rect width="${W}" height="${H}" fill="url(#scan)" pointer-events="none"/>`;
  s+=`<rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>`;
  // Corner crosshairs
  [[20,20],[W-20,20],[20,H-20],[W-20,H-20]].forEach(([cx,cy])=>{
    s+=`<line x1="${cx-9}" y1="${cy}" x2="${cx+9}" y2="${cy}" stroke="rgba(0,255,80,0.3)" stroke-width="0.8" filter="url(#glowS)"/>`;
    s+=`<line x1="${cx}" y1="${cy-9}" x2="${cx}" y2="${cy+9}" stroke="rgba(0,255,80,0.3)" stroke-width="0.8" filter="url(#glowS)"/>`;
    s+=`<circle cx="${cx}" cy="${cy}" r="1.8" fill="rgba(0,255,80,0.35)"/>`;
  });
  // Status bar
  s+=`<rect x="0" y="${H-17}" width="${W}" height="17" fill="rgba(0,12,2,0.75)"/>`;
  s+=`<line x1="0" y1="${H-17}" x2="${W}" y2="${H-17}" stroke="rgba(0,255,80,0.12)" stroke-width="0.5"/>`;
  s+=`<text x="12" y="${H-5}" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(0,220,60,0.6)" filter="url(#glowS)">SYS:ONLINE</text>`;
  s+=`<text x="${W/2}" y="${H-5}" text-anchor="middle" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(0,200,60,0.45)">ALTRIN7311 · GITHUB GALAXY</text>`;
  s+=`<text x="${W-12}" y="${H-5}" text-anchor="end" font-family="Courier New,monospace" font-size="7" letter-spacing="1" fill="rgba(0,200,60,0.6)" filter="url(#glowS)">AUTO-SYNC</text>`;
  return s;
}

function title(){
  const mid=W/2+20;
  return `<text x="${mid}" y="20" text-anchor="middle" font-family="Courier New,monospace" font-size="13" font-weight="bold" fill="rgba(0,220,255,0.9)" letter-spacing="7" filter="url(#glow)">ALTRIN'S  GALAXY</text>
<line x1="${mid-125}" y1="25" x2="${mid+125}" y2="25" stroke="rgba(0,200,255,0.18)" stroke-width="0.5"/>
<text x="${mid-14}" y="36" text-anchor="middle" font-family="Courier New,monospace" font-size="7" fill="rgba(60,160,220,0.42)" letter-spacing="2">AUTO-UPDATES DAILY ·</text>
<text x="${mid+78}" y="36" text-anchor="middle" font-family="Courier New,monospace" font-size="7" fill="rgba(0,255,100,0.82)" letter-spacing="2" filter="url(#glowS)">LIVE GITHUB DATA</text>`;
}

async function main(){
  console.log('🌌 Fetching GitHub data...');
  const user   = await get(`https://api.github.com/users/${USERNAME}`);
  const repos  = await get(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed`);
  // Fetch 2 pages of events for better coverage
  const [ev1,ev2] = await Promise.all([
    get(`https://api.github.com/users/${USERNAME}/events?per_page=100&page=1`).catch(()=>[]),
    get(`https://api.github.com/users/${USERNAME}/events?per_page=100&page=2`).catch(()=>[]),
  ]);
  const allEvents = [...(Array.isArray(ev1)?ev1:[]), ...(Array.isArray(ev2)?ev2:[])];
  const thirtyDays = Date.now() - 30*24*60*60*1000;
  const recent = allEvents.filter(e=>new Date(e.created_at).getTime()>thirtyDays);

  const commits = recent.filter(e=>e.type==='PushEvent')
    .reduce((s,e)=>s+(e.payload?.size||e.payload?.commits?.length||0),0);
  const prs = recent.filter(e=>e.type==='PullRequestEvent'&&e.payload?.action==='closed'&&e.payload?.pull_request?.merged===true).length;
  const totalStars  = repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalIssues = repos.reduce((s,r)=>s+r.open_issues_count,0);
  const langs = [...new Set(repos.map(r=>r.language).filter(Boolean))];

  // Extract real commit messages for comets
  const pushEvents = recent.filter(e=>e.type==='PushEvent');
  const commitData = [];
  pushEvents.forEach(e=>{
    const repoName = e.repo?.name?.split('/')[1];
    const repoIdx = repos.findIndex(r=>r.name===repoName)%7;
    (e.payload?.commits||[]).slice(0,1).forEach(c=>{
      if(commitData.length<6){
        commitData.push({repoIdx:Math.max(0,repoIdx), msg:c.message?.split('\n')[0]||'commit'});
      }
    });
  });

  const active = repos.filter(r=>!r.fork&&!r.archived)
    .sort((a,b)=>(b.stargazers_count*3+b.size)-(a.stargazers_count*3+a.size)).slice(0,6);
  const arch = repos.filter(r=>r.archived).slice(0,1);
  let planetRepos=[...active,...arch].slice(0,7).map(r=>({
    name:r.name,lang:r.archived?'archived':(LANG_MAP[r.language]||'python'),moons:Math.min(r.forks_count,2)
  }));
  while(planetRepos.length<7) planetRepos.push({name:'...',lang:'archived',moons:0});

  const stats={repos:user.public_repos,stars:totalStars,langs:langs.length,
    since:new Date(user.created_at).getFullYear(),commits,prs,issues:totalIssues};

  console.log('Stats:', JSON.stringify(stats));
  console.log('Commit data:', JSON.stringify(commitData));
  console.log('Planets:', planetRepos.map(r=>r.name).join(', '));

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs(planetRepos,commitData)}
${bg()}
${stars()}
${rings()}
${belt()}
${buildComets(planetRepos,commitData)}
${planets(planetRepos)}
${sun()}
${ufo()}
${blackhole()}
${hud(stats)}
${legend()}
${title()}
${overlay()}
</svg>`;

  fs.writeFileSync('galaxy.svg',svg,'utf8');
  console.log('✅ Done! galaxy.svg written.');
}
main().catch(e=>{console.error('❌',e.message);process.exit(1);});
