'use strict';
const https=require('https'),fs=require('fs');

const USER='altrin7311'; // Make sure this is your username
const TOKEN=process.env.GITHUB_TOKEN||''; 

const W=900,H=600,CX=310,CY=280;
const TILT=-15*Math.PI/180,FLAT=0.25;
const ORX=[70,125,180,235,285];
const SPEEDS=[11,17,24,33,44];
const ANGS=[0.4,1.5,2.8,4.0,5.2];
const PBR=[22,18,16,14,11];

// Planet Neon Palette
const PCOL=[
  {hi:'#FF9999',f:'#FF4D4D',dk:'#AA1111',g:'#FF5555'},
  {hi:'#66EDE5',f:'#20C9B0',dk:'#0A8A6E',g:'#30D4C0'},
  {hi:'#FFE88A',f:'#FFC800',dk:'#AA8800',g:'#FFD000'},
  {hi:'#D8B4FE',f:'#A855F7',dk:'#6B21A8',g:'#B06AF0'},
  {hi:'#93C5FD',f:'#3B82F6',dk:'#1E40AF',g:'#5599FF'},
];

// GitHub API Fetcher
function get(u){
  return new Promise((r,j)=>{
    const o={headers:{'User-Agent':'galaxy/5','Accept':'application/vnd.github.v3+json',...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};
    https.get(u,o,s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>{try{r(JSON.parse(d))}catch(e){j(e)}})}).on('error',j);
  });
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function prng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function orbitPt(rx,ry,t){const c=Math.cos(TILT),s=Math.sin(TILT),ex=rx*Math.cos(t),ey=ry*Math.sin(t);return{x:CX+ex*c-ey*s,y:CY+ex*s+ey*c};}
function orbitPath(rx,ry,st=0,n=80){return Array.from({length:n+1},(_,i)=>{const t=st+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t);return`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ')+' Z';}

// Tech Stack Database
const TECH_DB={
  'AI & ML':[['openai','OpenAI'],['langchain','LangChain'],['tensorflow','TensorFlow'],['pytorch','PyTorch'],['hugging','HuggingFace'],['scikit','Scikit-Learn'],['transformers','Transformers'],['llm','LLMs'],['gpt','GPT'],['gemini','Gemini'],['anthropic','Claude'],['machine.learning','ML'],['deep.learning','DL'],['pandas','Pandas'],['numpy','NumPy'],['keras','Keras'],['opencv','OpenCV'],['matplotlib','Matplotlib'],['jupyter','Jupyter'],['nltk','NLTK'],['spacy','SpaCy']],
  'Frameworks':[['react','React'],['vue','Vue'],['angular','Angular'],['flask','Flask'],['django','Django'],['fastapi','FastAPI'],['express','Express'],['next','Next.js'],['svelte','Svelte'],['tailwind','Tailwind'],['bootstrap','Bootstrap'],['streamlit','Streamlit'],['gradio','Gradio'],['laravel','Laravel'],['electron','Electron']],
  'Databases':[['postgres','PostgreSQL'],['mysql','MySQL'],['mongodb','MongoDB'],['mongo','MongoDB'],['sqlite','SQLite'],['redis','Redis'],['firebase','Firebase'],['supabase','Supabase'],['prisma','Prisma'],['dynamodb','DynamoDB'],['neo4j','Neo4j']],
  'DevOps & Tools':[['docker','Docker'],['kubernetes','K8s'],['aws','AWS'],['gcp','GCP'],['azure','Azure'],['heroku','Heroku'],['vercel','Vercel'],['netlify','Netlify'],['github.actions','Actions'],['ci/cd','CI/CD'],['terraform','Terraform'],['nginx','Nginx'],['linux','Linux'],['pip','pip'],['conda','Conda'],['selenium','Selenium'],['playwright','Playwright'],['pytest','Pytest'],['jest','Jest'],['vite','Vite'],['graphql','GraphQL'],['celery','Celery'],['poetry','Poetry']],
};

async function fetchData(){
  console.log('🌌 Fetching...');
  const user=await get(`https://api.github.com/users/${USER}`);
  const repos=await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
  const since=new Date(Date.now()-30*24*60*60*1000).toISOString();
  
  const nonFork=repos.filter(r=>!r.fork&&!r.archived).sort((a,b)=>(new Date(b.pushed_at)-new Date(a.pushed_at))+(b.stargazers_count-a.stargazers_count)*864e5).slice(0,5);
  
  const commitData=await Promise.all(nonFork.map(async r=>{
    const c=await get(`https://api.github.com/repos/${USER}/${r.name}/commits?since=${since}&author=${USER}&per_page=100`).catch(()=>[]);
    const a=Array.isArray(c)?c:[];
    return{name:r.name,lang:r.language||'Other',count:a.length,
      msgs:a.slice(0,4).map(x=>(x.commit?.message||'update').split('\n')[0].slice(0,22)),
      size:r.size,stars:r.stargazers_count,forks:r.forks_count};
  }));
  
  commitData.sort((a,b)=>b.count-a.count||b.size-a.size);
  
  const allLangs={};
  await Promise.all(repos.slice(0,15).map(async r=>{
    const ls=await get(`https://api.github.com/repos/${USER}/${r.name}/languages`).catch(()=>({}));
    if(ls&&typeof ls==='object')Object.keys(ls).forEach(l=>allLangs[l]=(allLangs[l]||0)+ls[l]);
  }));
  
  console.log('📄 Scanning READMEs...');
  const readmes=await Promise.all(repos.slice(0,12).map(async r=>{
    const rm=await get(`https://api.github.com/repos/${USER}/${r.name}/readme`).catch(()=>null);
    if(rm&&rm.content)try{return Buffer.from(rm.content,'base64').toString('utf8').toLowerCase();}catch(e){}return'';
  }));
  
  const parts=[];
  repos.forEach(r=>{(r.topics||[]).forEach(t=>parts.push(t));if(r.description)parts.push(r.description.toLowerCase());parts.push(r.name.toLowerCase());});
  parts.push(...readmes);
  
  const corpus=parts.join(' ').replace(/[-_]/g,'.').toLowerCase();
  const techStack={};
  techStack['Languages']=Object.entries(allLangs).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,8);
  
  Object.entries(TECH_DB).forEach(([cat,pairs])=>{
    const found=pairs.filter(([kw])=>corpus.includes(kw)).map(([,d])=>d);
    if(found.length>0)techStack[cat]=[...new Set(found)].slice(0,10);
  });
  
  const totalStars=repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalIssues=repos.reduce((s,r)=>s+r.open_issues_count,0);
  const totalC=commitData.reduce((s,r)=>s+r.count,0);
  const events=await get(`https://api.github.com/users/${USER}/events?per_page=100`).catch(()=>[]);
  const td=Date.now()-30*864e5;
  
  let prs=0;
  if(Array.isArray(events))prs=events.filter(e=>e.type==='PullRequestEvent'&&e.payload?.action==='closed'&&e.payload?.pull_request?.merged&&new Date(e.created_at).getTime()>td).length;
  
  const stats={repos:user.public_repos,stars:totalStars,followers:user.followers,following:user.following,since:new Date(user.created_at).getFullYear(),commits:totalC,prs,issues:totalIssues,name:user.name||USER};
  
  console.log('Planets:',commitData.map(r=>`${r.name}(${r.count})`).join(', '));
  return{commitData,stats,techStack};
}

function pR(P,i){
  const mx=Math.max(...P.map(p=>p.count>0?p.count:Math.sqrt(p.size/30)),1);
  const v=P[i].count>0?P[i].count:Math.sqrt(P[i].size/30);
  return Math.round(PBR[i]*.5+Math.sqrt(v/mx)*PBR[i]*.6);
}

function svgDefs(P){
  let d='<defs>';
  d+=`<radialGradient id="bgr" cx="35%" cy="50%" r="70%"><stop offset="0%" stop-color="#0d0d24"/><stop offset="100%" stop-color="#020210"/></radialGradient>`;
  d+=`<radialGradient id="nb0"><stop offset="0%" stop-color="#1a0a30" stop-opacity="0.5"/><stop offset="100%" stop-color="#1a0a30" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="nb1"><stop offset="0%" stop-color="#0a1530" stop-opacity="0.4"/><stop offset="100%" stop-color="#0a1530" stop-opacity="0"/></radialGradient>`;
  
  // SUN GRADIENTS
  d+=`<radialGradient id="sc1"><stop offset="0%" stop-color="#fff8e0" stop-opacity="0.5"/><stop offset="40%" stop-color="#ffaa00" stop-opacity="0.12"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc2"><stop offset="0%" stop-color="#ffcc33" stop-opacity="0.55"/><stop offset="50%" stop-color="#ff7700" stop-opacity="0.15"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc3"><stop offset="0%" stop-color="#ffdd66" stop-opacity="0.7"/><stop offset="60%" stop-color="#ff8800" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sb" cx="42%" cy="35%" r="58%"><stop offset="0%" stop-color="#ffffff"/><stop offset="25%" stop-color="#fff8d0"/><stop offset="55%" stop-color="#ffaa22"/><stop offset="85%" stop-color="#dd5500"/><stop offset="100%" stop-color="#441100"/></radialGradient>`;
  d+=`<radialGradient id="sco"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="50%" stop-color="#fff4cc" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffcc44" stop-opacity="0"/></radialGradient>`;
  
  P.forEach((p,i)=>{
    const c=PCOL[i];
    d+=`<radialGradient id="pg${i}" cx="32%" cy="26%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="50%" stop-color="${c.f}"/><stop offset="100%" stop-color="${c.dk}"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.6"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></radialGradient>`;
    d+=`<linearGradient id="ct${i}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></linearGradient>`;
    const r=pR(P,i);d+=`<clipPath id="cp${i}"><circle r="${r}"/></clipPath>`;
  });
  
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>`;
  d+=`<filter id="fm" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="10"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  d+=`<filter id="fs" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>`;
  d+=`<filter id="fl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  
  ORX.forEach((rx,i)=>{const ry=Math.round(rx*FLAT);d+=`<path id="op${i}" d="${orbitPath(rx,ry,ANGS[i])}" fill="none"/>`;});
  d+='</defs>';return d;
}

function svgBG(){
  return`<rect width="${W}" height="${H}" fill="url(#bgr)"/>
<ellipse cx="${CX-40}" cy="${CY-40}" rx="320" ry="200" fill="url(#nb0)"/>
<ellipse cx="${CX+120}" cy="${CY+80}" rx="280" ry="180" fill="url(#nb1)"/>`;
}

function svgStars(){
  const rng=prng(8888);let s='';
  for(let i=0;i<240;i++){
    const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1),sz=rng()<.08?1.5:rng()<.3?.9:.4;
    const op=(.2+rng()*.6).toFixed(2),dur=(1.5+rng()*5).toFixed(1),beg=(rng()*8).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${sz}" fill="${rng()<.15?'#ffe8cc':'white'}" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;
  }
  return`<g>${s}</g>`;
}

function svgOrbits(){
  return ORX.map((rx,i)=>{
    const ry=Math.round(rx*FLAT),path=orbitPath(rx,ry);
    return`<path d="${path}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.7"><animate attributeName="stroke-opacity" values="0.04;0.1;0.04" dur="${28+i*10}s" repeatCount="indefinite"/></path>`;
  }).join('');
}

function svgBelt(){
  const rng=prng(111),cT=Math.cos(TILT),sT=Math.sin(TILT),bR=98,bRy=Math.round(98*FLAT);let d='';
  for(let i=0;i<100;i++){
    const t=(i/100)*2*Math.PI,jx=(rng()-.5)*8,jy=(rng()-.5)*2,ex=(bR+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);
    d+=`<circle cx="${(CX+ex*cT-ey*sT).toFixed(1)}" cy="${(CY+ex*sT+ey*cT).toFixed(1)}" r="${(.4+rng()*.7).toFixed(1)}" fill="#c8a040" opacity="${(.12+rng()*.35).toFixed(2)}"/>`;
  }
  return`<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="140s" repeatCount="indefinite"/>${d}</g>`;
}

function svgSun(){
  let s='';
  s+=`<circle cx="${CX}" cy="${CY}" r="100" fill="url(#sc1)" filter="url(#fb)"><animate attributeName="r" values="95;110;95" dur="6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="65" fill="url(#sc2)" filter="url(#fm)"><animate attributeName="r" values="60;72;60" dur="4.5s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="42" fill="url(#sc3)" filter="url(#fg)"><animate attributeName="r" values="38;46;38" dur="3s" repeatCount="indefinite"/></circle>`;
  
  s+=`<g opacity="0.12"><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="50s" repeatCount="indefinite"/>`;
  for(let i=0;i<12;i++){
    const a=i*30,rad=a*Math.PI/180;
    const x2=CX+Math.cos(rad)*55,y2=CY+Math.sin(rad)*55,w=i%3===0?2:1;
    s+=`<line x1="${CX}" y1="${CY}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffcc44" stroke-width="${w}" opacity="${i%3===0?0.3:0.15}"/>`;
  }s+=`</g>`;
  
  s+=`<circle cx="${CX}" cy="${CY}" r="22" fill="url(#sb)"><animate attributeName="r" values="21;23;21" dur="3s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="22" fill="none" stroke="rgba(255,180,50,0.2)" stroke-width="0.8"/>`;
  s+=`<path d="M ${CX-8},${CY+5} Q ${CX-3},${CY+12} ${CX+5},${CY+6}" fill="none" stroke="rgba(255,120,0,0.2)" stroke-width="1.5"/>`;
  s+=`<path d="M ${CX+3},${CY-8} Q ${CX+10},${CY-4} ${CX+8},${CY+3}" fill="none" stroke="rgba(255,150,30,0.15)" stroke-width="1.2"/>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="11" fill="url(#sco)"><animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX-3}" cy="${CY-3}" r="5" fill="white" opacity="0.7"><animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite"/></circle>`;
  s+=`<line x1="${CX-45}" y1="${CY+15}" x2="${CX+45}" y2="${CY-15}" stroke="rgba(255,220,150,0.08)" stroke-width="3" filter="url(#fs)"><animate attributeName="opacity" values="0.08;0.15;0.08" dur="4s" repeatCount="indefinite"/></line>`;
  s+=`<path d="M ${CX-18},${CY-12} Q ${CX-28},${CY-30} ${CX-10},${CY-20}" fill="none" stroke="rgba(255,100,20,0.2)" stroke-width="1.5" filter="url(#fs)"><animate attributeName="opacity" values="0.2;0.05;0.2" dur="5s" repeatCount="indefinite"/></path>`;
  s+=`<path d="M ${CX+15},${CY+14} Q ${CX+30},${CY+28} ${CX+20},${CY+8}" fill="none" stroke="rgba(255,120,30,0.18)" stroke-width="1.2" filter="url(#fs)"><animate attributeName="opacity" values="0.18;0.04;0.18" dur="6s" begin="2s" repeatCount="indefinite"/></path>`;
  s+=`<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(80,30,0,0.6)">AT</text>`;
  return s;
}

function svgPlanets(P){
  return P.slice(0,5).map((p,i)=>{
    const rx=ORX[i],ry=Math.round(rx*FLAT),pr=pR(P,i),dur=SPEEDS[i],c=PCOL[i],name=esc(p.name.slice(0,14)),lang=esc(p.lang);
    let body='';
    if(i===0){
      body=`<path d="M ${pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${-pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.3"/><circle r="${pr}" fill="url(#pg${i})"/><path d="M ${-pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.55"/><path d="M ${-pr*1.5},0 A ${pr*1.5},${pr*.25} 0 0,1 ${pr*1.5},0" fill="none" stroke="${c.hi}" stroke-width="1.2" opacity="0.35"/>`;
    }else if(i===1){
      body=`<circle r="${pr}" fill="url(#pg${i})"/><g clip-path="url(#cp${i})"><rect
