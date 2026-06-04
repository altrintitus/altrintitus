'use strict';
const https=require('https'),fs=require('fs');
const USER=process.env.GITHUB_OWNER||'altrin7311',TOKEN=process.env.GITHUB_TOKEN||'';
const W=900,H=600,CX=285,CY=285;
const TILT=-15*Math.PI/180,FLAT=0.26;
const ORX=[92,148,204,256,300];            // wider spacing; inner orbit pushed off the sun
const SPEEDS=[13,19,27,36,47];
const ANGS=[0.5,1.9,3.4,4.7,5.9];          // spread so planets rarely cluster
const PBR=[20,17,15,13,11];
const MAX_TECH_H=560;
const PCOL=[
  {hi:'#FF9DB0',f:'#FF4D6D',dk:'#A01030',g:'#FF5577'},
  {hi:'#7DF0E4',f:'#1FC9B4',dk:'#0A8472',g:'#33D6C2'},
  {hi:'#FFE49A',f:'#FFC107',dk:'#A87C00',g:'#FFD23F'},
  {hi:'#D9B8FF',f:'#9D6CF5',dk:'#5B21B6',g:'#B07AF0'},
  {hi:'#9DC3FF',f:'#3B82F6',dk:'#1D4ED8',g:'#5B9BFF'},
];
const CAT_TINT={
  'Languages':     {f:'rgba(70,140,255,0.10)', s:'rgba(70,140,255,0.28)'},
  'AI & ML':       {f:'rgba(160,80,255,0.10)', s:'rgba(160,80,255,0.28)'},
  'Frameworks':    {f:'rgba(40,210,140,0.10)', s:'rgba(40,210,140,0.28)'},
  'Databases':     {f:'rgba(240,175,40,0.09)', s:'rgba(240,175,40,0.24)'},
  'DevOps & Tools':{f:'rgba(40,200,220,0.09)', s:'rgba(40,200,220,0.24)'},
};
const CAT_LABEL={
  'Languages':'rgba(120,170,255,0.7)','AI & ML':'rgba(190,140,255,0.7)',
  'Frameworks':'rgba(90,225,165,0.7)','Databases':'rgba(245,200,90,0.7)',
  'DevOps & Tools':'rgba(90,215,235,0.7)',
};

function get(u){return new Promise((r,j)=>{const o={headers:{'User-Agent':'galaxy/9','Accept':'application/vnd.github.v3+json',...(TOKEN?{Authorization:`token ${TOKEN}`}:{})}};https.get(u,o,s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>{try{r(JSON.parse(d))}catch(e){j(e)}})}).on('error',j);});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function prng(seed){let s=seed|0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function orbitPt(rx,ry,t){const c=Math.cos(TILT),s=Math.sin(TILT),ex=rx*Math.cos(t),ey=ry*Math.sin(t);return{x:CX+ex*c-ey*s,y:CY+ex*s+ey*c};}
function orbitPath(rx,ry,st=0,n=80){return Array.from({length:n+1},(_,i)=>{const t=st+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t);return`${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`}).join(' ')+' Z';}

const TECH_DB={
  'AI & ML':[['openai','OpenAI'],['langchain','LangChain'],['tensorflow','TensorFlow'],['pytorch','PyTorch'],['hugging','HuggingFace'],['scikit','Scikit-Learn'],['transformers','Transformers'],['llm','LLMs'],['gpt','GPT'],['gemini','Gemini'],['anthropic','Claude'],['pandas','Pandas'],['numpy','NumPy'],['keras','Keras'],['opencv','OpenCV'],['matplotlib','Matplotlib'],['jupyter','Jupyter'],['nltk','NLTK']],
  'Frameworks':[['react','React'],['vue','Vue'],['angular','Angular'],['flask','Flask'],['django','Django'],['fastapi','FastAPI'],['express','Express'],['next','Next.js'],['svelte','Svelte'],['tailwind','Tailwind'],['bootstrap','Bootstrap'],['streamlit','Streamlit'],['gradio','Gradio'],['laravel','Laravel'],['electron','Electron']],
  'Databases':[['postgres','PostgreSQL'],['mysql','MySQL'],['mongodb','MongoDB'],['mongo','MongoDB'],['sqlite','SQLite'],['redis','Redis'],['firebase','Firebase'],['supabase','Supabase'],['prisma','Prisma'],['dynamodb','DynamoDB'],['neo4j','Neo4j']],
  'DevOps & Tools':[['docker','Docker'],['kubernetes','K8s'],['aws','AWS'],['gcp','GCP'],['azure','Azure'],['heroku','Heroku'],['vercel','Vercel'],['netlify','Netlify'],['github.actions','Actions'],['ci/cd','CI/CD'],['terraform','Terraform'],['nginx','Nginx'],['linux','Linux'],['pip','pip'],['selenium','Selenium'],['playwright','Playwright'],['pytest','Pytest'],['vite','Vite'],['graphql','GraphQL'],['celery','Celery'],['poetry','Poetry']],
};

function measureTechH(tech){
  const pw=275,pad=14,badgeH=20,gapX=6,gapY=6,padX=10,charW=5.8;
  let cy=56;
  Object.entries(tech).forEach(([,items])=>{if(!items||!items.length)return;let bx=610+pad,rows=1;items.forEach(it=>{const tw=Math.ceil(it.length*charW)+padX*2;if(bx+tw>610+pw-pad){bx=610+pad;rows++;}bx+=tw+gapX;});cy+=22+rows*(badgeH+gapY)+8+8;});
  return cy;
}

async function fetchData(){
  console.log('🌌 Fetching...');
  const user=await get(`https://api.github.com/users/${USER}`);
  const repos=await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
  const since=new Date(Date.now()-30*864e5).toISOString();
  const nonFork=repos.filter(r=>!r.fork&&!r.archived).sort((a,b)=>(new Date(b.pushed_at)-new Date(a.pushed_at))+(b.stargazers_count-a.stargazers_count)*864e5).slice(0,5);
  const commitData=await Promise.all(nonFork.map(async r=>{
    const c=await get(`https://api.github.com/repos/${USER}/${r.name}/commits?since=${since}&author=${USER}&per_page=100`).catch(()=>[]);
    const a=Array.isArray(c)?c:[];
    return{name:r.name,lang:r.language||'Other',count:a.length,msgs:a.slice(0,3).map(x=>(x.commit?.message||'update').split('\n')[0].slice(0,18)),size:r.size,stars:r.stargazers_count,forks:r.forks_count};
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
  while(measureTechH(techStack)>MAX_TECH_H){
    let longest=null,maxLen=0;
    Object.entries(techStack).forEach(([cat,items])=>{if(items&&items.length>maxLen){maxLen=items.length;longest=cat;}});
    if(longest&&techStack[longest].length>2)techStack[longest].pop();else break;
  }
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
  d+=`<radialGradient id="bgr" cx="32%" cy="48%" r="75%"><stop offset="0%" stop-color="#0e0e26"/><stop offset="60%" stop-color="#070718"/><stop offset="100%" stop-color="#020208"/></radialGradient>`;
  d+=`<radialGradient id="nb0"><stop offset="0%" stop-color="#1c0a36" stop-opacity="0.55"/><stop offset="100%" stop-color="#1c0a36" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="nb1"><stop offset="0%" stop-color="#08183a" stop-opacity="0.45"/><stop offset="100%" stop-color="#08183a" stop-opacity="0"/></radialGradient>`;
  d+=`<radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="rgba(0,0,0,0.45)"/></radialGradient>`;
  d+=`<radialGradient id="sc1"><stop offset="0%" stop-color="#fff4d0" stop-opacity="0.45"/><stop offset="30%" stop-color="#ffaa00" stop-opacity="0.12"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc2"><stop offset="0%" stop-color="#ffcc22" stop-opacity="0.5"/><stop offset="40%" stop-color="#ff7700" stop-opacity="0.15"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sc3"><stop offset="0%" stop-color="#ffdd55" stop-opacity="0.65"/><stop offset="50%" stop-color="#ff8800" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d+=`<radialGradient id="sb" cx="40%" cy="34%" r="60%"><stop offset="0%" stop-color="#ffffff"/><stop offset="12%" stop-color="#fff8d0"/><stop offset="28%" stop-color="#ffcc44"/><stop offset="48%" stop-color="#ff8811"/><stop offset="68%" stop-color="#cc4400"/><stop offset="85%" stop-color="#882200"/><stop offset="100%" stop-color="#331100"/></radialGradient>`;
  d+=`<radialGradient id="sco"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="40%" stop-color="#fff4cc" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffcc44" stop-opacity="0"/></radialGradient>`;
  d+=`<linearGradient id="panelTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(120,170,255,0.18)"/><stop offset="100%" stop-color="rgba(120,170,255,0)"/></linearGradient>`;
  d+=`<linearGradient id="titleUL" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(100,180,255,0)"/><stop offset="50%" stop-color="rgba(120,200,255,0.5)"/><stop offset="100%" stop-color="rgba(100,180,255,0)"/></linearGradient>`;
  P.forEach((p,i)=>{const c=PCOL[i];
    d+=`<radialGradient id="pg${i}" cx="32%" cy="26%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="50%" stop-color="${c.f}"/><stop offset="100%" stop-color="${c.dk}"/></radialGradient>`;
    d+=`<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.6"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></radialGradient>`;
    d+=`<linearGradient id="ct${i}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></linearGradient>`;
    d+=`<clipPath id="cp${i}"><circle r="${pR(P,i)}"/></clipPath>`;
  });
  d+=`<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>`;
  d+=`<filter id="fm" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="10"/></filter>`;
  d+=`<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  d+=`<filter id="fs" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>`;
  ORX.forEach((rx,i)=>{const ry=Math.round(rx*FLAT);d+=`<path id="op${i}" d="${orbitPath(rx,ry,ANGS[i])}" fill="none"/>`;});
  d+='</defs>';return d;
}

function svgBG(){return`<rect width="${W}" height="${H}" fill="url(#bgr)"/><ellipse cx="${CX-40}" cy="${CY-40}" rx="330" ry="210" fill="url(#nb0)"/><ellipse cx="${CX+120}" cy="${CY+80}" rx="290" ry="190" fill="url(#nb1)"/>`;}
function svgStars(){const rng=prng(8888);let s='';for(let i=0;i<250;i++){const x=(rng()*W).toFixed(1),y=(rng()*H).toFixed(1),sz=rng()<.07?1.6:rng()<.3?.9:.45,op=(.18+rng()*.6).toFixed(2),dur=(1.6+rng()*5).toFixed(1),beg=(rng()*8).toFixed(1);s+=`<circle cx="${x}" cy="${y}" r="${sz}" fill="${rng()<.15?'#ffe8cc':'#ffffff'}" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`;}return`<g>${s}</g>`;}
function svgOrbits(){return ORX.map((rx,i)=>{const ry=Math.round(rx*FLAT),path=orbitPath(rx,ry);return`<path d="${path}" fill="none" stroke="rgba(150,180,255,0.07)" stroke-width="0.7"><animate attributeName="stroke-opacity" values="0.045;0.11;0.045" dur="${28+i*10}s" repeatCount="indefinite"/></path>`;}).join('');}
function svgBelt(){const rng=prng(111),cT=Math.cos(TILT),sT=Math.sin(TILT),bR=120,bRy=Math.round(120*FLAT);let d='';for(let i=0;i<100;i++){const t=(i/100)*2*Math.PI,jx=(rng()-.5)*9,jy=(rng()-.5)*2,ex=(bR+jx)*Math.cos(t),ey=(bRy+jy)*Math.sin(t);d+=`<circle cx="${(CX+ex*cT-ey*sT).toFixed(1)}" cy="${(CY+ex*sT+ey*cT).toFixed(1)}" r="${(.4+rng()*.7).toFixed(1)}" fill="#c8a040" opacity="${(.1+rng()*.3).toFixed(2)}"/>`;}return`<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="150s" repeatCount="indefinite"/>${d}</g>`;}

function svgSun(initials){
  let s='';
  s+=`<circle cx="${CX}" cy="${CY}" r="112" fill="url(#sc1)" filter="url(#fb)"><animate attributeName="r" values="106;120;106" dur="7s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.9;0.6" dur="7s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="70" fill="url(#sc2)" filter="url(#fm)"><animate attributeName="r" values="66;78;66" dur="5s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="44" fill="url(#sc3)" filter="url(#fg)"><animate attributeName="r" values="41;49;41" dur="3.5s" repeatCount="indefinite"/></circle>`;
  s+=`<g opacity="0.1"><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="60s" repeatCount="indefinite"/>`;
  for(let i=0;i<16;i++){const a=i*22.5,rad=a*Math.PI/180,len=46+((i%4===0)?12:0),x2=CX+Math.cos(rad)*len,y2=CY+Math.sin(rad)*len;s+=`<line x1="${CX}" y1="${CY}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#ffbb33" stroke-width="${i%4===0?2.5:i%2===0?1.5:0.8}" opacity="${i%4===0?0.3:0.12}"/>`;}
  s+=`</g>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="25" fill="url(#sb)"><animate attributeName="r" values="24;26;24" dur="3s" repeatCount="indefinite"/></circle>`;
  const gran=[[-13,-9,9,'rgba(160,60,0,0.18)'],[-4,-13,7,'rgba(180,80,0,0.14)'],[8,-7,8,'rgba(140,50,0,0.16)'],[11,4,7,'rgba(170,60,0,0.15)'],[-9,8,8,'rgba(150,50,0,0.17)'],[4,11,6,'rgba(160,70,0,0.14)'],[-6,0,7,'rgba(130,40,0,0.12)'],[0,-6,6,'rgba(200,90,0,0.1)'],[13,-4,5,'rgba(180,70,0,0.13)'],[-11,-2,6,'rgba(140,50,0,0.15)'],[6,-11,5,'rgba(170,60,0,0.12)'],[2,8,6,'rgba(150,50,0,0.16)']];
  gran.forEach(([dx,dy,r,col])=>{s+=`<circle cx="${CX+dx}" cy="${CY+dy}" r="${r}" fill="${col}"/>`;});
  s+=`<circle cx="${CX-7}" cy="${CY-7}" r="4" fill="rgba(255,230,150,0.2)"/><circle cx="${CX+6}" cy="${CY+4}" r="3" fill="rgba(255,220,140,0.15)"/><circle cx="${CX-2}" cy="${CY+9}" r="2.5" fill="rgba(255,240,160,0.12)"/>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="25" fill="none" stroke="rgba(255,140,30,0.25)" stroke-width="1.2"/><circle cx="${CX}" cy="${CY}" r="23" fill="none" stroke="rgba(255,180,60,0.12)" stroke-width="0.8"/>`;
  s+=`<path d="M ${CX-19},${CY-13} Q ${CX-33},${CY-36} ${CX-11},${CY-23}" fill="none" stroke="rgba(255,100,20,0.25)" stroke-width="2" filter="url(#fs)"><animate attributeName="opacity" values="0.25;0.06;0.25" dur="5s" repeatCount="indefinite"/></path>`;
  s+=`<path d="M ${CX+17},${CY+15} Q ${CX+35},${CY+33} ${CX+23},${CY+9}" fill="none" stroke="rgba(255,120,30,0.22)" stroke-width="1.8" filter="url(#fs)"><animate attributeName="opacity" values="0.22;0.05;0.22" dur="6.5s" begin="2s" repeatCount="indefinite"/></path>`;
  s+=`<circle cx="${CX}" cy="${CY}" r="13" fill="url(#sco)"><animate attributeName="r" values="12;14;12" dur="2.5s" repeatCount="indefinite"/></circle>`;
  s+=`<circle cx="${CX-3}" cy="${CY-3}" r="5" fill="white" opacity="0.6"><animate attributeName="opacity" values="0.6;0.25;0.6" dur="2s" repeatCount="indefinite"/></circle>`;
  s+=`<line x1="${CX-50}" y1="${CY+16}" x2="${CX+50}" y2="${CY-16}" stroke="rgba(255,220,150,0.07)" stroke-width="3.5" filter="url(#fs)"><animate attributeName="opacity" values="0.07;0.14;0.07" dur="4.5s" repeatCount="indefinite"/></line>`;
  s+=`<text x="${CX}" y="${CY+3.5}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(60,20,0,0.55)">${esc(initials||'AT')}</text>`;
  return s;
}

// label with a dark pill behind it so it stays readable over any planet/sun
function planetLabel(name,lang,pr,color){
  const w=Math.max(name.length*5.4+12, lang.length*4.2+10);
  const y=pr+6;
  let s=`<rect x="${(-w/2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${lang?23:14}" rx="4" fill="rgba(4,5,18,0.62)"/>`;
  s+=`<text y="${y+10}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="600" fill="rgba(255,255,255,0.9)">${name}</text>`;
  if(lang)s+=`<text y="${y+20}" text-anchor="middle" font-family="monospace" font-size="6.5" fill="${color}" opacity="0.85">${lang}</text>`;
  return s;
}

function svgPlanets(P){return P.slice(0,5).map((p,i)=>{
  const pr=pR(P,i),dur=SPEEDS[i],c=PCOL[i],name=esc(p.name.slice(0,14)),lang=esc(p.lang);
  let body='';
  if(i===0){body=`<path d="M ${pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${-pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.3"/><circle r="${pr}" fill="url(#pg${i})"/><path d="M ${-pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.55"/>`;}
  else if(i===1){body=`<circle r="${pr}" fill="url(#pg${i})"/><g clip-path="url(#cp${i})"><rect x="${-pr}" y="${-pr*.45}" width="${pr*2}" height="${pr*.2}" fill="rgba(0,0,0,0.12)"/><rect x="${-pr}" y="${pr*.15}" width="${pr*2}" height="${pr*.25}" fill="rgba(255,255,255,0.06)"/></g>`;}
  else if(i===2){body=`<circle r="${pr}" fill="url(#pg${i})"/><circle cx="${pr*.3}" cy="${pr*.15}" r="${pr*.3}" fill="rgba(180,60,0,0.22)"/>`;}
  else if(i===3){body=`<circle r="${pr+5}" fill="${c.g}" opacity="0.1"><animate attributeName="r" values="${pr+4};${pr+7};${pr+4}" dur="3s" repeatCount="indefinite"/></circle><circle r="${pr}" fill="url(#pg${i})"/>`;}
  else{body=`<circle r="${pr}" fill="url(#pg${i})"/><line x1="${-pr*.3}" y1="${-pr*.6}" x2="${pr*.1}" y2="${-pr*.1}" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/><circle cx="${-pr*.15}" cy="${-pr*.3}" r="${pr*.1}" fill="rgba(255,255,255,0.18)"/>`;}
  let s=`<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
  s+=`<circle r="${pr*3}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.5"/>${body}`;
  s+=`<circle r="${pr*.45}" cx="${-pr*.28}" cy="${-pr*.28}" fill="rgba(255,255,255,0.1)"/>`;
  s+=`<circle r="${pr}" fill="none" stroke="${c.g}" stroke-width="0.7" opacity="0.25"><animate attributeName="r" values="${pr};${pr+2};${pr}" dur="${3+i*.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.25;0.06;0.25" dur="${3+i*.5}s" repeatCount="indefinite"/></circle>`;
  if(p.forks>0){s+=`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${pr+8}" r="2" fill="#99aabb" opacity="0.6"/></g>`;}
  s+=planetLabel(name,lang,pr,c.g);
  return s+'</g>';}).join('');}

// max 4 comets, heavily staggered so ~1-2 visible at once; subtle
function svgComets(P){
  let s='',ci=0;
  P.slice(0,5).forEach((p,pi)=>{
    if(ci>=4||!p.msgs.length)return;
    const rx=ORX[pi],ry=Math.round(rx*FLAT),c=PCOL[pi];
    const msg=p.msgs[0];
    const tp=orbitPt(rx,ry,ANGS[pi]+0.55);
    const sx=Math.max(-30,tp.x-150),sy=Math.max(8,tp.y-48);
    const dur=11+ci*1.5,beg=ci*4;
    s+=`<g opacity="0"><animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M ${sx.toFixed(1)},${sy.toFixed(1)} L ${tp.x.toFixed(1)},${tp.y.toFixed(1)}"/>
<animate attributeName="opacity" values="0;0.75;0.75;0" keyTimes="0;0.07;0.9;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="2.2" fill="${c.g}"/><rect x="-42" y="-1" width="42" height="2.2" fill="url(#ct${pi})" rx="1.1"/>
<text x="5" y="-4" font-family="monospace" font-size="6" fill="${c.g}" opacity="0.55">${esc(msg)}</text></g>`;
    ci++;
  });
  return s;
}

// refined glass panel helper with top highlight + corner ticks
function panel(x,y,w,h,r=10){
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="rgba(8,12,26,0.92)" stroke="rgba(110,160,240,0.18)" stroke-width="0.8"/>`;
  s+=`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="${Math.min(h-2,40)}" rx="${r-1}" fill="url(#panelTop)"/>`;
  const t=9;
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([px,py,sx,sy])=>{
    s+=`<line x1="${px}" y1="${py}" x2="${px+sx*t}" y2="${py}" stroke="rgba(140,190,255,0.5)" stroke-width="1.2"/>`;
    s+=`<line x1="${px}" y1="${py}" x2="${px}" y2="${py+sy*t}" stroke="rgba(140,190,255,0.5)" stroke-width="1.2"/>`;
  });
  return s;
}

function svgHUDLeft(stats){
  const x=16,y=H-148,w=280,h=134;
  let s=panel(x,y,w,h);
  let cy=y+20;
  s+=`<text x="${x+14}" y="${cy}" font-family="monospace" font-size="11.5" font-weight="bold" fill="rgba(232,242,255,0.95)" letter-spacing="0.5">${esc(stats.name)}</text>`;
  s+=`<text x="${x+w-14}" y="${cy}" text-anchor="end" font-family="monospace" font-size="8" fill="rgba(130,170,230,0.55)">@${USER}</text>`;
  cy+=18;s+=`<line x1="${x+12}" y1="${cy}" x2="${x+w-12}" y2="${cy}" stroke="rgba(110,160,240,0.1)" stroke-width="0.5"/>`;cy+=15;
  [['Repos',stats.repos],['Stars',stats.stars],['Since',stats.since]].forEach(([l,v],i)=>{const bx=x+14+i*90;
    s+=`<text x="${bx}" y="${cy}" font-family="monospace" font-size="7.5" fill="rgba(150,180,225,0.55)" letter-spacing="0.5">${l}</text>`;
    s+=`<text x="${bx}" y="${cy+14}" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(225,242,255,0.95)">${v}</text>`;});
  cy+=28;s+=`<line x1="${x+12}" y1="${cy}" x2="${x+w-12}" y2="${cy}" stroke="rgba(110,160,240,0.1)" stroke-width="0.5"/>`;cy+=14;
  s+=`<text x="${x+14}" y="${cy}" font-family="monospace" font-size="8" font-weight="bold" fill="rgba(110,175,255,0.65)" letter-spacing="2">LAST 30 DAYS</text>`;cy+=15;
  [['Commits',stats.commits],['PRs',stats.prs],['Issues',stats.issues]].forEach(([l,v],i)=>{const bx=x+14+i*90;
    s+=`<text x="${bx}" y="${cy}" font-family="monospace" font-size="7.5" fill="rgba(150,180,225,0.55)" letter-spacing="0.5">${l}</text>`;
    s+=`<text x="${bx}" y="${cy+14}" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(225,242,255,0.95)">${v}</text>`;});
  return s;
}

function svgTechStack(tech){
  const px=610,pw=275,pad=14,badgeH=20,gapX=6,gapY=6,padX=10,charW=5.8;
  let cy=16,s='';
  s+=panel(px,cy,pw,32,8);
  s+=`<text x="${px+16}" y="${cy+20}" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(120,185,255,0.85)" letter-spacing="3">TECH STACK</text>`;
  cy+=42;
  Object.entries(tech).forEach(([cat,items])=>{
    if(!items||!items.length)return;
    const tint=CAT_TINT[cat]||{f:'rgba(60,120,220,0.08)',s:'rgba(80,140,255,0.2)'};
    const lcol=CAT_LABEL[cat]||'rgba(140,170,220,0.7)';
    const maxBX=px+pw-pad;
    let simX=px+pad,rows=1;
    items.forEach(it=>{const tw=Math.ceil(it.length*charW)+padX*2;if(simX+tw>maxBX){simX=px+pad;rows++;}simX+=tw+gapX;});
    const labelH=22,cardH=labelH+rows*(badgeH+gapY)+8;
    s+=panel(px,cy,pw,cardH,8);
    s+=`<text x="${px+pad}" y="${cy+16}" font-family="monospace" font-size="8.5" font-weight="600" fill="${lcol}" letter-spacing="1">${esc(cat)}</text>`;
    let bx=px+pad,by=cy+labelH;
    items.forEach(it=>{
      const tw=Math.ceil(it.length*charW)+padX*2;
      if(bx+tw>maxBX){bx=px+pad;by+=badgeH+gapY;}
      s+=`<rect x="${bx}" y="${by}" width="${tw}" height="${badgeH}" rx="5" fill="${tint.f}" stroke="${tint.s}" stroke-width="0.6"/>`;
      s+=`<text x="${bx+tw/2}" y="${by+13.5}" text-anchor="middle" font-family="monospace" font-size="8" fill="rgba(210,228,255,0.9)">${esc(it)}</text>`;
      bx+=tw+gapX;
    });
    cy+=cardH+8;
  });
  return s;
}

function svgTitle(name){
  const first=name?name.split(' ')[0].toUpperCase():USER.toUpperCase();
  const t=`${first}'S GALAXY`;
  return`<text x="${CX}" y="22" text-anchor="middle" font-family="monospace" font-size="15" font-weight="bold" fill="rgba(190,220,255,0.92)" letter-spacing="7">${esc(t)}</text>
<rect x="${CX-118}" y="27" width="236" height="1.4" fill="url(#titleUL)"/>
<text x="${CX}" y="40" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(110,165,225,0.45)" letter-spacing="2.5">LIVE · AUTO-UPDATED DAILY</text>`;
}

async function main(){
  const{commitData,stats,techStack}=await fetchData();
  let initials=USER.substring(0,2).toUpperCase();
  if(stats.name){const p=stats.name.trim().split(/\s+/);initials=p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():p[0].substring(0,2).toUpperCase();}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 ${W} ${H}">
${svgDefs(commitData)}
${svgBG()}
${svgStars()}
${svgOrbits()}
${svgBelt()}
${svgComets(commitData)}
${svgPlanets(commitData)}
${svgSun(initials)}
<rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>
${svgHUDLeft(stats)}
${svgTechStack(techStack)}
${svgTitle(stats.name)}
</svg>`;
  fs.writeFileSync('galaxy.svg',svg,'utf8');
  console.log('✅ Done!');
}
main().catch(e=>{console.error('❌',e.message);process.exit(1);});
