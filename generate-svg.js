'use strict';
const https=require('https'),fs=require('fs');
const USER='altrin7311',TOKEN=process.env.GITHUB_TOKEN||'';
const W=900,H=380,CX=265,CY=200;
const TILT=-15*Math.PI/180,FLAT=0.25;
const ORX=[65,120,175,230,280];
const SPEEDS=[11,17,24,33,44];
const ANGS=[0.4,1.5,2.8,4.0,5.2];
const PRADII_BASE=[18,15,13,11,9];
const PCOL=[
  {hi:'#FF9999',f:'#FF4D4D',dk:'#AA1111',g:'#FF5555'},
  {hi:'#66EDE5',f:'#20C9B0',dk:'#0A8A6E',g:'#30D4C0'},
  {hi:'#FFE88A',f:'#FFC800',dk:'#AA8800',g:'#FFD000'},
  {hi:'#D8B4FE',f:'#A855F7',dk:'#6B21A8',g:'#B06AF0'},
  {hi:'#93C5FD',f:'#3B82F6',dk:'#1E40AF',g:'#5599FF'},
];

function get(u){return new Promise((res,rej)=>{
  const o={headers:{'User-Agent':'galaxy/4','Accept':'application/vnd.github.v3+json',...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};
  https.get(u,o,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}})}).on('error',rej);
});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function prng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function orbitPt(rx,ry,t){const c=Math.cos(TILT),s=Math.sin(TILT),ex=rx*Math.cos(t),ey=ry*Math.sin(t);return{x:CX+ex*c-ey*s,y:CY+ex*s+ey*c};}
function orbitPath(rx,ry,start=0,n=80){return Array.from({length:n+1},(_,i)=>{const t=start+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t);return`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ')+' Z';}

const TECH_DB={
  'AI & ML':[['openai','OpenAI'],['langchain','LangChain'],['tensorflow','TensorFlow'],['pytorch','PyTorch'],['hugging','HuggingFace'],['scikit','Scikit-Learn'],['transformers','Transformers'],['llm','LLMs'],['gpt','GPT'],['gemini','Gemini'],['anthropic','Claude'],['machine.learning','ML'],['deep.learning','DL'],['pandas','Pandas'],['numpy','NumPy'],['keras','Keras'],['opencv','OpenCV'],['matplotlib','Matplotlib'],['seaborn','Seaborn'],['jupyter','Jupyter'],['nltk','NLTK'],['spacy','SpaCy']],
  'Frameworks':[['react','React'],['vue','Vue'],['angular','Angular'],['flask','Flask'],['django','Django'],['fastapi','FastAPI'],['express','Express'],['next','Next.js'],['svelte','Svelte'],['tailwind','Tailwind'],['bootstrap','Bootstrap'],['streamlit','Streamlit'],['gradio','Gradio'],['laravel','Laravel'],['spring','Spring'],['electron','Electron']],
  'Databases':[['postgres','PostgreSQL'],['mysql','MySQL'],['mongodb','MongoDB'],['mongo','MongoDB'],['sqlite','SQLite'],['redis','Redis'],['firebase','Firebase'],['supabase','Supabase'],['prisma','Prisma'],['dynamodb','DynamoDB'],['neo4j','Neo4j'],['elastic','Elasticsearch']],
  'DevOps & Tools':[['docker','Docker'],['kubernetes','K8s'],['aws','AWS'],['gcp','GCP'],['azure','Azure'],['heroku','Heroku'],['vercel','Vercel'],['netlify','Netlify'],['github.actions','Actions'],['ci/cd','CI/CD'],['terraform','Terraform'],['nginx','Nginx'],['linux','Linux'],['pip','pip'],['conda','Conda'],['vscode','VS Code'],['cursor','Cursor'],['postman','Postman'],['selenium','Selenium'],['playwright','Playwright'],['pytest','Pytest'],['jest','Jest'],['webpack','Webpack'],['vite','Vite'],['graphql','GraphQL'],['websocket','WebSockets'],['celery','Celery'],['gunicorn','Gunicorn'],['uvicorn','Uvicorn'],['poetry','Poetry']],
};

async function fetchData(){
  console.log('🌌 Fetching...');
  const user=await get(`https://api.github.com/users/${USER}`);
  const repos=await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
  const since=new Date(Date.now()-30*24*60*60*1000).toISOString();
  const nonFork=repos.filter(r=>!r.fork&&!r.archived).sort((a,b)=>
    (new Date(b.pushed_at).getTime()-new Date(a.pushed_at).getTime())+(b.stargazers_count-a.stargazers_count)*86400000).slice(0,5);

  const commitData=await Promise.all(nonFork.map(async r=>{
    const c=await get(`https://api.github.com/repos/${USER}/${r.name}/commits?since=${since}&author=${USER}&per_page=100`).catch(()=>[]);
    const arr=Array.isArray(c)?c:[];
    return{name:r.name,lang:r.language||'Other',count:arr.length,
      msgs:arr.slice(0,4).map(x=>(x.commit?.message||'update').split('\n')[0].slice(0,22)),
      size:r.size,stars:r.stargazers_count,forks:r.forks_count};
  }));
  commitData.sort((a,b)=>b.count-a.count||b.size-a.size);

  // Fetch all languages
  const allLangs={};
  await Promise.all(repos.slice(0,15).map(async r=>{
    const ls=await get(`https://api.github.com/repos/${USER}/${r.name}/languages`).catch(()=>({}));
    if(ls&&typeof ls==='object')Object.keys(ls).forEach(l=>allLangs[l]=(allLangs[l]||0)+ls[l]);
  }));

  // Fetch READMEs for tech stack detection
  console.log('📄 Scanning READMEs...');
  const readmes=await Promise.all(repos.slice(0,12).map(async r=>{
    const rm=await get(`https://api.github.com/repos/${USER}/${r.name}/readme`).catch(()=>null);
    if(rm&&rm.content)try{return Buffer.from(rm.content,'base64').toString('utf8').toLowerCase();}catch(e){}
    return'';
  }));

  // Build search corpus
  const parts=[];
  repos.forEach(r=>{
    (r.topics||[]).forEach(t=>parts.push(t));
    if(r.description)parts.push(r.description.toLowerCase());
    parts.push(r.name.toLowerCase());
  });
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
  const totalCommits=commitData.reduce((s,r)=>s+r.count,0);
  const events=await get(`https://api.github.com/users/${USER}/events?per_page=100`).catch(()=>[]);
  const thirtyDays=Date.now()-30*24*60*60*1000;
  let prs=0;
  if(Array.isArray(events))prs=events.filter(e=>e.type==='PullRequestEvent'&&e.payload?.action==='closed'&&e.payload?.pull_request?.merged&&new Date(e.created_at).getTime()>thirtyDays).length;

  const stats={repos:user.public_repos,stars:totalStars,followers:user.followers,
    following:user.following,since:new Date(user.created_at).getFullYear(),
    commits:totalCommits,prs,issues:totalIssues,name:user.name||USER};

  console.log('Planets:',commitData.map(r=>`${r.name}(${r.count})`).join(', '));
  console.log('Tech:',JSON.stringify(techStack));
  return{commitData,stats,techStack};
}

function pR(planets,i){
  const maxC=Math.max(...planets.map(p=>p.count>0?p.count:Math.sqrt(p.size/30)),1);
  const v=planets[i].count>0?planets[i].count:Math.sqrt(planets[i].size/30);
  return Math.round(PRADII_BASE[i]*0.5+Math.sqrt(v/maxC)*PRADII_BASE[i]*0.6);
}

function svgDefs(P){
  let d='<defs>';
  d+=`<radialGradient id="bgr" cx="30%" cy="52%" r="75%"><stop offset="0%" stop-color="#0c0c22"/><stop offset="100%" stop-color="#020210"/></radialGradient>`;
  d+=`<radialGradient id="nb0"><stop offset="0%" stop-color="#18082e" stop-opacity="0.55"/><stop offset="100%" stop-color="#18082e" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="nb1"><stop offset="0%" stop-color="#08142e" stop-opacity="0.45"/><stop offset="100%" stop-color="#08142e" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="sg" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff4d0"/><stop offset="45%" stop-color="#ffaa22"/><stop offset="100%" stop-color="#1a0c00"/></radialGradient>`;
  d+=`<radialGradient id="sgl"><stop offset="0%" stop-color="#ffcc44" stop-opacity="0.5"/><stop offset="50%" stop-color="#ff8800" stop-opacity="0.08"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  P.forEach((p,i)=>{const c=PCOL[i];
    d+=`<radialGradient id="pg${i}" cx="32%" cy="26%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="50%" stop-color="${c.f}"/><stop offset="100%" stop-color="${c.dk}"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.6"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></radialGradient>`;
    d+=`<linearGradient id="ct${i}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.95"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></linearGradient>`;
    const r=pR(P,i);d+=`<clipPath id="cp${i}"><circle r="${r}"/></clipPath>`;
  });
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  d+=`<filter id="glo" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  ORX.forEach((rx,i)=>{const ry=Math.round(rx*FLAT);d+=`<path id="op${i}" d="${orbitPath(rx,ry,ANGS[i])}" fill="none"/>`;});
  d+='</defs>';return d;
}

function svgBG(){
  return`<rect width="${W}" height="${H}" fill="url(#bgr)"/>
<ellipse cx="${CX-40}" cy="${CY-40}" rx="300" ry="190" fill="url(#nb0)"/>
<ellipse cx="${CX+100}" cy="${CY+60}" rx="250" ry="170" fill="url(#nb1)"/>`;
}

function svgStars(){
  const rng=prng(8888);let s='';
  for(let i=0;i<200;i++){
    const x=(rng()*(W-280)).toFixed(1),y=(rng()*H).toFixed(1);
    const sz=rng()<0.08?1.5:rng()<0.3?0.9:0.45;
    const op=(0.2+rng()*0.6).toFixed(2);
    const dur=(1.5+rng()*5).toFixed(1),beg=(rng()*8).toFixed(1);
    s+=`<circle cx="${x}" cy="${y}" r="${sz}" fill="${rng()<0.2?'#ffe8cc':'white'}" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;
  }
  return`<g>${s}</g>`;
}

function svgOrbits(){
  return ORX.map((rx,i)=>{const ry=Math.round(rx*FLAT),path=orbitPath(rx,ry);
    return`<path d="${path}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.7"><animate attributeName="stroke-opacity" values="0.04;0.1;0.04" dur="${28+i*10}s" repeatCount="indefinite"/></path>`;}).join('');
}

function svgBelt(){
  const rng=prng(111),cT=Math.cos(TILT),sT=Math.sin(TILT),bR=95,bRy=Math.round(95*FLAT);let d='';
  for(let i=0;i<100;i++){const t=(i/100)*2*Math.PI,jx=(rng()-.5)*8,jy=(rng()-.5)*2;
    const ex=(bR+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);
    d+=`<circle cx="${(CX+ex*cT-ey*sT).toFixed(1)}" cy="${(CY+ex*sT+ey*cT).toFixed(1)}" r="${(.4+rng()*.7).toFixed(1)}" fill="#c8a040" opacity="${(.12+rng()*.35).toFixed(2)}"/>`;}
  return`<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="140s" repeatCount="indefinite"/>${d}</g>`;
}

function svgSun(){
  return`<circle cx="${CX}" cy="${CY}" r="65" fill="url(#sgl)" filter="url(#fb)"><animate attributeName="r" values="60;72;60" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="${CX}" cy="${CY}" r="18" fill="url(#sg)"><animate attributeName="r" values="17;19;17" dur="3.5s" repeatCount="indefinite"/></circle>
<circle cx="${CX-4}" cy="${CY-4}" r="7" fill="rgba(255,255,230,0.12)"/>
<text x="${CX}" y="${CY+4}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#050510">AT</text>`;
}

function svgPlanets(P){
  return P.slice(0,5).map((p,i)=>{
    const rx=ORX[i],ry=Math.round(rx*FLAT),pr=pR(P,i);
    const dur=SPEEDS[i],c=PCOL[i],name=esc(p.name.slice(0,14)),lang=esc(p.lang);
    let body='';
    if(i===0){// RINGED
      body=`<path d="M ${pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${-pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.3"/>
<circle r="${pr}" fill="url(#pg${i})"/>
<path d="M ${-pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.55"/>
<path d="M ${-pr*1.5},0 A ${pr*1.5},${pr*.25} 0 0,1 ${pr*1.5},0" fill="none" stroke="${c.hi}" stroke-width="1.2" opacity="0.35"/>`;
    }else if(i===1){// BANDED
      body=`<circle r="${pr}" fill="url(#pg${i})"/>
<g clip-path="url(#cp${i})"><rect x="${-pr}" y="${-pr*.45}" width="${pr*2}" height="${pr*.2}" fill="rgba(0,0,0,0.12)" rx="1"/>
<rect x="${-pr}" y="${pr*.15}" width="${pr*2}" height="${pr*.25}" fill="rgba(255,255,255,0.06)" rx="1"/>
<rect x="${-pr}" y="${pr*.5}" width="${pr*2}" height="${pr*.18}" fill="rgba(0,0,0,0.1)" rx="1"/></g>`;
    }else if(i===2){// SPOTTED
      body=`<circle r="${pr}" fill="url(#pg${i})"/>
<circle cx="${pr*.3}" cy="${pr*.15}" r="${pr*.3}" fill="rgba(180,60,0,0.22)"/>
<circle cx="${pr*.35}" cy="${pr*.2}" r="${pr*.16}" fill="rgba(220,80,0,0.18)"/>`;
    }else if(i===3){// ATMOSPHERE
      body=`<circle r="${pr+5}" fill="${c.g}" opacity="0.1"><animate attributeName="r" values="${pr+4};${pr+7};${pr+4}" dur="3s" repeatCount="indefinite"/></circle>
<circle r="${pr}" fill="url(#pg${i})"/>
<circle r="${pr}" fill="none" stroke="${c.hi}" stroke-width="1.8" opacity="0.2"/>`;
    }else{// CRYSTAL
      body=`<circle r="${pr}" fill="url(#pg${i})"/>
<line x1="${-pr*.3}" y1="${-pr*.6}" x2="${pr*.1}" y2="${-pr*.1}" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>
<line x1="${pr*.2}" y1="${-pr*.5}" x2="${pr*.5}" y2="${pr*.1}" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>
<circle cx="${-pr*.15}" cy="${-pr*.3}" r="${pr*.1}" fill="rgba(255,255,255,0.18)"/>`;
    }
    let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
    s+=`<circle r="${pr*3}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.5"/>`;
    s+=body;
    s+=`<circle r="${pr*.45}" cx="${-pr*.28}" cy="${-pr*.28}" fill="rgba(255,255,255,0.1)"/>`;
    s+=`<circle r="${pr}" fill="none" stroke="${c.g}" stroke-width="0.7" opacity="0.25"><animate attributeName="r" values="${pr};${pr+2};${pr}" dur="${3+i*.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.25;0.06;0.25" dur="${3+i*.5}s" repeatCount="indefinite"/></circle>`;
    if(p.forks>0){const mo=pr+8;s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${mo}" r="2" fill="#99aabb" opacity="0.6"/></g>`;}
    s+=`<text y="${pr+12}" text-anchor="middle" font-family="monospace" font-size="8" fill="rgba(255,255,255,0.8)">${name}</text>`;
    s+=`<text y="${pr+21}" text-anchor="middle" font-family="monospace" font-size="6" fill="${c.g}" opacity="0.55">${lang}</text>`;
    return s+'</g>';
  }).join('');
}

function svgComets(P){
  let s='',ci=0;
  P.slice(0,5).forEach((p,pi)=>{
    const rx=ORX[pi],ry=Math.round(rx*FLAT),c=PCOL[pi];
    p.msgs.forEach((msg,mi)=>{
      if(ci>=12)return;
      const angle=ANGS[pi]+mi*0.8+0.4;
      const tp=orbitPt(rx,ry,angle);
      const sx=Math.max(-30,tp.x-140-mi*15);
      const sy=Math.max(5,tp.y-35-mi*10);
      const dur=8+ci*0.7;
      const beg=ci*2.5;
      s+=`<g opacity="0">
<animateMotion dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite" rotate="auto" path="M ${sx.toFixed(1)},${sy.toFixed(1)} L ${tp.x.toFixed(1)},${tp.y.toFixed(1)}"/>
<animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.06;0.88;1" dur="${dur.toFixed(1)}s" begin="${beg.toFixed(1)}s" repeatCount="indefinite"/>
<circle r="2.5" fill="${c.g}"/>
<rect x="-44" y="-1.2" width="44" height="2.5" fill="url(#ct${pi})" rx="1.2"/>
<text x="5" y="-4" font-family="monospace" font-size="5.5" fill="${c.g}" opacity="0.8">${esc(msg)}</text>
</g>`;ci++;});
  });
  return s;
}

function svgHUD(stats,tech){
  const px=572,py=10,pw=318,ph=360;
  let s='';
  // Panel
  s+=`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="8" fill="rgba(6,10,22,0.96)" stroke="rgba(80,130,220,0.12)" stroke-width="0.6"/>`;
  // Name area
  s+=`<rect x="${px+1}" y="${py+1}" width="${pw-2}" height="40" rx="7" fill="rgba(50,100,200,0.06)"/>`;
  let cy=py+20;
  s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(230,240,255,0.95)">${esc(stats.name)}</text>`;
  cy+=13;
  s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="7.5" fill="rgba(120,160,220,0.6)">@${USER}  ·  ${stats.followers} followers  ·  ${stats.following} following</text>`;
  cy+=18;
  // Divider
  s+=`<line x1="${px+10}" y1="${cy}" x2="${px+pw-10}" y2="${cy}" stroke="rgba(80,140,220,0.08)" stroke-width="0.5"/>`;
  cy+=14;
  // OVERVIEW
  s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="7.5" font-weight="bold" fill="rgba(100,170,255,0.65)" letter-spacing="1.5">OVERVIEW</text>`;
  cy+=13;
  [['Repos',stats.repos],['Stars',stats.stars],['Active since',stats.since]].forEach(([l,v])=>{
    s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="7.5" fill="rgba(160,190,230,0.6)">${l}</text>`;
    s+=`<text x="${px+pw-14}" y="${cy}" text-anchor="end" font-family="monospace" font-size="7.5" font-weight="bold" fill="rgba(220,240,255,0.9)">${v}</text>`;
    cy+=12;
  });
  cy+=5;
  s+=`<line x1="${px+10}" y1="${cy}" x2="${px+pw-10}" y2="${cy}" stroke="rgba(80,140,220,0.08)" stroke-width="0.5"/>`;
  cy+=12;
  // LAST 30 DAYS
  s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="7.5" font-weight="bold" fill="rgba(100,170,255,0.65)" letter-spacing="1.5">LAST 30 DAYS</text>`;
  cy+=13;
  [['Commits',stats.commits],['PRs merged',stats.prs],['Open issues',stats.issues]].forEach(([l,v])=>{
    s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="7.5" fill="rgba(160,190,230,0.6)">${l}</text>`;
    s+=`<text x="${px+pw-14}" y="${cy}" text-anchor="end" font-family="monospace" font-size="7.5" font-weight="bold" fill="rgba(220,240,255,0.9)">${v}</text>`;
    cy+=12;
  });
  cy+=5;
  s+=`<line x1="${px+10}" y1="${cy}" x2="${px+pw-10}" y2="${cy}" stroke="rgba(80,140,220,0.08)" stroke-width="0.5"/>`;
  cy+=12;
  // TECH STACK
  s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="7.5" font-weight="bold" fill="rgba(100,170,255,0.65)" letter-spacing="1.5">TECH STACK</text>`;
  cy+=6;
  Object.entries(tech).forEach(([cat,items])=>{
    if(!items||items.length===0)return;
    cy+=10;
    s+=`<text x="${px+14}" y="${cy}" font-family="monospace" font-size="6.5" fill="rgba(130,160,210,0.5)">${esc(cat)}</text>`;
    cy+=8;
    let bx=px+14;
    const maxX=px+pw-14;
    items.forEach(item=>{
      const tw=item.length*4.8+10;
      if(bx+tw>maxX){bx=px+14;cy+=17;}
      s+=`<rect x="${bx}" y="${cy}" width="${tw}" height="14" rx="3.5" fill="rgba(60,120,220,0.08)" stroke="rgba(80,140,255,0.18)" stroke-width="0.5"/>`;
      s+=`<text x="${bx+tw/2}" y="${cy+10}" text-anchor="middle" font-family="monospace" font-size="6.5" fill="rgba(180,210,255,0.85)">${esc(item)}</text>`;
      bx+=tw+4;
    });
    cy+=18;
  });
  return s;
}

function svgTitle(){
  return`<text x="${CX}" y="18" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(180,215,255,0.85)" letter-spacing="5">ALTRIN'S GALAXY</text>
<text x="${CX}" y="30" text-anchor="middle" font-family="monospace" font-size="6.5" fill="rgba(100,160,220,0.35)" letter-spacing="2">AUTO-UPDATES DAILY</text>`;
}

function svgLegend(P){
  const lx=12,ly=H-58;
  let s=`<text x="${lx}" y="${ly}" font-family="monospace" font-size="6.5" fill="rgba(150,190,255,0.4)" letter-spacing="1">TOP REPOS</text>`;
  P.slice(0,5).forEach((p,i)=>{
    const c=PCOL[i],y=ly+10+i*9;
    s+=`<circle cx="${lx+4}" cy="${y-2.5}" r="2.5" fill="${c.f}"/>`;
    s+=`<text x="${lx+11}" y="${y}" font-family="monospace" font-size="6" fill="rgba(200,220,255,0.6)">${esc(p.name.slice(0,12))} · ${p.count}</text>`;
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
  console.log('✅ Done!');
}
main().catch(e=>{console.error('❌',e.message);process.exit(1);});
