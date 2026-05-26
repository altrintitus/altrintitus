'use strict';
const https=require('https'),fs=require('fs');
const USER='altrin7311',TOKEN=process.env.GITHUB_TOKEN||'';
const W=900,H=600,CX=310,CY=280;
const TILT=-15*Math.PI/180,FLAT=0.25;
const ORX=[70,125,180,235,285];
const SPEEDS=[11,17,24,33,44];
const ANGS=[0.4,1.5,2.8,4.0,5.2];
const PBR=[22,18,16,14,11];
const PCOL=[
  {hi:'#FF9999',f:'#FF4D4D',dk:'#AA1111',g:'#FF5555'},
  {hi:'#66EDE5',f:'#20C9B0',dk:'#0A8A6E',g:'#30D4C0'},
  {hi:'#FFE88A',f:'#FFC800',dk:'#AA8800',g:'#FFD000'},
  {hi:'#D8B4FE',f:'#A855F7',dk:'#6B21A8',g:'#B06AF0'},
  {hi:'#93C5FD',f:'#3B82F6',dk:'#1E40AF',g:'#5599FF'},
];

function get(u){return new Promise((r,j)=>{const o={headers:{'User-Agent':'galaxy/5','Accept':'application/vnd.github.v3+json',...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};https.get(u,o,s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>{try{r(JSON.parse(d))}catch(e){j(e)}})}).on('error',j);});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function prng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function orbitPt(rx,ry,t){const c=Math.cos(TILT),s=Math.sin(TILT),ex=rx*Math.cos(t),ey=ry*Math.sin(t);return{x:CX+ex*c-ey*s,y:CY+ex*s+ey*c};}
function orbitPath(rx,ry,st=0,n=80){return Array.from({length:n+1},(_,i)=>{const t=st+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t);return`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ')+' Z';}

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
  await Promise.all(repos.slice(0,15).map(async r=>{const ls=await get(`https://api.github.com/repos/${USER}/${r.name}/languages`).catch(()=>({}));if(ls&&typeof ls==='object')Object.keys(ls).forEach(l=>allLangs[l]=(allLangs[l]||0)+ls[l]);}));
  console.log('📄 Scanning READMEs...');
  const readmes=await Promise.all(repos.slice(0,12).map(async r=>{const rm=await get(`https://api.github.com/repos/${USER}/${r.name}/readme`).catch(()=>null);if(rm&&rm.content)try{return Buffer.from(rm.content,'base64').toString('utf8').toLowerCase();}catch(e){}return'';}));
  const parts=[];repos.forEach(r=>{(r.topics||[]).forEach(t=>parts.push(t));if(r.description)parts.push(r.description.toLowerCase());parts.push(r.name.toLowerCase());});parts.push(...readmes);
  const corpus=parts.join(' ').replace(/[-_]/g,'.').toLowerCase();
  const techStack={};
  techStack['Languages']=Object.entries(allLangs).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,8);
  Object.entries(TECH_DB).forEach(([cat,pairs])=>{const found=pairs.filter(([kw])=>corpus.includes(kw)).map(([,d])=>d);if(found.length>0)techStack[cat]=[...new Set(found)].slice(0,10);});
  const totalStars=repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalIssues=repos.reduce((s,r)=>s+r.open_issues_count,0);
  const totalC=commitData.reduce((s,r)=>s+r.count,0);
  const events=await get(`https://api.github.com/users/${USER}/events?per_page=100`).catch(()=>[]);
  const td=Date.now()-30*864e5;
  let prs=0;if(Array.isArray(events))prs=events.filter(e=>e.type==='PullRequestEvent'&&e.payload?.action==='closed'&&e.payload?.pull_request?.merged&&new Date(e.created_at).getTime()>td).length;
  const stats={repos:user.public_repos,stars:totalStars,followers:user.followers,following:user.following,since:new Date(user.created_at).getFullYear(),commits:totalC,prs,issues:totalIssues,name:user.name||USER};
  console.log('Planets:',commitData.map(r=>`${r.name}(${r.count})`).join(', '));
  return{commitData,stats,techStack};
}

function pR(P,i){const mx=Math.max(...P.map(p=>p.count>0?p.count:Math.sqrt(p.size/30)),1);const v=P[i].count>0?P[i].count:Math.sqrt(P[i].size/30);return Math.round(PBR[i]*.5+Math.sqrt(v/mx)*PBR[i]*.6);}

function svgDefs(P){
  let d='<defs>';
  d+=`<radialGradient id="bgr" cx="35%" cy="50%" r="70%"><stop offset="0%" stop-color="#0d0d24"/><stop offset="100%" stop-color="#020210"/></radialGradient>`;
  d+=`<radialGradient id="nb0"><stop offset="0%" stop-color="#1a0a30" stop-opacity="0.5"/><stop offset="100%" stop-color="#1a0a30" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="nb1"><stop offset="0%" stop-color="#0a1530" stop-opacity="0.4"/><stop offset="100%" stop-color="#0a1530" stop-opacity="0"/></radialGradient>`;
  // SUN GRADIENTS - multiple layers
  d+=`<radialGradient id="sc1"><stop offset="0%" stop-color="#fff8e0" stop-opacity="0.5"/><stop offset="40%" stop-color="#ffaa00" stop-opacity="0.12"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc2"><stop offset="0%" stop-color="#ffcc33" stop-opacity="0.55"/><stop offset="50%" stop-color="#ff7700" stop-opacity="0.15"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc3"><stop offset="0%" stop-color="#ffdd66" stop-opacity="0.7"/><stop offset="60%" stop-color="#ff8800" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sb" cx="42%" cy="35%" r="58%"><stop offset="0%" stop-color="#ffffff"/><stop offset="25%" stop-color="#fff8d0"/><stop offset="55%" stop-color="#ffaa22"/><stop offset="85%" stop-color="#dd5500"/><stop offset="100%" stop-color="#441100"/></radialGradient>`;
  d+=`<radialGradient id="sco"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="50%" stop-color="#fff4cc" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffcc44" stop-opacity="0"/></radialGradient>`;
  // Planet stuff
  P.forEach((p,i)=>{const c=PCOL[i];
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

function svgStars(){const rng=prng(8888);let s='';
  for(let i=0;i<240;i++){const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1),sz=rng()<.08?1.5:rng()<.3?.9:.4,op=(.2+rng()*.6).toFixed(2),dur=(1.5+rng()*5).toFixed(1),beg=(rng()*8).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${sz}" fill="${rng()<.15?'#ffe8cc':'white'}" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;}
  return`<g>${s}</g>`;}

function svgOrbits(){return ORX.map((rx,i)=>{const ry=Math.round(rx*FLAT),path=orbitPath(rx,ry);
  return`<path d="${path}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.7"><animate attributeName="stroke-opacity" values="0.04;0.1;0.04" dur="${28+i*10}s" repeatCount="indefinite"/></path>`;}).join('');}

function svgBelt(){const rng=prng(111),cT=Math.cos(TILT),sT=Math.sin(TILT),bR=98,bRy=Math.round(98*FLAT);let d='';
  for(let i=0;i<100;i++){const t=(i/100)*2*Math.PI,jx=(rng()-.5)*8,jy=(rng()-.5)*2,ex=(bR+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);
    d+=`<circle cx="${(CX+ex*cT-ey*sT).toFixed(1)}" cy="${(CY+ex*sT+ey*cT).toFixed(1)}" r="${(.4+rng()*.7).toFixed(1)}" fill="#c8a040" opacity="${(.12+rng()*.35).toFixed(2)}"/>`;}
  return`<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="140s" repeatCount="indefinite"/>${d}</g>`;}

function svgSun(){
  // Multi-layer glowing sun
  let s='';
  // Layer 1: outermost corona haze
  s+=`<circle cx="${CX}" cy="${CY}" r="100" fill="url(#sc1)" filter="url(#fb)"><animate attributeName="r" values="95;110;95" dur="6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite"/></circle>`;
  // Layer 2: mid corona
  s+=`<circle cx="${CX}" cy="${CY}" r="65" fill="url(#sc2)" filter="url(#fm)"><animate attributeName="r" values="60;72;60" dur="4.5s" repeatCount="indefinite"/></circle>`;
  // Layer 3: inner corona
  s+=`<circle cx="${CX}" cy="${CY}" r="42" fill="url(#sc3)" filter="url(#fg)"><animate attributeName="r" values="38;46;38" dur="3s" repeatCount="indefinite"/></circle>`;
  // Solar rays (rotating slowly)
  s+=`<g opacity="0.12"><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="50s" repeatCount="indefinite"/>`;
  for(let i=0;i<12;i++){const a=i*30,rad=a*Math.PI/180;
    const x2=CX+Math.cos(rad)*55,y2=CY+Math.sin(rad)*55;
    const w=i%3===0?2:1;
    s+=`<line x1="${CX}" y1="${CY}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffcc44" stroke-width="${w}" opacity="${i%3===0?0.3:0.15}"/>`;
  }s+=`</g>`;
  // Sun body
  s+=`<circle cx="${CX}" cy="${CY}" r="22" fill="url(#sb)"><animate attributeName="r" values="21;23;21" dur="3s" repeatCount="indefinite"/></circle>`;
  // Surface detail arcs
  s+=`<circle cx="${CX}" cy="${CY}" r="22" fill="none" stroke="rgba(255,180,50,0.2)" stroke-width="0.8"/>`;
  s+=`<path d="M ${CX-8},${CY+5} Q ${CX-3},${CY+12} ${CX+5},${CY+6}" fill="none" stroke="rgba(255,120,0,0.2)" stroke-width="1.5"/>`;
  s+=`<path d="M ${CX+3},${CY-8} Q ${CX+10},${CY-4} ${CX+8},${CY+3}" fill="none" stroke="rgba(255,150,30,0.15)" stroke-width="1.2"/>`;
  // Hot white core
  s+=`<circle cx="${CX}" cy="${CY}" r="11" fill="url(#sco)"><animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite"/></circle>`;
  // Brightest center point
  s+=`<circle cx="${CX-3}" cy="${CY-3}" r="5" fill="white" opacity="0.7"><animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite"/></circle>`;
  // Lens flare streak
  s+=`<line x1="${CX-45}" y1="${CY+15}" x2="${CX+45}" y2="${CY-15}" stroke="rgba(255,220,150,0.08)" stroke-width="3" filter="url(#fs)"><animate attributeName="opacity" values="0.08;0.15;0.08" dur="4s" repeatCount="indefinite"/></line>`;
  // Solar prominences (arcs)
  s+=`<path d="M ${CX-18},${CY-12} Q ${CX-28},${CY-30} ${CX-10},${CY-20}" fill="none" stroke="rgba(255,100,20,0.2)" stroke-width="1.5" filter="url(#fs)"><animate attributeName="opacity" values="0.2;0.05;0.2" dur="5s" repeatCount="indefinite"/></path>`;
  s+=`<path d="M ${CX+15},${CY+14} Q ${CX+30},${CY+28} ${CX+20},${CY+8}" fill="none" stroke="rgba(255,120,30,0.18)" stroke-width="1.2" filter="url(#fs)"><animate attributeName="opacity" values="0.18;0.04;0.18" dur="6s" begin="2s" repeatCount="indefinite"/></path>`;
  // AT label inside
  s+=`<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(80,30,0,0.6)">AT</text>`;
  return s;
}

function svgPlanets(P){return P.slice(0,5).map((p,i)=>{
  const rx=ORX[i],ry=Math.round(rx*FLAT),pr=pR(P,i),dur=SPEEDS[i],c=PCOL[i],name=esc(p.name.slice(0,14)),lang=esc(p.lang);
  let body='';
  if(i===0){body=`<path d="M ${pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${-pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.3"/><circle r="${pr}" fill="url(#pg${i})"/><path d="M ${-pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.55"/><path d="M ${-pr*1.5},0 A ${pr*1.5},${pr*.25} 0 0,1 ${pr*1.5},0" fill="none" stroke="${c.hi}" stroke-width="1.2" opacity="0.35"/>`;
  }else if(i===1){body=`<circle r="${pr}" fill="url(#pg${i})"/><g clip-path="url(#cp${i})"><rect x="${-pr}" y="${-pr*.45}" width="${pr*2}" height="${pr*.2}" fill="rgba(0,0,0,0.12)" rx="1"/><rect x="${-pr}" y="${pr*.15}" width="${pr*2}" height="${pr*.25}" fill="rgba(255,255,255,0.06)" rx="1"/><rect x="${-pr}" y="${pr*.5}" width="${pr*2}" height="${pr*.18}" fill="rgba(0,0,0,0.1)" rx="1"/></g>`;
  }else if(i===2){body=`<circle r="${pr}" fill="url(#pg${i})"/><circle cx="${pr*.3}" cy="${pr*.15}" r="${pr*.3}" fill="rgba(180,60,0,0.22)"/><circle cx="${pr*.35}" cy="${pr*.2}" r="${pr*.16}" fill="rgba(220,80,0,0.18)"/>`;
  }else if(i===3){body=`<circle r="${pr+5}" fill="${c.g}" opacity="0.1"><animate attributeName="r" values="${pr+4};${pr+7};${pr+4}" dur="3s" repeatCount="indefinite"/></circle><circle r="${pr}" fill="url(#pg${i})"/><circle r="${pr}" fill="none" stroke="${c.hi}" stroke-width="1.8" opacity="0.2"/>`;
  }else{body=`<circle r="${pr}" fill="url(#pg${i})"/><line x1="${-pr*.3}" y1="${-pr*.6}" x2="${pr*.1}" y2="${-pr*.1}" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/><line x1="${pr*.2}" y1="${-pr*.5}" x2="${pr*.5}" y2="${pr*.1}" stroke="rgba(255,255,255,0.16)" stroke-width="1"/><circle cx="${-pr*.15}" cy="${-pr*.3}" r="${pr*.1}" fill="rgba(255,255,255,0.18)"/>`;}
  let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
  s+=`<circle r="${pr*3}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.5"/>`;
  s+=body;
  s+=`<circle r="${pr*.45}" cx="${-pr*.28}" cy="${-pr*.28}" fill="rgba(255,255,255,0.1)"/>`;
  s+=`<circle r="${pr}" fill="none" stroke="${c.g}" stroke-width="0.7" opacity="0.25"><animate attributeName="r" values="${pr};${pr+2};${pr}" dur="${3+i*.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.25;0.06;0.25" dur="${3+i*.5}s" repeatCount="indefinite"/></circle>`;
  if(p.forks>0){s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${pr+8}" r="2" fill="#99aabb" opacity="0.6"/></g>`;}
  s+=`<text y="${pr+13}" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.82)">${name}</text>`;
  s+=`<text y="${pr+23}" text-anchor="middle" font-family="monospace" font-size="7" fill="${c.g}" opacity="0.55">${lang}</text>`;
  return s+'</g>';}).join('');}

function svgComets(P){let s='',ci=0;
  P.slice(0,5).forEach((p,pi)=>{const rx=ORX[pi],ry=Math.round(rx*FLAT),c=PCOL[pi];
    p.msgs.forEach((msg,mi)=>{if(ci>=12)return;const angle=ANGS[pi]+mi*.8+.4,tp=orbitPt(rx,ry,angle);
      const sx=Math.max(-30,tp.x-140-mi*15),sy=Math.max(5,tp.y-35-mi*10),dur=8+ci*.7,beg=ci*2.5;
      s+=`<g opacity="0"><animateMotion dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite" rotate="auto" path="M ${sx.toFixed(1)},${sy.toFixed(1)} L ${tp.x.toFixed(1)},${tp.y.toFixed(1)}"/>
<animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.06;0.88;1" dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite"/>
<circle r="2.5" fill="${c.g}"/><rect x="-44" y="-1.2" width="44" height="2.5" fill="url(#ct${pi})" rx="1.2"/>
<text x="5" y="-4" font-family="monospace" font-size="6.5" fill="${c.g}" opacity="0.8">${esc(msg)}</text></g>`;ci++;});});
  return s;}

function svgHUDLeft(stats,P){
  const x=14,y=H-195,w=240,h=182;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="rgba(6,10,22,0.94)" stroke="rgba(80,130,220,0.12)" stroke-width="0.6"/>`;
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="28" rx="7" fill="rgba(50,100,200,0.05)"/>`;
  let cy=y+18;
  s+=`<text x="${x+12}" y="${cy}" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(230,240,255,0.92)">${esc(stats.name)}</text>`;
  s+=`<text x="${x+w-12}" y="${cy}" text-anchor="end" font-family="monospace" font-size="7.5" fill="rgba(120,160,220,0.5)">@${USER}</text>`;
  cy+=17;s+=`<line x1="${x+8}" y1="${cy}" x2="${x+w-8}" y2="${cy}" stroke="rgba(80,140,220,0.08)" stroke-width="0.5"/>`;cy+=14;
  // Stats row compact
  const statItems=[['Repos',stats.repos],['Stars',stats.stars],['Since',stats.since]];
  statItems.forEach(([l,v],i)=>{
    const bx=x+12+i*78;
    s+=`<text x="${bx}" y="${cy}" font-family="monospace" font-size="7" fill="rgba(140,170,220,0.5)">${l}</text>`;
    s+=`<text x="${bx}" y="${cy+12}" font-family="monospace" font-size="9" font-weight="bold" fill="rgba(220,240,255,0.9)">${v}</text>`;
  });
  cy+=26;s+=`<line x1="${x+8}" y1="${cy}" x2="${x+w-8}" y2="${cy}" stroke="rgba(80,140,220,0.08)" stroke-width="0.5"/>`;cy+=13;
  // Last 30 days compact
  s+=`<text x="${x+12}" y="${cy}" font-family="monospace" font-size="7.5" font-weight="bold" fill="rgba(100,170,255,0.6)" letter-spacing="1.5">LAST 30 DAYS</text>`;cy+=14;
  [['Commits',stats.commits],['PRs',stats.prs],['Issues',stats.issues]].forEach(([l,v],i)=>{
    const bx=x+12+i*78;
    s+=`<text x="${bx}" y="${cy}" font-family="monospace" font-size="7" fill="rgba(140,170,220,0.5)">${l}</text>`;
    s+=`<text x="${bx}" y="${cy+12}" font-family="monospace" font-size="9" font-weight="bold" fill="rgba(220,240,255,0.9)">${v}</text>`;
  });
  cy+=26;s+=`<line x1="${x+8}" y1="${cy}" x2="${x+w-8}" y2="${cy}" stroke="rgba(80,140,220,0.08)" stroke-width="0.5"/>`;cy+=13;
  // Top repos
  s+=`<text x="${x+12}" y="${cy}" font-family="monospace" font-size="7.5" font-weight="bold" fill="rgba(100,170,255,0.6)" letter-spacing="1.5">TOP REPOS</text>`;cy+=11;
  P.slice(0,5).forEach((p,i)=>{const c=PCOL[i];
    s+=`<circle cx="${x+18}" cy="${cy+3}" r="3.5" fill="${c.f}"/>`;
    s+=`<text x="${x+27}" y="${cy+6}" font-family="monospace" font-size="7.5" fill="rgba(200,220,255,0.7)">${esc(p.name.slice(0,14))}</text>`;
    s+=`<text x="${x+w-12}" y="${cy+6}" text-anchor="end" font-family="monospace" font-size="7.5" fill="rgba(200,220,255,0.4)">${p.count}</text>`;
    cy+=12;
  });
  return s;
}

function svgTechStack(tech){
  const px=640,py=14,pw=248;
  let s='',cy=py;
  // Panel header
  s+=`<rect x="${px}" y="${py}" width="${pw}" height="28" rx="8" fill="rgba(6,10,22,0.94)" stroke="rgba(80,130,220,0.12)" stroke-width="0.6"/>`;
  s+=`<text x="${px+14}" y="${py+18}" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(100,180,255,0.75)" letter-spacing="2">TECH STACK</text>`;
  cy+=36;
  // Each category in its own mini card
  Object.entries(tech).forEach(([cat,items])=>{
    if(!items||items.length===0)return;
    // Category card
    const cardStart=cy;
    let bx=px+12,tempCy=cy+22;
    // Pre-calculate height
    let calcBx=px+12,calcCy=22;
    items.forEach(item=>{const tw=item.length*5.5+12;if(calcBx+tw>px+pw-12){calcBx=px+12;calcCy+=21;}calcBx+=tw+4;});
    const cardH=calcCy+10;
    s+=`<rect x="${px}" y="${cy}" width="${pw}" height="${cardH}" rx="6" fill="rgba(6,10,22,0.94)" stroke="rgba(80,130,220,0.1)" stroke-width="0.5"/>`;
    s+=`<text x="${px+12}" y="${cy+14}" font-family="monospace" font-size="7.5" fill="rgba(130,160,210,0.55)">${esc(cat)}</text>`;
    // Badges
    items.forEach(item=>{
      const tw=item.length*5.5+12;
      if(bx+tw>px+pw-12){bx=px+12;tempCy+=21;}
      s+=`<rect x="${bx}" y="${tempCy}" width="${tw}" height="17" rx="4" fill="rgba(60,120,220,0.07)" stroke="rgba(80,140,255,0.18)" stroke-width="0.5"/>`;
      s+=`<text x="${bx+tw/2}" y="${tempCy+12}" text-anchor="middle" font-family="monospace" font-size="7.5" fill="rgba(180,210,255,0.88)">${esc(item)}</text>`;
      bx+=tw+4;
    });
    cy+=cardH+4;bx=px+12;
  });
  return s;
}

function svgTitle(){
  return`<text x="${CX}" y="22" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="rgba(180,215,255,0.85)" letter-spacing="6">ALTRIN'S GALAXY</text>
<text x="${CX}" y="36" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(100,160,220,0.35)" letter-spacing="2">AUTO-UPDATES DAILY</text>`;
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
${svgHUDLeft(stats,commitData)}
${svgTechStack(techStack)}
${svgTitle()}
</svg>`;
  fs.writeFileSync('galaxy.svg',svg,'utf8');
  console.log('✅ Done!');
}
main().catch(e=>{console.error('❌',e.message);process.exit(1);});
