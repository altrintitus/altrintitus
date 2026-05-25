'use strict';
const https = require('https');
const fs    = require('fs');

const USERNAME = 'altrin7311';
const TOKEN    = process.env.GITHUB_TOKEN || '';
const W = 860, H = 480, CX = 470, CY = 270;
const TILT = -20 * Math.PI / 180;

const LANG_MAP = {
  Python:'python',JavaScript:'js',TypeScript:'typescript',
  Rust:'rust',HTML:'html',CSS:'js',Go:'python',
  'C++':'rust',C:'rust',Java:'typescript',Shell:'js',
  Vue:'js',Svelte:'js',Ruby:'rust',PHP:'js',Kotlin:'typescript',
};
const COLORS = {
  python:    {hi:'#6aa8d8',fill:'#3a70a8',glow:'#4488cc'},
  js:        {hi:'#f5d26b',fill:'#c9a227',glow:'#ddbb44'},
  typescript:{hi:'#6fa3e0',fill:'#2d6db5',glow:'#4488cc'},
  rust:      {hi:'#e07b54',fill:'#a84a28',glow:'#cc5533'},
  html:      {hi:'#e07070',fill:'#b03030',glow:'#cc4444'},
  archived:  {hi:'#555577',fill:'#2a2a44',glow:'#333355'},
};
const ORBITS = [
  {rx:88,ry:33},{rx:128,ry:48},{rx:168,ry:63},
  {rx:208,ry:78},{rx:248,ry:93},{rx:285,ry:107},{rx:318,ry:119}
];
const SPEEDS  = [10,14,19,25,32,41,56];
const PRADII  = [14,12,11,10,9,8,6];
const STARTS  = [0,1.2,2.8,0.5,3.9,1.8,4.5];

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

function orbitPath(rx,ry,start=0,n=72){
  const cosT=Math.cos(TILT),sinT=Math.sin(TILT);
  return Array.from({length:n+1},(_,i)=>{
    const t=start+(i/n)*2*Math.PI;
    const ex=rx*Math.cos(t),ey=ry*Math.sin(t);
    return `${i===0?'M':'L'}${(CX+ex*cosT-ey*sinT).toFixed(2)},${(CY+ex*sinT+ey*cosT).toFixed(2)}`;
  }).join(' ')+' Z';
}

function defs(repos){
  let d='<defs>';
  d+=`<radialGradient id="sg" cx="35%" cy="30%" r="65%"><stop offset="0%" stop-color="#ffe8a0"/><stop offset="55%" stop-color="#ffb830"/><stop offset="100%" stop-color="#0c0c1e"/></radialGradient>`;
  d+=`<radialGradient id="sgl"><stop offset="0%" stop-color="#ffcc44" stop-opacity="0.5"/><stop offset="60%" stop-color="#ff8800" stop-opacity="0.1"/><stop offset="100%" stop-color="#ff8800" stop-opacity="0"/></radialGradient>`;
  ['#3a1a6e','#1a3a6e','#2a1a5e'].forEach((c,i)=>
    d+=`<radialGradient id="nb${i}"><stop offset="0%" stop-color="${c}" stop-opacity="0.45"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
  d+=`<linearGradient id="cg" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="rgba(180,255,240,0.9)"/><stop offset="100%" stop-color="rgba(180,255,240,0)"/></linearGradient>`;
  repos.forEach((r,i)=>{
    const c=COLORS[r.lang]||COLORS.archived;
    d+=`<radialGradient id="pg${i}" cx="35%" cy="30%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="60%" stop-color="${c.fill}"/><stop offset="100%" stop-color="#080818"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.glow}" stop-opacity="0.65"/><stop offset="100%" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>`;
  });
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  ORBITS.forEach(({rx,ry},i)=>d+=`<path id="op${i}" d="${orbitPath(rx,ry,STARTS[i])}" fill="none"/>`);
  d+='</defs>';
  return d;
}

function bg(){
  return `<rect width="${W}" height="${H}" fill="#05050f"/>
<ellipse cx="${CX-140}" cy="${CY-70}" rx="240" ry="150" fill="url(#nb0)" opacity="0.9"/>
<ellipse cx="${CX+190}" cy="${CY+65}" rx="210" ry="140" fill="url(#nb1)" opacity="0.85"/>
<ellipse cx="${CX-50}" cy="${CY+100}" rx="170" ry="110" fill="url(#nb2)" opacity="0.7"/>`;
}

function stars(){
  const rng=prng(7654);
  let s='<g>';
  for(let i=0;i<200;i++){
    const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1);
    const r=rng()<0.12?1.4:rng()<0.35?1.0:0.6;
    const op=(0.3+rng()*0.65).toFixed(2);
    const dur=(1.5+rng()*5).toFixed(1),beg=(rng()*7).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*0.1).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;
  }
  return s+'</g>';
}

function rings(){
  return ORBITS.map(({rx,ry})=>`<path d="${orbitPath(rx,ry)}" fill="none" stroke="rgba(100,160,255,0.07)" stroke-width="0.8"/>`).join('');
}

function belt(){
  const rng=prng(999),cosT=Math.cos(TILT),sinT=Math.sin(TILT);
  let dots='';
  for(let i=0;i<85;i++){
    const t=(i/85)*2*Math.PI,jx=(rng()-0.5)*7,jy=(rng()-0.5)*3;
    const ex=(110+jx)*Math.cos(t),ey=(41+jy)*Math.sin(t);
    const x=(CX+ex*cosT-ey*sinT).toFixed(2),y=(CY+ex*sinT+ey*cosT).toFixed(2);
    dots+=`<circle cx="${x}" cy="${y}" r="${(0.5+rng()*0.9).toFixed(1)}" fill="#c8a850" opacity="${(0.2+rng()*0.5).toFixed(2)}"/>`;
  }
  return `<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="110s" repeatCount="indefinite"/>${dots}</g>`;
}

function sun(){
  return `<circle cx="${CX}" cy="${CY}" r="70" fill="url(#sgl)" filter="url(#fb)"><animate attributeName="r" values="65;80;65" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="${CX}" cy="${CY}" r="22" fill="url(#sg)"><animate attributeName="r" values="21;23;21" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="${CX-7}" cy="${CY-7}" r="10" fill="rgba(255,255,220,0.14)"/>
<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="Courier New,monospace" font-size="11" font-weight="bold" fill="#060612">AT</text>
<text x="${CX}" y="${CY+43}" text-anchor="middle" font-family="Courier New,monospace" font-size="8" fill="rgba(255,210,120,0.55)" letter-spacing="3">ALTRIN</text>`;
}

function planets(repos){
  return repos.slice(0,7).map((r,i)=>{
    const pr=PRADII[i],dur=SPEEDS[i],name=esc(r.name.slice(0,14));
    let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
    s+=`<circle r="${pr*2.6}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.7"/>`;
    s+=`<circle r="${pr}" fill="url(#pg${i})"/>`;
    s+=`<circle r="${pr*0.5}" cx="${-pr*0.3}" cy="${-pr*0.3}" fill="rgba(255,255,255,0.14)"/>`;
    if((r.moons||0)>0){
      const mo=pr+9,mr=Math.max(2.5,pr*0.22);
      s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*0.13).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${mo}" cy="0" r="${mr}" fill="#aaaacc" opacity="0.75"/></g>`;
    }
    s+=`<text y="${pr+13}" text-anchor="middle" font-family="Courier New,monospace" font-size="8" fill="rgba(180,220,255,0.78)">${name}</text>`;
    return s+'</g>';
  }).join('');
}

function ufo(){
  return `<g><animateMotion dur="22s" repeatCount="indefinite" rotate="0" path="M -40,62 L ${W+40},62"/>
<ellipse rx="20" ry="7" fill="#cc44ff" opacity="0.9"/>
<ellipse ry="7" rx="10" cy="-5" fill="rgba(220,180,255,0.88)"/>
<circle cx="-8" cy="0" r="2.5" fill="#ff0"><animate attributeName="fill" values="#ff0;#f0f;#0ff;#ff0" dur="0.7s" repeatCount="indefinite"/></circle>
<circle cx="0" cy="0" r="2.5" fill="#f0f"><animate attributeName="fill" values="#f0f;#0ff;#ff0;#f0f" dur="0.7s" repeatCount="indefinite"/></circle>
<circle cx="8" cy="0" r="2.5" fill="#0ff"><animate attributeName="fill" values="#0ff;#ff0;#f0f;#0ff" dur="0.7s" repeatCount="indefinite"/></circle>
<polygon points="-12,7 12,7 20,30 -20,30" fill="rgba(180,100,255,0.12)"/>
<text y="-15" text-anchor="middle" font-family="Courier New,monospace" font-size="7.5" fill="rgba(200,140,255,0.82)">open issue</text>
</g>`;
}

function comets(){
  const mk=(beg,sy,ey)=>`<g opacity="0">
<animateMotion dur="2.8s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M -40,${sy} L ${W*0.85},${ey}"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.94;1" dur="2.8s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="3" fill="rgba(180,255,240,0.95)"/>
<rect x="-55" y="-1" width="55" height="2" fill="url(#cg)" rx="1"/>
<text x="6" y="-5" font-family="Courier New,monospace" font-size="7" fill="rgba(120,240,200,0.78)">commit</text>
</g>`;
  return mk(1.5,110,340)+mk(9,155,390);
}

function shoots(){
  const mk=(beg,x1,y1,x2,y2)=>`<g opacity="0">
<animateMotion dur="1.2s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M ${x1},${y1} L ${x2},${y2}"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.85;1" dur="1.2s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="2.5" fill="rgba(255,255,100,0.95)"/>
<rect x="-45" y="-1" width="45" height="1.5" fill="rgba(255,255,100,0.6)" rx="0.5"/>
<text x="5" y="-5" font-family="Courier New,monospace" font-size="7" fill="rgba(255,240,100,0.82)">pr merged</text>
</g>`;
  return mk(4,150,25,550,200)+mk(14,320,18,720,235);
}

function blackhole(){
  const bx=W-78,by=H-72;
  return `<ellipse cx="${bx}" cy="${by}" rx="44" ry="15" fill="none" stroke="rgba(160,0,230,0.35)" stroke-width="3"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="360 ${bx} ${by}" dur="5.5s" repeatCount="indefinite"/></ellipse>
<ellipse cx="${bx}" cy="${by}" rx="34" ry="11" fill="none" stroke="rgba(190,60,255,0.45)" stroke-width="2.5"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="-360 ${bx} ${by}" dur="3.8s" repeatCount="indefinite"/></ellipse>
<ellipse cx="${bx}" cy="${by}" rx="24" ry="8" fill="none" stroke="rgba(210,110,255,0.55)" stroke-width="2"><animateTransform attributeName="transform" type="rotate" from="0 ${bx} ${by}" to="360 ${bx} ${by}" dur="2.5s" repeatCount="indefinite"/></ellipse>
<circle cx="${bx}" cy="${by}" r="15" fill="black"/>
<circle cx="${bx}" cy="${by}" r="15" fill="none" stroke="rgba(190,80,255,0.7)" stroke-width="1.5"/>
<text x="${bx}" y="${by+28}" text-anchor="middle" font-family="Courier New,monospace" font-size="7.5" fill="rgba(160,80,220,0.72)">archived</text>`;
}

function hud(stats){
  const x=16,y=16,w=188,h=192;
  const rows=[
    ['REPOS',stats.repos],['COMMITS',stats.commits],['STARS',stats.stars],
    ['PRS MERGED',stats.prs],['LANGUAGES',stats.langs],
    ['CONTRIBUTING TO',stats.contributing],['OPEN ISSUES',stats.issues],['ACTIVE SINCE',stats.since]
  ];
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="rgba(0,15,3,0.9)" stroke="rgba(0,200,70,0.3)" stroke-width="0.8"/>`;
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="23" rx="3" fill="rgba(0,200,70,0.1)"/>`;
  [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([px,py])=>{
    const sx=px===x?1:-1,sy=py===y?1:-1;
    s+=`<line x1="${px}" y1="${py+sy*10}" x2="${px}" y2="${py}" stroke="#00ee44" stroke-width="1.5"/>`;
    s+=`<line x1="${px}" y1="${py}" x2="${px+sx*10}" y2="${py}" stroke="#00ee44" stroke-width="1.5"/>`;
  });
  s+=`<text x="${x+10}" y="${y+15}" font-family="Courier New,monospace" font-size="8" fill="rgba(0,255,68,0.9)" letter-spacing="0.8">[ ATLAS · /usr/altrin ]</text>`;
  s+=`<circle cx="${x+w-14}" cy="${y+12}" r="4" fill="#00ff44"><animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite"/></circle>`;
  s+=`<line x1="${x+6}" y1="${y+25}" x2="${x+w-6}" y2="${y+25}" stroke="rgba(0,200,70,0.2)" stroke-width="0.5" stroke-dasharray="3,4"/>`;
  rows.forEach(([label,val],i)=>{
    const ry=y+39+i*18.8;
    if(i%2===0) s+=`<rect x="${x+1}" y="${ry-12}" width="${w-2}" height="17" fill="rgba(255,255,255,0.015)"/>`;
    s+=`<text x="${x+10}" y="${ry}" font-family="Courier New,monospace" font-size="7.5" fill="rgba(0,180,60,0.72)">${esc(label)}</text>`;
    s+=`<text x="${x+w-10}" y="${ry}" text-anchor="end" font-family="Courier New,monospace" font-size="7.5" font-weight="bold" fill="rgba(0,255,70,0.95)">${esc(String(val))}</text>`;
  });
  s+=`<line x1="${x+6}" y1="${y+h-24}" x2="${x+w-6}" y2="${y+h-24}" stroke="rgba(0,200,70,0.2)" stroke-width="0.5" stroke-dasharray="3,4"/>`;
  s+=`<text x="${x+10}" y="${y+h-11}" font-family="Courier New,monospace" font-size="7" fill="rgba(0,180,55,0.55)">› SYNC · daily</text>`;
  s+=`<rect x="${x+w-22}" y="${y+h-19}" width="7" height="10" rx="1" fill="#00ff44"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></rect>`;
  return s;
}

function legend(){
  const x=W-152,y=H-118,w=140,h=108;
  const items=[['#5599dd','PYTHON'],['#f5d26b','JS'],['#6fa3e0','TYPESCRIPT'],['#e07b54','RUST'],['#555577','ARCHIVED']];
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="rgba(5,10,25,0.9)" stroke="rgba(80,160,255,0.2)" stroke-width="0.8"/>`;
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="20" rx="3" fill="rgba(80,160,255,0.08)"/>`;
  s+=`<line x1="${x+6}" y1="${y+11}" x2="${x+8}" y2="${y+11}" stroke="#5599ff" stroke-width="2"/>`;
  s+=`<text x="${x+14}" y="${y+15}" font-family="Courier New,monospace" font-size="7.5" fill="rgba(120,190,255,0.88)" letter-spacing="1">LANG · COLOR MAP</text>`;
  items.forEach(([col,lab],i)=>{
    const iy=y+30+i*16;
    s+=`<rect x="${x+12}" y="${iy}" width="10" height="10" rx="2" fill="${col}" opacity="0.88"/>`;
    s+=`<text x="${x+27}" y="${iy+8}" font-family="Courier New,monospace" font-size="7.5" fill="rgba(180,210,255,0.82)">${lab}</text>`;
  });
  return s;
}

function title(){
  const mid=W/2;
  return `<text x="${mid}" y="21" text-anchor="middle" font-family="Courier New,monospace" font-size="13" font-weight="bold" fill="rgba(160,210,255,0.9)" letter-spacing="5">ALTRIN'S GALAXY  v1.0</text>
<text x="${mid-38}" y="35" text-anchor="middle" font-family="Courier New,monospace" font-size="7.5" fill="rgba(100,160,220,0.5)" letter-spacing="2">AUTO-UPDATES DAILY ·</text>
<text x="${mid+65}" y="35" text-anchor="middle" font-family="Courier New,monospace" font-size="7.5" fill="rgba(0,220,80,0.82)" letter-spacing="2">LIVE GITHUB DATA</text>`;
}

async function main(){
  console.log('🌌 Fetching GitHub data for',USERNAME,'...');
  const user   = await get(`https://api.github.com/users/${USERNAME}`);
  const repos  = await get(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed`);
  const events = await get(`https://api.github.com/users/${USERNAME}/events?per_page=100`).catch(()=>[]);

  const totalStars  = repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalIssues = repos.reduce((s,r)=>s+r.open_issues_count,0);
  const langs       = [...new Set(repos.map(r=>r.language).filter(Boolean))];
  const commits     = Array.isArray(events)
    ? events.filter(e=>e.type==='PushEvent').reduce((s,e)=>s+(e.payload.commits?.length||0),0) : 0;

  const active = repos.filter(r=>!r.fork&&!r.archived)
    .sort((a,b)=>(b.stargazers_count*3+b.size)-(a.stargazers_count*3+a.size)).slice(0,6);
  const arch = repos.filter(r=>r.archived).slice(0,1);
  let planetRepos = [...active,...arch].slice(0,7).map(r=>({
    name:r.name, lang:r.archived?'archived':(LANG_MAP[r.language]||'python'), moons:Math.min(r.forks_count,2)
  }));
  while(planetRepos.length<7) planetRepos.push({name:'...',lang:'archived',moons:0});

  const stats = {
    repos: user.public_repos, commits: commits||'—', stars: totalStars,
    prs: '—', langs: langs.length, contributing: repos.filter(r=>r.fork).length||'—',
    issues: totalIssues, since: new Date(user.created_at).getFullYear()
  };

  console.log('Planets:', planetRepos.map(r=>r.name).join(', '));
  console.log('Stats:', JSON.stringify(stats));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
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
</svg>`;

  fs.writeFileSync('galaxy.svg', svg, 'utf8');
  console.log('✅ galaxy.svg written!');
}

main().catch(e=>{console.error('❌',e.message);process.exit(1);});
