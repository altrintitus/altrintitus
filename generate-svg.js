'use strict';
const https=require('https'),fs=require('fs');
const USER='altrin7311';
const TOKEN=process.env.GITHUB_TOKEN||'';
// CHANGE THESE LINES:
const W=1000,H=600,CX=330,CY=300; // Increased width/height, moved center down and right
const TILT=-15*Math.PI/180,FLAT=0.25;
const ORBIT_RX=[80,140,200,260,310]; // Widened the orbit radii to spread planets out
const SPEEDS=[11,17,24,33,44];
const ANGS=[0,1.26,2.51,3.77,5.03];
const PCOL=[
  {hi:'#FF9999',f:'#FF4D4D',dk:'#AA1111',glow:'#FF5555'},
  {hi:'#66EDE5',f:'#20C9B0',dk:'#0A8A6E',glow:'#30D4C0'},
  {hi:'#FFE88A',f:'#FFC800',dk:'#AA8800',glow:'#FFD000'},
  {hi:'#D8B4FE',f:'#A855F7',dk:'#6B21A8',glow:'#B06AF0'},
  {hi:'#93C5FD',f:'#3B82F6',dk:'#1E40AF',glow:'#5599FF'},
];

function get(u){return new Promise((res,rej)=>{
  const o={headers:{'User-Agent':'galaxy/3','Accept':'application/vnd.github.v3+json',...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};
  https.get(u,o,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}})}).on('error',rej);
});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function prng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function orbitPt(rx,ry,t){const c=Math.cos(TILT),s=Math.sin(TILT),ex=rx*Math.cos(t),ey=ry*Math.sin(t);return{x:CX+ex*c-ey*s,y:CY+ex*s+ey*c};}
function orbitPath(rx,ry,start=0,n=80){return Array.from({length:n+1},(_,i)=>{const t=start+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t);return`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ')+' Z';}

const TECH_DB={
  'Languages':[],
  'AI & ML':[['openai','OpenAI'],['langchain','LangChain'],['tensorflow','TensorFlow'],['pytorch','PyTorch'],['hugging','HuggingFace'],['scikit','Scikit-Learn'],['transformers','Transformers'],['llm','LLMs'],['gpt','GPT'],['gemini','Gemini'],['anthropic','Claude'],['machine-learning','ML'],['deep-learning','Deep Learning'],['nlp','NLP'],['computer-vision','CV'],['pandas','Pandas'],['numpy','NumPy'],['keras','Keras'],['opencv','OpenCV'],['spacy','SpaCy']],
  'Frameworks':[['react','React'],['vue','Vue.js'],['angular','Angular'],['flask','Flask'],['django','Django'],['fastapi','FastAPI'],['express','Express'],['next','Next.js'],['svelte','Svelte'],['tailwind','Tailwind'],['bootstrap','Bootstrap'],['streamlit','Streamlit'],['gradio','Gradio'],['spring','Spring'],['rails','Rails'],['laravel','Laravel'],['jquery','jQuery']],
  'Databases':[['postgres','PostgreSQL'],['mysql','MySQL'],['mongo','MongoDB'],['sqlite','SQLite'],['redis','Redis'],['firebase','Firebase'],['supabase','Supabase'],['prisma','Prisma'],['sql','SQL'],['dynamodb','DynamoDB']],
  'DevOps & Tools':[['docker','Docker'],['kubernetes','K8s'],['aws','AWS'],['gcp','GCP'],['azure','Azure'],['heroku','Heroku'],['vercel','Vercel'],['netlify','Netlify'],['github-actions','Actions'],['ci','CI/CD'],['terraform','Terraform'],['nginx','Nginx'],['linux','Linux'],['git','Git'],['npm','npm'],['pip','pip'],['conda','Conda']],
};

async function fetchData(){
  console.log('🌌 Fetching data...');
  const user=await get(`https://api.github.com/users/${USER}`);
  const repos=await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
  const since=new Date(Date.now()-30*24*60*60*1000).toISOString();
  // Top 5 non-fork repos by activity
  const nonFork=repos.filter(r=>!r.fork&&!r.archived).sort((a,b)=>{
    const dA=new Date(a.pushed_at).getTime(),dB=new Date(b.pushed_at).getTime();
    return(dB-dA)+(b.stargazers_count-a.stargazers_count)*86400000;
  }).slice(0,5);

  // Fetch 30-day commits for each repo
  const commitData=await Promise.all(nonFork.map(async r=>{
    const url=`https://api.github.com/repos/${USER}/${r.name}/commits?since=${since}&author=${USER}&per_page=100`;
    const commits=await get(url).catch(()=>[]);
    const arr=Array.isArray(commits)?commits:[];
    return{name:r.name,lang:r.language||'Other',count:arr.length,
      msgs:arr.slice(0,4).map(c=>(c.commit?.message||'update').split('\n')[0].slice(0,24)),
      size:r.size,stars:r.stargazers_count,forks:r.forks_count};
  }));
  // Sort by commit count desc (most active = innermost)
  commitData.sort((a,b)=>b.count-a.count||b.size-a.size);

  // Fetch all languages across top 15 repos
  const allLangs={};
  await Promise.all(repos.slice(0,15).map(async r=>{
    const ls=await get(`https://api.github.com/repos/${USER}/${r.name}/languages`).catch(()=>({}));
    if(ls&&typeof ls==='object')Object.keys(ls).forEach(l=>allLangs[l]=(allLangs[l]||0)+ls[l]);
  }));
  const langList=Object.entries(allLangs).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);

  // Detect tech stack from topics + descriptions + names
  const searchParts=[];
  repos.forEach(r=>{
    (r.topics||[]).forEach(t=>searchParts.push(t.toLowerCase()));
    if(r.description)searchParts.push(r.description.toLowerCase());
    searchParts.push(r.name.toLowerCase());
  });
  const searchText=searchParts.join(' ');
  const techStack={};
  techStack['Languages']=langList.slice(0,8);
  Object.entries(TECH_DB).forEach(([cat,pairs])=>{
    if(cat==='Languages')return;
    const found=pairs.filter(([kw])=>searchText.includes(kw)).map(([,display])=>display);
    if(found.length>0)techStack[cat]=[...new Set(found)].slice(0,8);
  });

  const totalStars=repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalIssues=repos.reduce((s,r)=>s+r.open_issues_count,0);
  const totalCommits30=commitData.reduce((s,r)=>s+r.count,0);
  const stats={repos:user.public_repos,stars:totalStars,followers:user.followers,
    following:user.following,since:new Date(user.created_at).getFullYear(),
    commits:totalCommits30,prs:0,issues:totalIssues,name:user.name||USER};

  // Also try events for PRs
  const events=await get(`https://api.github.com/users/${USER}/events?per_page=100`).catch(()=>[]);
  if(Array.isArray(events)){
    const thirtyDays=Date.now()-30*24*60*60*1000;
    stats.prs=events.filter(e=>e.type==='PullRequestEvent'&&e.payload?.action==='closed'&&e.payload?.pull_request?.merged&&new Date(e.created_at).getTime()>thirtyDays).length;
  }

  console.log('Planets:',commitData.map(r=>`${r.name}(${r.count})`).join(', '));
  console.log('Stats:',JSON.stringify(stats));
  console.log('Tech:',JSON.stringify(techStack));
  return{commitData,stats,techStack};
}

function svgDefs(planets){
  let d='<defs>';
  // Background gradient
  d+=`<radialGradient id="bgr" cx="28%" cy="50%" r="72%"><stop offset="0%" stop-color="#0a0a1e"/><stop offset="100%" stop-color="#020210"/></radialGradient>`;
  // Nebula
  d+=`<radialGradient id="nb0"><stop offset="0%" stop-color="#140828" stop-opacity="0.6"/><stop offset="100%" stop-color="#140828" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="nb1"><stop offset="0%" stop-color="#081428" stop-opacity="0.5"/><stop offset="100%" stop-color="#081428" stop-opacity="0"/></radialGradient>`;
  // Sun
  d+=`<radialGradient id="sg" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff4d0"/><stop offset="45%" stop-color="#ffaa22"/><stop offset="100%" stop-color="#220e00"/></radialGradient>`;
  d+=`<radialGradient id="sgl"><stop offset="0%" stop-color="#ffcc44" stop-opacity="0.5"/><stop offset="50%" stop-color="#ff8800" stop-opacity="0.08"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  // Comet gradient per planet color
  planets.forEach((p,i)=>{
    const c=PCOL[i];
    d+=`<radialGradient id="pg${i}" cx="32%" cy="26%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="50%" stop-color="${c.f}"/><stop offset="100%" stop-color="${c.dk}"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.glow}" stop-opacity="0.65"/><stop offset="100%" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>`;
    d+=`<linearGradient id="ct${i}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="${c.glow}" stop-opacity="0.95"/><stop offset="100%" stop-color="${c.glow}" stop-opacity="0"/></linearGradient>`;
  });
  // Filters
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  d+=`<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  // Orbit paths
  ORBIT_RX.forEach((rx,i)=>{const ry=Math.round(rx*FLAT);d+=`<path id="op${i}" d="${orbitPath(rx,ry,ANGS[i])}" fill="none"/>`;});
  // Clip paths for planet shapes
  planets.forEach((_,i)=>{
    const r=planetRadius(planets,i);
    d+=`<clipPath id="cp${i}"><circle r="${r}"/></clipPath>`;
  });
  d+='</defs>';return d;
}

function planetRadius(planets,i){
  const maxC=Math.max(...planets.map(p=>p.count),1);
  const base=planets[i].count>0?planets[i].count:Math.sqrt(planets[i].size/50);
  const maxBase=Math.max(...planets.map(p=>p.count>0?p.count:Math.sqrt(p.size/50)),1);
  return Math.round(7+Math.sqrt(base/maxBase)*11);
}

function svgBG(){
  return`<rect width="${W}" height="${H}" fill="url(#bgr)"/>
<ellipse cx="${CX-60}" cy="${CY-50}" rx="280" ry="180" fill="url(#nb0)"/>
<ellipse cx="${CX+80}" cy="${CY+80}" rx="240" ry="160" fill="url(#nb1)"/>`;
}

function svgStars(){
  const rng=prng(4242);let s='';
  for(let i=0;i<160;i++){const x=(rng()*470).toFixed(1),y=(rng()*H).toFixed(1),op=(0.2+rng()*0.55).toFixed(2),dur=(2+rng()*5).toFixed(1),beg=(rng()*7).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${rng()<0.1?1.3:rng()<0.35?0.8:0.4}" fill="white" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*0.1).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;}
  return`<g>${s}</g>`;
}

function svgOrbits(){
  return ORBIT_RX.map((rx,i)=>{const ry=Math.round(rx*FLAT),path=orbitPath(rx,ry);
    return`<path d="${path}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="0.7"><animate attributeName="stroke-opacity" values="0.05;0.12;0.05" dur="${30+i*8}s" repeatCount="indefinite"/></path>`;}).join('');
}

function svgBelt(){
  const rng=prng(333),cosT=Math.cos(TILT),sinT=Math.sin(TILT),bRx=85,bRy=Math.round(85*FLAT);let dots='';
  for(let i=0;i<90;i++){const t=(i/90)*2*Math.PI,jx=(rng()-.5)*7,jy=(rng()-.5)*2;
    const ex=(bRx+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);
    dots+=`<circle cx="${(CX+ex*cosT-ey*sinT).toFixed(1)}" cy="${(CY+ex*sinT+ey*cosT).toFixed(1)}" r="${(.4+rng()*.7).toFixed(1)}" fill="#b8952a" opacity="${(.15+rng()*.4).toFixed(2)}"/>`;}
  return`<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="140s" repeatCount="indefinite"/>${dots}</g>`;
}

function svgSun(){
  return`<circle cx="${CX}" cy="${CY}" r="68" fill="url(#sgl)" filter="url(#fb)"><animate attributeName="r" values="64;78;64" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="${CX}" cy="${CY}" r="20" fill="url(#sg)"><animate attributeName="r" values="19;21;19" dur="3.5s" repeatCount="indefinite"/></circle>
<circle cx="${CX-5}" cy="${CY-5}" r="8" fill="rgba(255,255,230,0.12)"/>
<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#030310">AT</text>`;
}

function svgPlanets(planets){
  return planets.slice(0,5).map((p,i)=>{
    const rx=ORBIT_RX[i],ry=Math.round(rx*FLAT),pr=planetRadius(planets,i);
    const dur=SPEEDS[i],c=PCOL[i],name=esc(p.name.slice(0,15)),lang=esc(p.lang);
    let body='';
    // Unique shape per planet
    if(i===0){// RINGED
      body=`<path d="M ${pr*1.7},0 A ${pr*1.7},${pr*0.35} 0 0,1 ${-pr*1.7},0" fill="none" stroke="${c.f}" stroke-width="2" opacity="0.3"/>
<circle r="${pr}" fill="url(#pg${i})"/>
<path d="M ${-pr*1.7},0 A ${pr*1.7},${pr*0.35} 0 0,1 ${pr*1.7},0" fill="none" stroke="${c.f}" stroke-width="2" opacity="0.55"/>
<path d="M ${-pr*1.4},0 A ${pr*1.4},${pr*0.25} 0 0,1 ${pr*1.4},0" fill="none" stroke="${c.hi}" stroke-width="1" opacity="0.3"/>`;
    }else if(i===1){// BANDED
      body=`<circle r="${pr}" fill="url(#pg${i})"/>
<g clip-path="url(#cp${i})"><rect x="${-pr}" y="${-pr*0.4}" width="${pr*2}" height="${pr*0.18}" fill="rgba(0,0,0,0.12)"/>
<rect x="${-pr}" y="${pr*0.1}" width="${pr*2}" height="${pr*0.22}" fill="rgba(255,255,255,0.06)"/>
<rect x="${-pr}" y="${pr*0.45}" width="${pr*2}" height="${pr*0.15}" fill="rgba(0,0,0,0.1)"/></g>`;
    }else if(i===2){// SPOTTED
      body=`<circle r="${pr}" fill="url(#pg${i})"/>
<circle cx="${pr*0.25}" cy="${pr*0.15}" r="${pr*0.28}" fill="rgba(200,80,0,0.25)"/>
<circle cx="${pr*0.3}" cy="${pr*0.2}" r="${pr*0.15}" fill="rgba(255,100,0,0.2)"/>`;
    }else if(i===3){// ATMOSPHERIC
      body=`<circle r="${pr+4}" fill="${c.glow}" opacity="0.12"><animate attributeName="r" values="${pr+3};${pr+6};${pr+3}" dur="3s" repeatCount="indefinite"/></circle>
<circle r="${pr}" fill="url(#pg${i})"/>
<circle r="${pr}" fill="none" stroke="${c.hi}" stroke-width="1.5" opacity="0.25"/>`;
    }else{// CRYSTALLINE
      body=`<circle r="${pr}" fill="url(#pg${i})"/>
<line x1="${-pr*0.3}" y1="${-pr*0.6}" x2="${pr*0.1}" y2="${-pr*0.1}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
<line x1="${pr*0.2}" y1="${-pr*0.5}" x2="${pr*0.5}" y2="${pr*0.1}" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
<circle cx="${-pr*0.15}" cy="${-pr*0.3}" r="${pr*0.08}" fill="rgba(255,255,255,0.2)"/>`;
    }
    let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
    s+=`<circle r="${pr*3}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.55"/>`;
    s+=body;
    // Shine
    s+=`<circle r="${pr*0.45}" cx="${-pr*0.3}" cy="${-pr*0.3}" fill="rgba(255,255,255,0.12)"/>`;
    // Pulse
    s+=`<circle r="${pr}" fill="none" stroke="${c.glow}" stroke-width="0.8" opacity="0.3"><animate attributeName="r" values="${pr};${pr+2};${pr}" dur="${3+i*0.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.08;0.3" dur="${3+i*0.5}s" repeatCount="indefinite"/></circle>`;
    // Moon for repos with forks
    if(p.forks>0){const mo=pr+8,mr=2;s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${mo}" r="${mr}" fill="#aabbcc" opacity="0.65"/></g>`;}
    // Labels
    s+=`<text y="${pr+13}" text-anchor="middle" font-family="monospace" font-size="8" fill="rgba(255,255,255,0.78)">${name}</text>`;
    s+=`<text y="${pr+22}" text-anchor="middle" font-family="monospace" font-size="6" fill="${c.glow}" opacity="0.6">${lang}</text>`;
    return s+'</g>';
  }).join('');
}

function svgComets(planets){
  let s='';let ci=0;
  planets.slice(0,5).forEach((p,pi)=>{
    const rx=ORBIT_RX[pi],ry=Math.round(rx*FLAT),c=PCOL[pi];
    p.msgs.forEach((msg,mi)=>{
      if(ci>=10)return;
      const angle=ANGS[pi]+mi*0.9+0.3;
      const tp=orbitPt(rx,ry,angle);
      const sx=Math.max(-30,tp.x-120-mi*20);
      const sy=Math.max(10,tp.y-40-mi*12);
      const dur=8+ci*0.8;
      const beg=ci*2.8;
      s+=`<g opacity="0">
<animateMotion dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite" rotate="auto" path="M ${sx.toFixed(1)},${sy.toFixed(1)} L ${tp.x.toFixed(1)},${tp.y.toFixed(1)}"/>
<animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.06;0.88;1" dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite"/>
<circle r="3" fill="${c.glow}"/>
<rect x="-50" y="-1.5" width="50" height="3" fill="url(#ct${pi})" rx="1.5"/>
<text x="5" y="-5" font-family="monospace" font-size="6" fill="${c.glow}" opacity="0.85">${esc(msg)}</text>
</g>`;
      ci++;
    });
  });
  return s;
}

function svgHUD(stats,tech){
  const px=502,py=14,pw=344,ph=452;
  let s='';
  // Panel background
  s+=`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="6" fill="rgba(8,12,24,0.95)" stroke="rgba(100,160,255,0.15)" stroke-width="0.8"/>`;
  // Header area
  s+=`<rect x="${px+1}" y="${py+1}" width="${pw-2}" height="50" rx="5" fill="rgba(60,130,255,0.06)"/>`;
  let cy=py+22;
  s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="12" font-weight="bold" fill="rgba(220,235,255,0.95)">${esc(stats.name)}</text>`;
  cy+=14;
  s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="8" fill="rgba(120,160,220,0.7)">@${USER}  ·  ${stats.followers} followers  ·  ${stats.following} following</text>`;
  cy+=22;
  // Divider
  s+=`<line x1="${px+12}" y1="${cy}" x2="${px+pw-12}" y2="${cy}" stroke="rgba(100,160,255,0.1)" stroke-width="0.5"/>`;
  cy+=14;
  // OVERVIEW
  s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="8" font-weight="bold" fill="rgba(100,180,255,0.7)" letter-spacing="2">OVERVIEW</text>`;
  cy+=16;
  const ov=[['Repos',stats.repos],['Stars',stats.stars],['Active since',stats.since]];
  ov.forEach(([l,v])=>{
    s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="8" fill="rgba(160,190,230,0.65)">${l}</text>`;
    s+=`<text x="${px+pw-16}" y="${cy}" text-anchor="end" font-family="monospace" font-size="8" font-weight="bold" fill="rgba(220,240,255,0.92)">${v}</text>`;
    cy+=14;
  });
  cy+=6;
  s+=`<line x1="${px+12}" y1="${cy}" x2="${px+pw-12}" y2="${cy}" stroke="rgba(100,160,255,0.1)" stroke-width="0.5"/>`;
  cy+=14;
  // LAST 30 DAYS
  s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="8" font-weight="bold" fill="rgba(100,180,255,0.7)" letter-spacing="2">LAST 30 DAYS</text>`;
  cy+=16;
  const ld=[['Commits',stats.commits],['PRs merged',stats.prs],['Open issues',stats.issues]];
  ld.forEach(([l,v])=>{
    s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="8" fill="rgba(160,190,230,0.65)">${l}</text>`;
    s+=`<text x="${px+pw-16}" y="${cy}" text-anchor="end" font-family="monospace" font-size="8" font-weight="bold" fill="rgba(220,240,255,0.92)">${v}</text>`;
    cy+=14;
  });
  cy+=6;
  s+=`<line x1="${px+12}" y1="${cy}" x2="${px+pw-12}" y2="${cy}" stroke="rgba(100,160,255,0.1)" stroke-width="0.5"/>`;
  cy+=14;
  // TECH STACK
  s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="8" font-weight="bold" fill="rgba(100,180,255,0.7)" letter-spacing="2">TECH STACK</text>`;
  cy+=12;
  Object.entries(tech).forEach(([cat,items])=>{
    if(!items||items.length===0)return;
    cy+=8;
    s+=`<text x="${px+16}" y="${cy}" font-family="monospace" font-size="7" fill="rgba(140,170,220,0.55)">${esc(cat)}</text>`;
    cy+=10;
    // Render badges in a wrapping row
    let bx=px+16;
    const maxX=px+pw-16;
    items.forEach(item=>{
      const tw=item.length*5.2+12;
      if(bx+tw>maxX){bx=px+16;cy+=20;}
      s+=`<rect x="${bx}" y="${cy}" width="${tw}" height="16" rx="4" fill="rgba(80,140,255,0.08)" stroke="rgba(100,160,255,0.2)" stroke-width="0.5"/>`;
      s+=`<text x="${bx+tw/2}" y="${cy+11}" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(180,210,255,0.85)">${esc(item)}</text>`;
      bx+=tw+5;
    });
    cy+=22;
  });
  return s;
}

function svgTitle(){
  return`<text x="${CX}" y="20" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="rgba(180,215,255,0.88)" letter-spacing="5">ALTRIN'S GALAXY</text>
<line x1="${CX-100}" y1="25" x2="${CX+100}" y2="25" stroke="rgba(100,180,255,0.12)" stroke-width="0.5"/>
<text x="${CX}" y="35" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(100,160,220,0.4)" letter-spacing="2">AUTO-UPDATES DAILY</text>`;
}

function svgLegend(planets){
  const lx=14,ly=H-68;
  let s=`<text x="${lx}" y="${ly}" font-family="monospace" font-size="7" fill="rgba(160,200,255,0.45)" letter-spacing="1">ACTIVE REPOS</text>`;
  planets.slice(0,5).forEach((p,i)=>{
    const c=PCOL[i],y=ly+12+i*11;
    s+=`<circle cx="${lx+5}" cy="${y-3}" r="3" fill="${c.f}"/>`;
    s+=`<text x="${lx+13}" y="${y}" font-family="monospace" font-size="6.5" fill="rgba(200,220,255,0.65)">${esc(p.name.slice(0,12))} · ${p.count} commits</text>`;
  });
  return s;
}

async function main(){
  const{commitData,stats,techStack}=await fetchData();
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${svgDefs(commitData)}
${svgBG()}
${svgStars()}
${svgOrbits()}
${svgBelt()}
${svgComets(commitData)}
${svgPlanets(commitData)}
${svgSun()}
${svgHUD(stats,techStack)}
${svgTitle()}
${svgLegend(commitData)}
</svg>`;
  fs.writeFileSync('galaxy.svg',svg,'utf8');
  console.log('✅ galaxy.svg written!');
}
main().catch(e=>{console.error('❌',e.message);process.exit(1);});
