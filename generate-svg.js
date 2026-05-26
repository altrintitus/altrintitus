'use strict';
const https=require('https'),fs=require('fs');
const USER='altrin7311',TOKEN=process.env.GITHUB_TOKEN||'';
const W=900,H=560,CX=250,CY=280;
const TILT=-15*Math.PI/180,FLAT=0.25;
const ORX=[75,148,221,294,362];
const SPEEDS=[11,17,24,33,44];
const ANGS=[0.4,1.6,3.0,4.2,5.4];
const PBR=[20,17,15,13,10];
const PCOL=[
  {hi:'#FF9999',f:'#FF4D4D',dk:'#AA1111',g:'#FF5555'},
  {hi:'#66EDE5',f:'#20C9B0',dk:'#0A8A6E',g:'#30D4C0'},
  {hi:'#FFE88A',f:'#FFC800',dk:'#AA8800',g:'#FFD000'},
  {hi:'#D8B4FE',f:'#A855F7',dk:'#6B21A8',g:'#B06AF0'},
  {hi:'#93C5FD',f:'#3B82F6',dk:'#1E40AF',g:'#5599FF'},
];

function get(u){return new Promise((r,j)=>{const o={headers:{'User-Agent':'galaxy/6','Accept':'application/vnd.github.v3+json',...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};https.get(u,o,s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>{try{r(JSON.parse(d))}catch(e){j(e)}})}).on('error',j);});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function prng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function orbitPt(rx,ry,t){const c=Math.cos(TILT),s=Math.sin(TILT),ex=rx*Math.cos(t),ey=ry*Math.sin(t);return{x:CX+ex*c-ey*s,y:CY+ex*s+ey*c};}
function orbitPath(rx,ry,st=0,n=80){return Array.from({length:n+1},(_,i)=>{const t=st+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t);return`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ')+' Z';}

const TECH_DB={
  'AI & ML':[['openai','OpenAI'],['langchain','LangChain'],['tensorflow','TensorFlow'],['pytorch','PyTorch'],['hugging','HuggingFace'],['scikit','Scikit-Learn'],['transformers','Transformers'],['llm','LLMs'],['gpt','GPT'],['gemini','Gemini'],['anthropic','Claude'],['pandas','Pandas'],['numpy','NumPy'],['keras','Keras'],['opencv','OpenCV'],['matplotlib','Matplotlib'],['jupyter','Jupyter'],['nltk','NLTK']],
  'Frameworks':[['react','React'],['vue','Vue'],['angular','Angular'],['flask','Flask'],['django','Django'],['fastapi','FastAPI'],['express','Express'],['next','Next.js'],['svelte','Svelte'],['tailwind','Tailwind'],['bootstrap','Bootstrap'],['streamlit','Streamlit'],['gradio','Gradio']],
  'Databases':[['postgres','PostgreSQL'],['mysql','MySQL'],['mongodb','MongoDB'],['mongo','MongoDB'],['sqlite','SQLite'],['redis','Redis'],['firebase','Firebase'],['supabase','Supabase'],['prisma','Prisma']],
  'DevOps & Tools':[['docker','Docker'],['kubernetes','K8s'],['aws','AWS'],['gcp','GCP'],['azure','Azure'],['heroku','Heroku'],['vercel','Vercel'],['netlify','Netlify'],['github.actions','Actions'],['terraform','Terraform'],['selenium','Selenium'],['playwright','Playwright'],['pytest','Pytest'],['vite','Vite'],['graphql','GraphQL'],['celery','Celery'],['poetry','Poetry'],['pip','pip']],
};

async function fetchData(){
  console.log('🌌 Fetching...');
  const user=await get(`https://api.github.com/users/${USER}`);
  const repos=await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
  const since=new Date(Date.now()-30*864e5).toISOString();
  const nonFork=repos.filter(r=>!r.fork&&!r.archived).sort((a,b)=>(new Date(b.pushed_at)-new Date(a.pushed_at))+(b.stargazers_count-a.stargazers_count)*864e5).slice(0,5);
  const commitData=await Promise.all(nonFork.map(async r=>{
    const c=await get(`https://api.github.com/repos/${USER}/${r.name}/commits?since=${since}&author=${USER}&per_page=100`).catch(()=>[]);
    const a=Array.isArray(c)?c:[];
    return{name:r.name,lang:r.language||'Other',count:a.length,
      msgs:a.slice(0,2).map(x=>(x.commit?.message||'update').split('\n')[0].slice(0,15)),
      size:r.size,stars:r.stargazers_count,forks:r.forks_count};
  }));
  commitData.sort((a,b)=>b.count-a.count||b.size-a.size);
  const allLangs={};
  await Promise.all(repos.slice(0,15).map(async r=>{const ls=await get(`https://api.github.com/repos/${USER}/${r.name}/languages`).catch(()=>({}));if(ls&&typeof ls==='object')Object.keys(ls).forEach(l=>allLangs[l]=(allLangs[l]||0)+ls[l]);}));
  console.log('📄 Scanning READMEs...');
  const readmes=await Promise.all(repos.slice(0,12).map(async r=>{const rm=await get(`https://api.github.com/repos/${USER}/${r.name}/readme`).catch(()=>null);if(rm&&rm.content)try{return Buffer.from(rm.content,'base64').toString('utf8').toLowerCase();}catch(e){}return'';}));
  const parts=[];repos.forEach(r=>{(r.topics||[]).forEach(t=>parts.push(t));if(r.description)parts.push(r.description.toLowerCase());parts.push(r.name.toLowerCase());});parts.push(...readmes);
  const corpus=parts.join(' ').replace(/[-_]/g,'.').toLowerCase();
  // Collect all detected tech, then pick top 12
  const allTech=[];
  const langList=Object.entries(allLangs).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,4);
  langList.forEach(l=>allTech.push({cat:'Languages',name:l}));
  Object.entries(TECH_DB).forEach(([cat,pairs])=>{pairs.forEach(([kw,d])=>{if(corpus.includes(kw)&&!allTech.find(t=>t.name===d))allTech.push({cat,name:d});});});
  // Cap at 12 total
  const top12=allTech.slice(0,12);
  const techStack={};
  top12.forEach(t=>{if(!techStack[t.cat])techStack[t.cat]=[];techStack[t.cat].push(t.name);});

  const totalStars=repos.reduce((s,r)=>s+r.stargazers_count,0);
  const totalIssues=repos.reduce((s,r)=>s+r.open_issues_count,0);
  const totalC=commitData.reduce((s,r)=>s+r.count,0);
  const events=await get(`https://api.github.com/users/${USER}/events?per_page=100`).catch(()=>[]);
  let prs=0;if(Array.isArray(events))prs=events.filter(e=>e.type==='PullRequestEvent'&&e.payload?.action==='closed'&&e.payload?.pull_request?.merged&&new Date(e.created_at).getTime()>Date.now()-30*864e5).length;
  const stats={repos:user.public_repos,stars:totalStars,followers:user.followers,following:user.following,since:new Date(user.created_at).getFullYear(),commits:totalC,prs,issues:totalIssues,name:user.name||USER};
  return{commitData,stats,techStack};
}

function pR(P,i){const mx=Math.max(...P.map(p=>p.count>0?p.count:Math.sqrt(p.size/30)),1);const v=P[i].count>0?P[i].count:Math.sqrt(P[i].size/30);return Math.round(PBR[i]*.5+Math.sqrt(v/mx)*PBR[i]*.6);}

function svgDefs(P){
  let d='<defs>';
  d+=`<radialGradient id="bgr" cx="30%" cy="50%" r="72%"><stop offset="0%" stop-color="#0d0d24"/><stop offset="100%" stop-color="#020210"/></radialGradient>`;
  d+=`<radialGradient id="nb0"><stop offset="0%" stop-color="#1a0a30" stop-opacity="0.45"/><stop offset="100%" stop-color="#1a0a30" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="nb1"><stop offset="0%" stop-color="#0a1530" stop-opacity="0.35"/><stop offset="100%" stop-color="#0a1530" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="sc1"><stop offset="0%" stop-color="#fff8e0" stop-opacity="0.5"/><stop offset="40%" stop-color="#ffaa00" stop-opacity="0.1"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc2"><stop offset="0%" stop-color="#ffcc33" stop-opacity="0.5"/><stop offset="50%" stop-color="#ff7700" stop-opacity="0.12"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc3"><stop offset="0%" stop-color="#ffdd66" stop-opacity="0.65"/><stop offset="60%" stop-color="#ff8800" stop-opacity="0.15"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sb" cx="42%" cy="35%" r="58%"><stop offset="0%" stop-color="#ffffff"/><stop offset="25%" stop-color="#fff8d0"/><stop offset="55%" stop-color="#ffaa22"/><stop offset="85%" stop-color="#dd5500"/><stop offset="100%" stop-color="#441100"/></radialGradient>`;
  d+=`<radialGradient id="sco"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="50%" stop-color="#fff4cc" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffcc44" stop-opacity="0"/></radialGradient>`;
  P.forEach((p,i)=>{const c=PCOL[i];
    d+=`<radialGradient id="pg${i}" cx="32%" cy="26%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="50%" stop-color="${c.f}"/><stop offset="100%" stop-color="${c.dk}"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.55"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></radialGradient>`;
    d+=`<linearGradient id="ct${i}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.85"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></linearGradient>`;
    d+=`<clipPath id="cp${i}"><circle r="${pR(P,i)}"/></clipPath>`;
  });
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>`;
  d+=`<filter id="fm" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="10"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  d+=`<filter id="fs" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>`;
  ORX.forEach((rx,i)=>{const ry=Math.round(rx*FLAT);d+=`<path id="op${i}" d="${orbitPath(rx,ry,ANGS[i])}" fill="none"/>`;});
  d+='</defs>';return d;
}

function svgBG(){return`<rect width="${W}" height="${H}" fill="url(#bgr)"/><ellipse cx="${CX-30}" cy="${CY-40}" rx="340" ry="210" fill="url(#nb0)"/><ellipse cx="${CX+140}" cy="${CY+80}" rx="300" ry="190" fill="url(#nb1)"/>`;}

function svgStars(){const rng=prng(8888);let s='';
  for(let i=0;i<260;i++){const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1),sz=rng()<.08?1.5:rng()<.3?.9:.4,op=(.2+rng()*.55).toFixed(2),dur=(1.5+rng()*5).toFixed(1),beg=(rng()*8).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${sz}" fill="${rng()<.15?'#ffe8cc':'white'}" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;}
  return`<g>${s}</g>`;}

function svgOrbits(){return ORX.map((rx,i)=>{const ry=Math.round(rx*FLAT),path=orbitPath(rx,ry);
  return`<path d="${path}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.6"><animate attributeName="stroke-opacity" values="0.03;0.08;0.03" dur="${28+i*10}s" repeatCount="indefinite"/></path>`;}).join('');}

function svgBelt(){const rng=prng(111),cT=Math.cos(TILT),sT=Math.sin(TILT),bR=112,bRy=Math.round(112*FLAT);let d='';
  for(let i=0;i<90;i++){const t=(i/90)*2*Math.PI,jx=(rng()-.5)*8,jy=(rng()-.5)*2,ex=(bR+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);
    d+=`<circle cx="${(CX+ex*cT-ey*sT).toFixed(1)}" cy="${(CY+ex*sT+ey*cT).toFixed(1)}" r="${(.4+rng()*.6).toFixed(1)}" fill="#c8a040" opacity="${(.1+rng()*.25).toFixed(2)}"/>`;}
  return`<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="150s" repeatCount="indefinite"/>${d}</g>`;}

function svgSun(){let s='';
  s+=`<circle cx="${CX}" cy="${CY}" r="100" fill="url(#sc1)" filter="url(#fb)"><animate attributeName="r" values="95;110;95" dur="6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.9;0.6" dur="6s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="62" fill="url(#sc2)" filter="url(#fm)"><animate attributeName="r" values="58;68;58" dur="4.5s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="40" fill="url(#sc3)" filter="url(#fg)"><animate attributeName="r" values="36;44;36" dur="3s" repeatCount="indefinite"/></circle>`;
  s+=`<g opacity="0.1"><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="55s" repeatCount="indefinite"/>`;
  for(let i=0;i<12;i++){const a=i*30,rad=a*Math.PI/180,x2=CX+Math.cos(rad)*52,y2=CY+Math.sin(rad)*52;
    s+=`<line x1="${CX}" y1="${CY}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffcc44" stroke-width="${i%3===0?1.8:.8}" opacity="${i%3===0?.25:.12}"/>`;}
  s+=`</g>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="21" fill="url(#sb)"><animate attributeName="r" values="20;22;20" dur="3s" repeatCount="indefinite"/></circle>`;
  s+=`<path d="M ${CX-8},${CY+5} Q ${CX-3},${CY+12} ${CX+5},${CY+6}" fill="none" stroke="rgba(255,120,0,0.18)" stroke-width="1.2"/>`;
  s+=`<path d="M ${CX+3},${CY-8} Q ${CX+10},${CY-4} ${CX+8},${CY+3}" fill="none" stroke="rgba(255,150,30,0.12)" stroke-width="1"/>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="10" fill="url(#sco)"><animate attributeName="r" values="9;11;9" dur="2s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX-3}" cy="${CY-3}" r="4.5" fill="white" opacity="0.65"><animate attributeName="opacity" values="0.65;0.25;0.65" dur="1.8s" repeatCount="indefinite"/></circle>`;
  s+=`<line x1="${CX-42}" y1="${CY+14}" x2="${CX+42}" y2="${CY-14}" stroke="rgba(255,220,150,0.06)" stroke-width="2.5" filter="url(#fs)"><animate attributeName="opacity" values="0.06;0.12;0.06" dur="4s" repeatCount="indefinite"/></line>`;
  s+=`<path d="M ${CX-17},${CY-11} Q ${CX-26},${CY-28} ${CX-9},${CY-19}" fill="none" stroke="rgba(255,100,20,0.15)" stroke-width="1.2" filter="url(#fs)"><animate attributeName="opacity" values="0.15;0.04;0.15" dur="5s" repeatCount="indefinite"/></path>`;
  s+=`<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(80,30,0,0.55)">AT</text>`;
  return s;}

function svgPlanets(P){return P.slice(0,5).map((p,i)=>{
  const rx=ORX[i],ry=Math.round(rx*FLAT),pr=pR(P,i),dur=SPEEDS[i],c=PCOL[i],name=esc(p.name.slice(0,14)),lang=esc(p.lang);
  let body='';
  if(i===0){body=`<path d="M ${pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${-pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2" opacity="0.3"/><circle r="${pr}" fill="url(#pg${i})"/><path d="M ${-pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2" opacity="0.5"/>`;}
  else if(i===1){body=`<circle r="${pr}" fill="url(#pg${i})"/><g clip-path="url(#cp${i})"><rect x="${-pr}" y="${-pr*.4}" width="${pr*2}" height="${pr*.18}" fill="rgba(0,0,0,0.1)"/><rect x="${-pr}" y="${pr*.2}" width="${pr*2}" height="${pr*.2}" fill="rgba(255,255,255,0.05)"/></g>`;}
  else if(i===2){body=`<circle r="${pr}" fill="url(#pg${i})"/><circle cx="${pr*.3}" cy="${pr*.15}" r="${pr*.28}" fill="rgba(180,60,0,0.2)"/>`;}
  else if(i===3){body=`<circle r="${pr+4}" fill="${c.g}" opacity="0.08"><animate attributeName="r" values="${pr+3};${pr+6};${pr+3}" dur="3s" repeatCount="indefinite"/></circle><circle r="${pr}" fill="url(#pg${i})"/>`;}
  else{body=`<circle r="${pr}" fill="url(#pg${i})"/><line x1="${-pr*.3}" y1="${-pr*.6}" x2="${pr*.1}" y2="${-pr*.1}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><circle cx="${-pr*.15}" cy="${-pr*.3}" r="${pr*.09}" fill="rgba(255,255,255,0.15)"/>`;}
  let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
  s+=`<circle r="${pr*2.8}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.45"/>`;
  s+=body;
  s+=`<circle r="${pr*.42}" cx="${-pr*.26}" cy="${-pr*.26}" fill="rgba(255,255,255,0.09)"/>`;
  if(p.forks>0){s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${pr+7}" r="1.8" fill="#99aabb" opacity="0.55"/></g>`;}
  // Labels: smaller, shifted further below
  s+=`<text y="${pr+18}" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(255,255,255,0.7)">${name}</text>`;
  s+=`<text y="${pr+27}" text-anchor="middle" font-family="monospace" font-size="5.5" fill="${c.g}" opacity="0.45">${lang}</text>`;
  return s+'</g>';}).join('');}

function svgComets(P){let s='',ci=0;
  // MAX 3 comets total
  P.slice(0,5).forEach((p,pi)=>{
    if(ci>=3)return;
    if(p.msgs.length===0)return;
    const rx=ORX[pi],ry=Math.round(rx*FLAT),c=PCOL[pi];
    const msg=p.msgs[0];
    const angle=ANGS[pi]+0.5;
    const tp=orbitPt(rx,ry,angle);
    const sx=Math.max(-30,tp.x-160),sy=Math.max(5,tp.y-45);
    const dur=10+ci*2;const beg=ci*6;
    s+=`<g opacity="0"><animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M ${sx.toFixed(1)},${sy.toFixed(1)} L ${tp.x.toFixed(1)},${tp.y.toFixed(1)}"/>
<animate attributeName="opacity" values="0;0.8;0.8;0" keyTimes="0;0.06;0.88;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="2" fill="${c.g}"/><rect x="-40" y="-1" width="40" height="2" fill="url(#ct${pi})" rx="1"/>
<text x="4" y="-4" font-family="monospace" font-size="5.5" fill="${c.g}" opacity="0.5">${esc(msg)}</text></g>`;
    ci++;
  });
  return s;}

function svgHUDLeft(stats,P){
  const x=14,y=H-185,w=225,h=172;
  // Glassmorphism: very low opacity fill, faint border
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="rgba(6,10,22,0.05)" stroke="rgba(80,130,220,0.08)" stroke-width="0.5"/>`;
  let cy=y+16;
  s+=`<text x="${x+12}" y="${cy}" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(230,240,255,0.88)">${esc(stats.name)}</text>`;
  s+=`<text x="${x+w-12}" y="${cy}" text-anchor="end" font-family="monospace" font-size="7" fill="rgba(120,160,220,0.4)">@${USER}</text>`;
  cy+=14;s+=`<line x1="${x+8}" y1="${cy}" x2="${x+w-8}" y2="${cy}" stroke="rgba(80,140,220,0.06)" stroke-width="0.4"/>`;cy+=14;
  [['Repos',stats.repos],['Stars',stats.stars],['Since',stats.since]].forEach(([l,v],i)=>{
    const bx=x+12+i*72;
    s+=`<text x="${bx}" y="${cy}" font-family="monospace" font-size="6.5" fill="rgba(140,170,220,0.45)">${l}</text>`;
    s+=`<text x="${bx}" y="${cy+11}" font-family="monospace" font-size="9" font-weight="bold" fill="rgba(220,240,255,0.85)">${v}</text>`;
  });
  cy+=24;s+=`<line x1="${x+8}" y1="${cy}" x2="${x+w-8}" y2="${cy}" stroke="rgba(80,140,220,0.06)" stroke-width="0.4"/>`;cy+=12;
  s+=`<text x="${x+12}" y="${cy}" font-family="monospace" font-size="7" font-weight="bold" fill="rgba(100,170,255,0.5)" letter-spacing="1.5">LAST 30 DAYS</text>`;cy+=13;
  [['Commits',stats.commits],['PRs',stats.prs],['Issues',stats.issues]].forEach(([l,v],i)=>{
    const bx=x+12+i*72;
    s+=`<text x="${bx}" y="${cy}" font-family="monospace" font-size="6.5" fill="rgba(140,170,220,0.45)">${l}</text>`;
    s+=`<text x="${bx}" y="${cy+11}" font-family="monospace" font-size="9" font-weight="bold" fill="rgba(220,240,255,0.85)">${v}</text>`;
  });
  cy+=24;s+=`<line x1="${x+8}" y1="${cy}" x2="${x+w-8}" y2="${cy}" stroke="rgba(80,140,220,0.06)" stroke-width="0.4"/>`;cy+=12;
  s+=`<text x="${x+12}" y="${cy}" font-family="monospace" font-size="7" font-weight="bold" fill="rgba(100,170,255,0.5)" letter-spacing="1.5">TOP REPOS</text>`;cy+=10;
  P.slice(0,5).forEach((p,i)=>{
    s+=`<circle cx="${x+18}" cy="${cy+2}" r="3" fill="${PCOL[i].f}" opacity="0.7"/>`;
    s+=`<text x="${x+26}" y="${cy+5}" font-family="monospace" font-size="7" fill="rgba(200,220,255,0.6)">${esc(p.name.slice(0,13))}</text>`;
    s+=`<text x="${x+w-12}" y="${cy+5}" text-anchor="end" font-family="monospace" font-size="7" fill="rgba(200,220,255,0.35)">${p.count}</text>`;
    cy+=11;
  });
  return s;
}

function svgTechStack(tech){
  const px=650,py=14,pw=238;
  // Glassmorphism header
  let s=`<rect x="${px}" y="${py}" width="${pw}" height="26" rx="8" fill="rgba(6,10,22,0.05)" stroke="rgba(80,130,220,0.08)" stroke-width="0.5"/>`;
  s+=`<text x="${px+14}" y="${py+17}" font-family="monospace" font-size="9" font-weight="bold" fill="rgba(100,180,255,0.65)" letter-spacing="2">TECH STACK</text>`;
  let cy=py+36;
  // No inner boxes — just categories flowing openly
  Object.entries(tech).forEach(([cat,items])=>{
    if(!items||items.length===0)return;
    s+=`<text x="${px+10}" y="${cy}" font-family="monospace" font-size="6.5" fill="rgba(130,160,210,0.4)">${esc(cat)}</text>`;
    cy+=10;
    let bx=px+10;
    items.forEach(item=>{
      const tw=item.length*5.2+10;
      if(bx+tw>px+pw-10){bx=px+10;cy+=20;}
      s+=`<rect x="${bx}" y="${cy}" width="${tw}" height="16" rx="4" fill="rgba(60,120,220,0.06)" stroke="rgba(80,140,255,0.12)" stroke-width="0.4"/>`;
      s+=`<text x="${bx+tw/2}" y="${cy+11}" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(180,210,255,0.82)">${esc(item)}</text>`;
      bx+=tw+4;
    });
    cy+=24;
  });
  return s;
}

function svgTitle(){
  return`<text x="${CX}" y="22" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="rgba(180,215,255,0.82)" letter-spacing="6">ALTRIN'S GALAXY</text>
<text x="${CX}" y="36" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(100,160,220,0.3)" letter-spacing="2">AUTO-UPDATES DAILY</text>`;}

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
