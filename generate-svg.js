'use strict';
/* ──────────────────────────────────────────────────────────────
   GITHUB GALAXY · auto-updating profile README SVG
   Zero dependencies. Run by GitHub Actions daily:
     GITHUB_OWNER=<user> GITHUB_TOKEN=<token> node generate-svg.js
   Output: galaxy.svg  (embed in README via <img src="galaxy.svg">)
   v11 · AI-engineer tech radar: 'LLM & Agents' category, wider
   detection corpus, and PINNED_TECH for always-on core skills.
   ────────────────────────────────────────────────────────────── */
const https = require('https'), fs = require('fs');
const USER  = process.env.GITHUB_OWNER || 'altrintitus';
const TOKEN = process.env.GITHUB_TOKEN || '';

/* ── canvas & orbital geometry ─────────────────────────────── */
const W = 900, H = 600, CX = 285, CY = 285;
const TILT = -15 * Math.PI / 180, FLAT = 0.26;
const ORX    = [92, 148, 204, 256, 300];   // orbit radii (wide-spaced)
const SPEEDS = [13, 19, 27, 36, 47];       // orbital period (s)
const ANGS   = [0.5, 1.9, 3.4, 4.7, 5.9];  // start angles, spread out
const PBR    = [20, 17, 15, 13, 11];       // base planet radii

/* ── palettes ──────────────────────────────────────────────── */
const PCOL = [
  { hi:'#FF9DB0', f:'#FF4D6D', dk:'#A01030', g:'#FF5577' },
  { hi:'#7DF0E4', f:'#1FC9B4', dk:'#0A8472', g:'#33D6C2' },
  { hi:'#FFE49A', f:'#FFC107', dk:'#A87C00', g:'#FFD23F' },
  { hi:'#D9B8FF', f:'#9D6CF5', dk:'#5B21B6', g:'#B07AF0' },
  { hi:'#9DC3FF', f:'#3B82F6', dk:'#1D4ED8', g:'#5B9BFF' },
];
const CAT_TINT = {
  'Languages':      { f:'rgba(70,140,255,0.10)',  s:'rgba(70,140,255,0.28)'  },
  'LLM & Agents':   { f:'rgba(255,105,180,0.10)', s:'rgba(255,105,180,0.26)' },
  'AI & ML':        { f:'rgba(160,80,255,0.10)',  s:'rgba(160,80,255,0.28)'  },
  'Frameworks':     { f:'rgba(40,210,140,0.10)',  s:'rgba(40,210,140,0.28)'  },
  'Databases':      { f:'rgba(240,175,40,0.09)',  s:'rgba(240,175,40,0.24)'  },
  'DevOps & Tools': { f:'rgba(40,200,220,0.09)',  s:'rgba(40,200,220,0.24)'  },
};
const CAT_LABEL = {
  'Languages':'rgba(120,170,255,0.7)', 'LLM & Agents':'rgba(255,150,205,0.75)',
  'AI & ML':'rgba(190,140,255,0.7)',
  'Frameworks':'rgba(90,225,165,0.7)', 'Databases':'rgba(245,200,90,0.7)',
  'DevOps & Tools':'rgba(90,215,235,0.7)',
};
/* official GitHub language dot colors (subset; falls back to grey) */
const LANG_DOT = {
  Python:'#3572A5', TypeScript:'#3178C6', JavaScript:'#F1E05A', HTML:'#E34C26',
  CSS:'#663399', C:'#555555', 'C++':'#F34B7D', Cython:'#FEDF5B', XSLT:'#EB8CEB',
  Rust:'#DEA584', Go:'#00ADD8', Java:'#B07219', Shell:'#89E051', Ruby:'#701516',
  Kotlin:'#A97BFF', Swift:'#F05138', PHP:'#4F5D95', 'Jupyter Notebook':'#DA5B0B',
};

/* ── tech detection corpus ─────────────────────────────────── */
/* Keywords are matched against topics + descriptions + repo
   names + READMEs, lowercased with [-_ whitespace] → '.', so
   multi-word phrases are written 'multi.agent', 'github.actions'. */
const TECH_DB = {
  'LLM & Agents':[['langgraph','LangGraph'],['langchain','LangChain'],['llamaindex','LlamaIndex'],['llama.index','LlamaIndex'],['haystack','Haystack'],['dspy','DSPy'],['semantic.kernel','Semantic Kernel'],['ollama','Ollama'],['vllm','vLLM'],['sglang','SGLang'],['litellm','LiteLLM'],['groq','Groq'],['openai','OpenAI'],['anthropic','Claude'],['claude','Claude'],['gemini','Gemini'],['openrouter','OpenRouter'],['cerebras','Cerebras'],['mistral','Mistral'],['llama','LLaMA'],['deepseek','DeepSeek'],['gpt','GPT'],['bedrock','AWS Bedrock'],['vertex.ai','Vertex AI'],['llm','LLMs'],['retrieval','RAG'],['.rag.','RAG'],['embedding','Embeddings'],['pgvector','pgvector'],['faiss','FAISS'],['chromadb','ChromaDB'],['pinecone','Pinecone'],['qdrant','Qdrant'],['weaviate','Weaviate'],['milvus','Milvus'],['rerank','Reranking'],['multi.agent','Multi-Agent'],['agentic','Agentic AI'],['react.agent','ReAct'],['crewai','CrewAI'],['autogen','AutoGen'],['mcp','MCP'],['function.calling','Function Calling'],['tool.calling','Function Calling'],['prompt.engineering','Prompt Engineering'],['few.shot','Few-shot'],['chain.of.thought','CoT'],['guardrails','Guardrails'],['pydantic.ai','PydanticAI'],['instructor','Instructor'],['langsmith','LangSmith'],['langfuse','Langfuse'],['ragas','RAGAS'],['whisper','Whisper'],['fine.tun','Fine-tuning'],['finetun','Fine-tuning'],['peft','PEFT'],['qlora','QLoRA'],['quantiz','Quantization'],['gguf','GGUF']],
  'AI & ML':[['pytorch','PyTorch'],['tensorflow','TensorFlow'],['keras','Keras'],['jax','JAX'],['scikit','Scikit-Learn'],['hugging','HuggingFace'],['transformers','Transformers'],['spacy','spaCy'],['nltk','NLTK'],['gensim','Gensim'],['pandas','Pandas'],['numpy','NumPy'],['scipy','SciPy'],['polars','Polars'],['statsmodels','statsmodels'],['opencv','OpenCV'],['pillow','Pillow'],['matplotlib','Matplotlib'],['seaborn','Seaborn'],['plotly','Plotly'],['jupyter','Jupyter'],['lightgbm','LightGBM'],['xgboost','XGBoost'],['catboost','CatBoost'],['prophet','Prophet'],['optuna','Optuna'],['wandb','W&B'],['weights.and.biases','W&B'],['tensorboard','TensorBoard'],['or.tools','OR-Tools'],['ortools','OR-Tools'],['simulated.annealing','Simulated Annealing'],['genetic.algorithm','Genetic Algo'],['reinforcement','RL'],['q.learning','Q-Learning'],['dqn','Deep RL'],['lstm','LSTM'],['cnn','CNN'],['rnn','RNN'],['yolo','YOLO'],['forecasting','Forecasting'],['time.series','Time Series'],['anomaly','Anomaly Detection'],['numba','Numba'],['cuda','CUDA'],['onnx','ONNX']],
  'Frameworks':[['react','React'],['next.js','Next.js'],['nextjs','Next.js'],['node.js','Node.js'],['nodejs','Node.js'],['vue','Vue'],['svelte','Svelte'],['angular','Angular'],['remix','Remix'],['nestjs','NestJS'],['express','Express'],['fastapi','FastAPI'],['flask','Flask'],['django','Django'],['uvicorn','Uvicorn'],['pydantic','Pydantic'],['tailwind','Tailwind'],['shadcn','shadcn/ui'],['bootstrap','Bootstrap'],['streamlit','Streamlit'],['gradio','Gradio'],['redux','Redux'],['zustand','Zustand'],['tanstack','TanStack'],['framer','Framer Motion'],['zod','Zod'],['trpc','tRPC'],['websocket','WebSockets'],['socket.io','Socket.IO'],['three.js','Three.js'],['d3','D3'],['chart.js','Chart.js'],['recharts','Recharts'],['leaflet','Leaflet'],['openstreetmap','OpenStreetMap'],['reportlab','ReportLab'],['pptxgen','PptxGenJS'],['htmx','HTMX'],['electron','Electron'],['laravel','Laravel'],['pwa','PWA']],
  'Databases':[['postgres','PostgreSQL'],['mysql','MySQL'],['mariadb','MariaDB'],['sqlite','SQLite'],['mongodb','MongoDB'],['mongo','MongoDB'],['redis','Redis'],['firebase','Firebase'],['supabase','Supabase'],['planetscale','PlanetScale'],['cockroach','CockroachDB'],['clickhouse','ClickHouse'],['duckdb','DuckDB'],['influxdb','InfluxDB'],['timescale','TimescaleDB'],['postgis','PostGIS'],['elasticsearch','Elasticsearch'],['cassandra','Cassandra'],['dynamodb','DynamoDB'],['neo4j','Neo4j'],['prisma','Prisma'],['drizzle','Drizzle'],['sqlalchemy','SQLAlchemy']],
  'DevOps & Tools':[['docker','Docker'],['kubernetes','K8s'],['k8s','K8s'],['terraform','Terraform'],['ansible','Ansible'],['argocd','ArgoCD'],['nginx','Nginx'],['aws','AWS'],['gcp','GCP'],['azure','Azure'],['cloudflare','Cloudflare'],['heroku','Heroku'],['vercel','Vercel'],['netlify','Netlify'],['railway','Railway'],['github.actions','Actions'],['gitlab','GitLab'],['jenkins','Jenkins'],['ci/cd','CI/CD'],['prometheus','Prometheus'],['grafana','Grafana'],['datadog','Datadog'],['sentry','Sentry'],['mlflow','MLflow'],['kafka','Kafka'],['rabbitmq','RabbitMQ'],['celery','Celery'],['stripe','Stripe'],['linux','Linux'],['bash','Bash'],['selenium','Selenium'],['playwright','Playwright'],['pytest','Pytest'],['jest','Jest'],['vitest','Vitest'],['cypress','Cypress'],['ruff','Ruff'],['eslint','ESLint'],['prettier','Prettier'],['vite','Vite'],['graphql','GraphQL'],['openapi','OpenAPI'],['swagger','Swagger'],['makefile','Make'],['pip','pip'],['poetry','Poetry']],
};

/* ── pinned tech: always displayed, listed first ─────────────
   Curated for Applied-AI / AI-Engineer roles — edit freely.
   Use the same display names as TECH_DB so duplicates merge;
   detected extras get pruned before pinned ones do. */
const PINNED_TECH = {
  'LLM & Agents':  ['LangGraph','Multi-Agent','RAG','LangChain','Ollama','Groq','Claude','OpenAI','Gemini','Cerebras','OpenRouter','MCP','Embeddings','pgvector'],
  'AI & ML':       ['PyTorch','Deep RL','LSTM','Prophet','LightGBM','XGBoost','OR-Tools','Scikit-Learn','HuggingFace','Pandas','NumPy','Plotly'],
  'Frameworks':    ['FastAPI','Next.js','React','Tailwind','shadcn/ui','Streamlit','WebSockets','Zod','Vite','Node.js','Pydantic'],
  'Databases':     ['PostgreSQL','Supabase','Redis','TimescaleDB','PostGIS','Drizzle'],
  'DevOps & Tools':['Docker','K8s','Actions','Prometheus','Grafana','Playwright','Selenium','Pytest','Stripe','Ruff','Railway','Vercel'],
};

/* ── helpers ───────────────────────────────────────────────── */
function get(u){
  return new Promise((res, rej) => {
    const o = { headers: { 'User-Agent':'galaxy/12', 'Accept':'application/vnd.github.v3+json',
      ...(TOKEN ? { Authorization:`token ${TOKEN}` } : {}) } };
    https.get(u, o, s => { let d=''; s.on('data', c => d+=c);
      s.on('end', () => { try { res(JSON.parse(d)); } catch(e){ rej(e); } });
    }).on('error', rej);
  });
}
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function prng(seed){ let s=seed|0; return ()=>{ s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function orbitPt(rx,ry,t){ const c=Math.cos(TILT),s=Math.sin(TILT),ex=rx*Math.cos(t),ey=ry*Math.sin(t); return { x:CX+ex*c-ey*s, y:CY+ex*s+ey*c }; }
function orbitPath(rx,ry,st=0,n=80){ return Array.from({length:n+1},(_,i)=>{ const t=st+(i/n)*2*Math.PI,p=orbitPt(rx,ry,t); return `${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`; }).join(' ')+' Z'; }

/* ── tech panel layout: ONE source of truth ─────────────────
   Used by both the auto-pruner and the renderer so the math
   can never drift apart (this is what caused badge overflow). */
const TS = { px:610, pw:275, pad:14, badgeH:18, gapX:6, gapY:5, padX:8, charW:5.6, headH:30, headGap:10, cardGap:7, labelH:21, topY:16 };
const MAX_TECH_BOTTOM = 580;          // prune until panel fits above this

function layoutTech(tech){
  const cards = []; let cy = TS.topY + TS.headH + TS.headGap;
  for (const [cat, items] of Object.entries(tech)){
    if (!items || !items.length) continue;
    const maxBX = TS.px + TS.pw - TS.pad;
    let bx = TS.px + TS.pad, rows = 1; const pos = [];
    let by = 0;                                   // row index baseline
    for (const it of items){
      const tw = Math.ceil(it.length * TS.charW) + TS.padX * 2;
      if (bx + tw > maxBX){ bx = TS.px + TS.pad; rows++; }
      pos.push({ it, x: bx, row: rows - 1, w: tw });
      bx += tw + TS.gapX;
    }
    const cardH = TS.labelH + rows * (TS.badgeH + TS.gapY) + 8;
    cards.push({ cat, items, pos, cardH, y: cy });
    cy += cardH + TS.cardGap;
  }
  return { cards, bottom: cy };
}

/* ── data fetch ────────────────────────────────────────────── */
async function fetchData(){
  console.log('🌌 Fetching GitHub data for', USER, '…');
  const user  = await get(`https://api.github.com/users/${USER}`);
  const repos = await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
  if (!Array.isArray(repos)) throw new Error('repos fetch failed: ' + JSON.stringify(repos).slice(0,120));
  const sinceISO  = new Date(Date.now() - 30 * 864e5).toISOString();
  const sinceDate = sinceISO.slice(0, 10);

  /* top-5 active repos → planets */
  const nonFork = repos.filter(r => !r.fork && !r.archived)
    .sort((a,b) => (new Date(b.pushed_at) - new Date(a.pushed_at)) + (b.stargazers_count - a.stargazers_count) * 864e5)
    .slice(0, 5);

  const dayCounts = new Array(30).fill(0);        // commit sparkline buckets
  const commitData = await Promise.all(nonFork.map(async r => {
    const c = await get(`https://api.github.com/repos/${USER}/${r.name}/commits?since=${sinceISO}&author=${USER}&per_page=100`).catch(() => []);
    const a = Array.isArray(c) ? c : [];
    a.forEach(x => {                              // bucket by day for sparkline
      const ts = new Date(x.commit?.author?.date || x.commit?.committer?.date || 0).getTime();
      const idx = 29 - Math.floor((Date.now() - ts) / 864e5);
      if (idx >= 0 && idx < 30) dayCounts[idx]++;
    });
    return { name:r.name, lang:r.language || 'Other', count:a.length,
      msgs:a.slice(0,3).map(x => (x.commit?.message || 'update').split('\n')[0].slice(0,18)),
      size:r.size, stars:r.stargazers_count, forks:r.forks_count };
  }));
  commitData.sort((a,b) => b.count - a.count || b.size - a.size);

  /* languages across repos */
  const allLangs = {};
  await Promise.all(repos.slice(0,15).map(async r => {
    const ls = await get(`https://api.github.com/repos/${USER}/${r.name}/languages`).catch(() => ({}));
    if (ls && typeof ls === 'object') Object.keys(ls).forEach(l => allLangs[l] = (allLangs[l]||0) + ls[l]);
  }));

  /* tech corpus = topics + descriptions + names + READMEs */
  console.log('📄 Scanning READMEs…');
  const readmes = await Promise.all(repos.slice(0,12).map(async r => {
    const rm = await get(`https://api.github.com/repos/${USER}/${r.name}/readme`).catch(() => null);
    if (rm && rm.content) try { return Buffer.from(rm.content,'base64').toString('utf8').toLowerCase(); } catch(e){}
    return '';
  }));
  const parts = [];
  repos.forEach(r => { (r.topics||[]).forEach(t => parts.push(t));
    if (r.description) parts.push(r.description.toLowerCase()); parts.push(r.name.toLowerCase()); });
  parts.push(...readmes);
  /* normalize: '-', '_' AND whitespace → '.' so multi-word phrases
     like "multi agent" / "GitHub Actions" / "fine-tuning" all match */
  const corpus = parts.join(' ').toLowerCase().replace(/[-_\s]+/g,'.');

  const techStack = {};
  techStack['Languages'] = Object.entries(allLangs).sort((a,b) => b[1]-a[1]).map(e => e[0]).slice(0,8);
  Object.entries(TECH_DB).forEach(([cat, pairs]) => {
    const found = pairs.filter(([kw]) => corpus.includes(kw)).map(([,d]) => d);
    const merged = [...new Set([...(PINNED_TECH[cat] || []), ...found])];
    if (merged.length) techStack[cat] = merged.slice(0, 12);
  });
  /* auto-fit: phase 1 sheds detected *extras* only (largest category
     first) so the pinned AI-core is never touched while space allows.
     Phase 2 only runs if pinned items alone still overflow — a true
     last resort that trims the longest category down to a floor of 2. */
  const pinnedOf = cat => PINNED_TECH[cat] || [];
  /* floor = how few items a category may keep in phase 1.
     Pinned categories floor at their pinned count (extras only);
     Languages has no pins, so protect its top 4 (by bytes). */
  const floorOf = cat => cat === 'Languages' ? 4 : pinnedOf(cat).length;
  const fits = () => layoutTech(techStack).bottom <= MAX_TECH_BOTTOM;
  while (!fits()){                                  // phase 1: drop extras above floor
    let target = null, max = 0;
    for (const [cat, items] of Object.entries(techStack)){
      if (items.length - floorOf(cat) > 0 && items.length > max){ max = items.length; target = cat; }
    }
    if (!target) break;
    const arr = techStack[target];                 // remove last non-pinned (Languages: least-used)
    for (let i = arr.length - 1; i >= 0; i--){ if (!pinnedOf(target).includes(arr[i])){ arr.splice(i, 1); break; } }
  }
  while (!fits()){                                  // phase 2: last resort
    let target = null, max = 2;
    for (const [cat, items] of Object.entries(techStack)){ if (items.length > max){ max = items.length; target = cat; } }
    if (!target) break;
    techStack[target].pop();
  }
  console.log('🧪 Tech panel:', JSON.stringify(techStack));
  console.log('📐 Panel bottom:', layoutTech(techStack).bottom, '(max ' + MAX_TECH_BOTTOM + ')');

  /* PRs merged: search API (accurate) with events fallback */
  let prs = 0;
  try {
    const sr = await get(`https://api.github.com/search/issues?q=author:${USER}+is:pr+is:merged+merged:%3E=${sinceDate}&per_page=1`);
    if (sr && typeof sr.total_count === 'number') prs = sr.total_count;
    else throw new Error('no total_count');
  } catch (e) {
    const events = await get(`https://api.github.com/users/${USER}/events?per_page=100`).catch(() => []);
    if (Array.isArray(events)) prs = events.filter(ev => ev.type==='PullRequestEvent' && ev.payload?.action==='closed'
      && ev.payload?.pull_request?.merged && new Date(ev.created_at).getTime() > Date.now() - 30*864e5).length;
  }

  const stats = {
    repos: user.public_repos, stars: repos.reduce((s,r) => s + r.stargazers_count, 0),
    followers: user.followers, since: new Date(user.created_at).getFullYear(),
    commits: commitData.reduce((s,r) => s + r.count, 0), prs,
    issues: repos.reduce((s,r) => s + r.open_issues_count, 0),
    name: (user.name || USER).trim(),
  };
  console.log('Planets:', commitData.map(r => `${r.name}(${r.count})`).join(', '));
  console.log('Stats:', JSON.stringify(stats));
  return { commitData, stats, techStack, dayCounts };
}

function pR(P,i){ const mx=Math.max(...P.map(p => p.count>0 ? p.count : Math.sqrt(p.size/30)),1);
  const v=P[i].count>0 ? P[i].count : Math.sqrt(P[i].size/30);
  return Math.round(PBR[i]*.5 + Math.sqrt(v/mx)*PBR[i]*.6); }

/* ── defs ──────────────────────────────────────────────────── */
function svgDefs(P){
  let d = '<defs>';
  d += `<radialGradient id="bgr" cx="32%" cy="48%" r="75%"><stop offset="0%" stop-color="#0e0e26"/><stop offset="60%" stop-color="#070718"/><stop offset="100%" stop-color="#020208"/></radialGradient>`;
  d += `<radialGradient id="nb0"><stop offset="0%" stop-color="#1c0a36" stop-opacity="0.55"/><stop offset="100%" stop-color="#1c0a36" stop-opacity="0"/></radialGradient>`;
  d += `<radialGradient id="nb1"><stop offset="0%" stop-color="#08183a" stop-opacity="0.45"/><stop offset="100%" stop-color="#08183a" stop-opacity="0"/></radialGradient>`;
  d += `<radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="rgba(0,0,0,0.45)"/></radialGradient>`;
  d += `<radialGradient id="sc1"><stop offset="0%" stop-color="#fff4d0" stop-opacity="0.45"/><stop offset="30%" stop-color="#ffaa00" stop-opacity="0.12"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d += `<radialGradient id="sc2"><stop offset="0%" stop-color="#ffcc22" stop-opacity="0.5"/><stop offset="40%" stop-color="#ff7700" stop-opacity="0.15"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d += `<radialGradient id="sc3"><stop offset="0%" stop-color="#ffdd55" stop-opacity="0.65"/><stop offset="50%" stop-color="#ff8800" stop-opacity="0.2"/><stop offset="100%" stop-color="transparent"/></radialGradient>`;
  d += `<radialGradient id="sb" cx="40%" cy="34%" r="60%"><stop offset="0%" stop-color="#ffffff"/><stop offset="12%" stop-color="#fff8d0"/><stop offset="28%" stop-color="#ffcc44"/><stop offset="48%" stop-color="#ff8811"/><stop offset="68%" stop-color="#cc4400"/><stop offset="85%" stop-color="#882200"/><stop offset="100%" stop-color="#331100"/></radialGradient>`;
  d += `<radialGradient id="sco"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="40%" stop-color="#fff4cc" stop-opacity="0.5"/><stop offset="100%" stop-color="#ffcc44" stop-opacity="0"/></radialGradient>`;
  d += `<linearGradient id="panelTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(120,170,255,0.18)"/><stop offset="100%" stop-color="rgba(120,170,255,0)"/></linearGradient>`;
  d += `<linearGradient id="titleUL" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(100,180,255,0)"/><stop offset="50%" stop-color="rgba(120,200,255,0.5)"/><stop offset="100%" stop-color="rgba(100,180,255,0)"/></linearGradient>`;
  d += `<linearGradient id="spark" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#3B82F6" stop-opacity="0.55"/><stop offset="100%" stop-color="#7DD3FC" stop-opacity="0.95"/></linearGradient>`;
  d += `<linearGradient id="goldT" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="rgba(255,225,120,0.95)"/><stop offset="100%" stop-color="rgba(255,225,120,0)"/></linearGradient>`;
  P.forEach((p,i) => { const c = PCOL[i];
    d += `<radialGradient id="pg${i}" cx="32%" cy="26%" r="65%"><stop offset="0%" stop-color="${c.hi}"/><stop offset="50%" stop-color="${c.f}"/><stop offset="100%" stop-color="${c.dk}"/></radialGradient>`;
    d += `<radialGradient id="gw${i}"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.6"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></radialGradient>`;
    d += `<linearGradient id="ct${i}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="${c.g}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c.g}" stop-opacity="0"/></linearGradient>`;
    d += `<clipPath id="cp${i}"><circle r="${pR(P,i)}"/></clipPath>`;
  });
  d += `<filter id="fb" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>`;
  d += `<filter id="fm" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="10"/></filter>`;
  d += `<filter id="fg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>`;
  d += `<filter id="fs" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>`;
  ORX.forEach((rx,i) => { const ry = Math.round(rx*FLAT); d += `<path id="op${i}" d="${orbitPath(rx,ry,ANGS[i])}" fill="none"/>`; });
  return d + '</defs>';
}

/* ── scene layers ──────────────────────────────────────────── */
const svgBG = () => `<rect width="${W}" height="${H}" fill="url(#bgr)"/><ellipse cx="${CX-40}" cy="${CY-40}" rx="330" ry="210" fill="url(#nb0)"/><ellipse cx="${CX+120}" cy="${CY+80}" rx="290" ry="190" fill="url(#nb1)"/>`;

function svgStars(){ const rng = prng(8888); let s = '';
  for (let i=0;i<250;i++){ const x=(rng()*W).toFixed(1), y=(rng()*H).toFixed(1),
    sz = rng()<.07?1.6:rng()<.3?.9:.45, op=(.18+rng()*.6).toFixed(2),
    dur=(1.6+rng()*5).toFixed(1), beg=(rng()*8).toFixed(1);
    s += `<circle cx="${x}" cy="${y}" r="${sz}" fill="${rng()<.15?'#ffe8cc':'#ffffff'}" opacity="${op}"><animate attributeName="opacity" values="${op};${(+op*.08).toFixed(2)};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/></circle>`; }
  return `<g>${s}</g>`; }

const svgOrbits = () => ORX.map((rx,i) => { const ry=Math.round(rx*FLAT);
  return `<path d="${orbitPath(rx,ry)}" fill="none" stroke="rgba(150,180,255,0.07)" stroke-width="0.7"><animate attributeName="stroke-opacity" values="0.045;0.11;0.045" dur="${28+i*10}s" repeatCount="indefinite"/></path>`; }).join('');

function svgBelt(){ const rng=prng(111), cT=Math.cos(TILT), sT=Math.sin(TILT), bR=120, bRy=Math.round(120*FLAT); let d='';
  for (let i=0;i<100;i++){ const t=(i/100)*2*Math.PI, jx=(rng()-.5)*9, jy=(rng()-.5)*2,
    ex=(bR+jx)*Math.cos(t), ey=(bRy+jy)*Math.sin(t);
    d += `<circle cx="${(CX+ex*cT-ey*sT).toFixed(1)}" cy="${(CY+ex*sT+ey*cT).toFixed(1)}" r="${(.4+rng()*.7).toFixed(1)}" fill="#c8a040" opacity="${(.1+rng()*.3).toFixed(2)}"/>`; }
  return `<g><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="150s" repeatCount="indefinite"/>${d}</g>`; }

function svgSun(initials){
  let s = '';
  s += `<circle cx="${CX}" cy="${CY}" r="112" fill="url(#sc1)" filter="url(#fb)"><animate attributeName="r" values="106;120;106" dur="7s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.9;0.6" dur="7s" repeatCount="indefinite"/></circle>`;
  s += `<circle cx="${CX}" cy="${CY}" r="70" fill="url(#sc2)" filter="url(#fm)"><animate attributeName="r" values="66;78;66" dur="5s" repeatCount="indefinite"/></circle>`;
  s += `<circle cx="${CX}" cy="${CY}" r="44" fill="url(#sc3)" filter="url(#fg)"><animate attributeName="r" values="41;49;41" dur="3.5s" repeatCount="indefinite"/></circle>`;
  s += `<g opacity="0.1"><animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="60s" repeatCount="indefinite"/>`;
  for (let i=0;i<16;i++){ const rad=i*22.5*Math.PI/180, len=46+((i%4===0)?12:0);
    s += `<line x1="${CX}" y1="${CY}" x2="${(CX+Math.cos(rad)*len).toFixed(1)}" y2="${(CY+Math.sin(rad)*len).toFixed(1)}" stroke="#ffbb33" stroke-width="${i%4===0?2.5:i%2===0?1.5:0.8}" opacity="${i%4===0?0.3:0.12}"/>`; }
  s += `</g>`;
  s += `<circle cx="${CX}" cy="${CY}" r="25" fill="url(#sb)"><animate attributeName="r" values="24;26;24" dur="3s" repeatCount="indefinite"/></circle>`;
  [[-13,-9,9,.18],[-4,-13,7,.14],[8,-7,8,.16],[11,4,7,.15],[-9,8,8,.17],[4,11,6,.14],[-6,0,7,.12],[0,-6,6,.1],[13,-4,5,.13],[-11,-2,6,.15],[6,-11,5,.12],[2,8,6,.16]]
    .forEach(([dx,dy,r,a]) => { s += `<circle cx="${CX+dx}" cy="${CY+dy}" r="${r}" fill="rgba(160,60,0,${a})"/>`; });
  s += `<circle cx="${CX-7}" cy="${CY-7}" r="4" fill="rgba(255,230,150,0.2)"/><circle cx="${CX+6}" cy="${CY+4}" r="3" fill="rgba(255,220,140,0.15)"/>`;
  s += `<circle cx="${CX}" cy="${CY}" r="25" fill="none" stroke="rgba(255,140,30,0.25)" stroke-width="1.2"/>`;
  s += `<path d="M ${CX-19},${CY-13} Q ${CX-33},${CY-36} ${CX-11},${CY-23}" fill="none" stroke="rgba(255,100,20,0.25)" stroke-width="2" filter="url(#fs)"><animate attributeName="opacity" values="0.25;0.06;0.25" dur="5s" repeatCount="indefinite"/></path>`;
  s += `<path d="M ${CX+17},${CY+15} Q ${CX+35},${CY+33} ${CX+23},${CY+9}" fill="none" stroke="rgba(255,120,30,0.22)" stroke-width="1.8" filter="url(#fs)"><animate attributeName="opacity" values="0.22;0.05;0.22" dur="6.5s" begin="2s" repeatCount="indefinite"/></path>`;
  s += `<circle cx="${CX}" cy="${CY}" r="13" fill="url(#sco)"><animate attributeName="r" values="12;14;12" dur="2.5s" repeatCount="indefinite"/></circle>`;
  s += `<circle cx="${CX-3}" cy="${CY-3}" r="5" fill="white" opacity="0.6"><animate attributeName="opacity" values="0.6;0.25;0.6" dur="2s" repeatCount="indefinite"/></circle>`;
  s += `<text x="${CX}" y="${CY+3.5}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="rgba(60,20,0,0.55)">${esc(initials)}</text>`;
  return s;
}

/* readable label pill under each planet */
function planetLabel(name, lang, pr, color){
  const w = Math.max(name.length*5.4+12, lang.length*4.2+10), y = pr+6;
  return `<rect x="${(-w/2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="23" rx="4" fill="rgba(4,5,18,0.62)"/>`
       + `<text y="${y+10}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="600" fill="rgba(255,255,255,0.9)">${name}</text>`
       + `<text y="${y+20}" text-anchor="middle" font-family="monospace" font-size="6.5" fill="${color}" opacity="0.85">${lang}</text>`;
}

function svgPlanets(P){ return P.slice(0,5).map((p,i) => {
  const pr=pR(P,i), dur=SPEEDS[i], c=PCOL[i], name=esc(p.name.slice(0,14)), lang=esc(p.lang);
  let body='';
  if (i===0) body = `<path d="M ${pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${-pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.3"/><circle r="${pr}" fill="url(#pg${i})"/><path d="M ${-pr*1.8},0 A ${pr*1.8},${pr*.35} 0 0,1 ${pr*1.8},0" fill="none" stroke="${c.f}" stroke-width="2.5" opacity="0.55"/>`;
  else if (i===1) body = `<circle r="${pr}" fill="url(#pg${i})"/><g clip-path="url(#cp${i})"><rect x="${-pr}" y="${-pr*.45}" width="${pr*2}" height="${pr*.2}" fill="rgba(0,0,0,0.12)"/><rect x="${-pr}" y="${pr*.15}" width="${pr*2}" height="${pr*.25}" fill="rgba(255,255,255,0.06)"/></g>`;
  else if (i===2) body = `<circle r="${pr}" fill="url(#pg${i})"/><circle cx="${pr*.3}" cy="${pr*.15}" r="${pr*.3}" fill="rgba(180,60,0,0.22)"/>`;
  else if (i===3) body = `<circle r="${pr+5}" fill="${c.g}" opacity="0.1"><animate attributeName="r" values="${pr+4};${pr+7};${pr+4}" dur="3s" repeatCount="indefinite"/></circle><circle r="${pr}" fill="url(#pg${i})"/>`;
  else body = `<circle r="${pr}" fill="url(#pg${i})"/><line x1="${-pr*.3}" y1="${-pr*.6}" x2="${pr*.1}" y2="${-pr*.1}" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/><circle cx="${-pr*.15}" cy="${-pr*.3}" r="${pr*.1}" fill="rgba(255,255,255,0.18)"/>`;
  let s = `<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
  s += `<circle r="${pr*3}" fill="url(#gw${i})" filter="url(#fg)" opacity="0.5"/>${body}`;
  s += `<circle r="${pr*.45}" cx="${-pr*.28}" cy="${-pr*.28}" fill="rgba(255,255,255,0.1)"/>`;
  s += `<circle r="${pr}" fill="none" stroke="${c.g}" stroke-width="0.7" opacity="0.25"><animate attributeName="r" values="${pr};${pr+2};${pr}" dur="${3+i*.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.25;0.06;0.25" dur="${3+i*.5}s" repeatCount="indefinite"/></circle>`;
  if (p.forks>0) s += `<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${(dur*.12).toFixed(1)}s" repeatCount="indefinite"/><circle cx="${pr+8}" r="2" fill="#99aabb" opacity="0.6"/></g>`;
  s += planetLabel(name, lang, pr, c.g);
  return s + '</g>'; }).join(''); }

/* commit comets — max 4, staggered, color-matched to their repo */
function svgComets(P){ let s='', ci=0;
  P.slice(0,5).forEach((p,pi) => {
    if (ci>=4 || !p.msgs.length) return;
    const rx=ORX[pi], ry=Math.round(rx*FLAT), c=PCOL[pi], msg=p.msgs[0];
    const tp=orbitPt(rx,ry,ANGS[pi]+0.55);
    const sx=Math.max(-30,tp.x-150), sy=Math.max(8,tp.y-48), dur=11+ci*1.5, beg=ci*4;
    s += `<g opacity="0"><animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M ${sx.toFixed(1)},${sy.toFixed(1)} L ${tp.x.toFixed(1)},${tp.y.toFixed(1)}"/>
<animate attributeName="opacity" values="0;0.75;0.75;0" keyTimes="0;0.07;0.9;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="2.2" fill="${c.g}"/><rect x="-42" y="-1" width="42" height="2.2" fill="url(#ct${pi})" rx="1.1"/>
<text x="5" y="-4" font-family="monospace" font-size="6" fill="${c.g}" opacity="0.55">${esc(msg)}</text></g>`;
    ci++; });
  return s; }

/* gold shooting stars — one per merged PR (capped at 2), only if any */
function svgShooting(prs){ if (!prs) return ''; let s='';
  const n = Math.min(prs, 2);
  for (let i=0;i<n;i++){ const beg=6+i*9, dur=1.6,
    x1=120+i*180, y1=60+i*30, x2=x1+260, y2=y1+150;
    s += `<g opacity="0"><animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite" rotate="auto" path="M ${x1},${y1} L ${x2},${y2}"/>
<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
<circle r="2" fill="rgba(255,235,150,0.95)"/><rect x="-38" y="-0.9" width="38" height="1.8" fill="url(#goldT)" rx="0.9"/>
<text x="5" y="-4" font-family="monospace" font-size="6" fill="rgba(255,225,120,0.6)">PR merged</text></g>`; }
  return s; }

/* glass panel with top sheen + corner ticks */
function panel(x,y,w,h,r=10){
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="rgba(8,12,26,0.92)" stroke="rgba(110,160,240,0.18)" stroke-width="0.8"/>`;
  s += `<rect x="${x+1}" y="${y+1}" width="${w-2}" height="${Math.min(h-2,40)}" rx="${r-1}" fill="url(#panelTop)"/>`;
  const t=9;
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([px,py,sx,sy]) => {
    s += `<line x1="${px}" y1="${py}" x2="${px+sx*t}" y2="${py}" stroke="rgba(140,190,255,0.5)" stroke-width="1.2"/>`;
    s += `<line x1="${px}" y1="${py}" x2="${px}" y2="${py+sy*t}" stroke="rgba(140,190,255,0.5)" stroke-width="1.2"/>`;
  });
  return s; }

/* HUD: identity, stat grid, 30-day commit sparkline */
function svgHUDLeft(stats, dayCounts){
  const x=16, w=280, h=168, y=H-h-14;
  let s = panel(x,y,w,h), cy=y+20;
  s += `<text x="${x+14}" y="${cy}" font-family="monospace" font-size="11.5" font-weight="bold" fill="rgba(232,242,255,0.95)" letter-spacing="0.5">${esc(stats.name)}</text>`;
  s += `<text x="${x+w-14}" y="${cy}" text-anchor="end" font-family="monospace" font-size="8" fill="rgba(130,170,230,0.55)">@${esc(USER)} · ${stats.since}</text>`;
  cy += 16; s += `<line x1="${x+12}" y1="${cy}" x2="${x+w-12}" y2="${cy}" stroke="rgba(110,160,240,0.1)" stroke-width="0.5"/>`; cy += 14;
  [['Repos',stats.repos],['Stars',stats.stars],['Followers',stats.followers]].forEach(([l,v],i) => { const bx=x+14+i*90;
    s += `<text x="${bx}" y="${cy}" font-family="monospace" font-size="7.5" fill="rgba(150,180,225,0.55)">${l}</text>`;
    s += `<text x="${bx}" y="${cy+14}" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(225,242,255,0.95)">${v}</text>`; });
  cy += 27; s += `<line x1="${x+12}" y1="${cy}" x2="${x+w-12}" y2="${cy}" stroke="rgba(110,160,240,0.1)" stroke-width="0.5"/>`; cy += 13;
  s += `<text x="${x+14}" y="${cy}" font-family="monospace" font-size="8" font-weight="bold" fill="rgba(110,175,255,0.65)" letter-spacing="2">LAST 30 DAYS</text>`; cy += 14;
  [['Commits',stats.commits],['PRs',stats.prs],['Issues',stats.issues]].forEach(([l,v],i) => { const bx=x+14+i*90;
    s += `<text x="${bx}" y="${cy}" font-family="monospace" font-size="7.5" fill="rgba(150,180,225,0.55)">${l}</text>`;
    s += `<text x="${bx}" y="${cy+14}" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(225,242,255,0.95)">${v}</text>`; });
  /* sparkline: 30 daily bars, today rightmost */
  cy += 24;
  const sw=w-28, bw=sw/30, maxC=Math.max(...dayCounts,1), sh=18, sy0=cy+sh;
  s += `<line x1="${x+14}" y1="${sy0+0.5}" x2="${x+w-14}" y2="${sy0+0.5}" stroke="rgba(110,160,240,0.15)" stroke-width="0.5"/>`;
  dayCounts.forEach((c2,i) => { const bh=c2>0 ? Math.max(2, Math.round((c2/maxC)*sh)) : 0;
    if (bh>0) s += `<rect x="${(x+14+i*bw+0.5).toFixed(1)}" y="${sy0-bh}" width="${(bw-1).toFixed(1)}" height="${bh}" rx="0.8" fill="url(#spark)"/>`; });
  return s; }

/* tech stack panel — render straight from the shared layout */
function svgTechStack(tech){
  const L = layoutTech(tech); let s='';
  s += panel(TS.px, TS.topY, TS.pw, TS.headH, 8);
  s += `<text x="${TS.px+16}" y="${TS.topY+20}" font-family="monospace" font-size="11" font-weight="bold" fill="rgba(120,185,255,0.85)" letter-spacing="3">TECH STACK</text>`;
  L.cards.forEach(card => {
    const tint = CAT_TINT[card.cat] || { f:'rgba(60,120,220,0.08)', s:'rgba(80,140,255,0.2)' };
    const lcol = CAT_LABEL[card.cat] || 'rgba(140,170,220,0.7)';
    s += panel(TS.px, card.y, TS.pw, card.cardH, 8);
    s += `<text x="${TS.px+TS.pad}" y="${card.y+16}" font-family="monospace" font-size="8.5" font-weight="600" fill="${lcol}" letter-spacing="1">${esc(card.cat)}</text>`;
    card.pos.forEach(({it,x,row,w}) => {
      const by = card.y + TS.labelH + row * (TS.badgeH + TS.gapY);
      s += `<rect x="${x}" y="${by}" width="${w}" height="${TS.badgeH}" rx="5" fill="${tint.f}" stroke="${tint.s}" stroke-width="0.6"/>`;
      const dot = card.cat === 'Languages' ? (LANG_DOT[it] || '#8b949e') : null;
      if (dot){ s += `<circle cx="${x+9}" cy="${by+TS.badgeH/2}" r="2.6" fill="${dot}"/>`;
        s += `<text x="${x+(w+10)/2}" y="${by+13.5}" text-anchor="middle" font-family="monospace" font-size="8" fill="rgba(210,228,255,0.9)">${esc(it)}</text>`; }
      else s += `<text x="${x+w/2}" y="${by+13.5}" text-anchor="middle" font-family="monospace" font-size="8" fill="rgba(210,228,255,0.9)">${esc(it)}</text>`;
    });
  });
  return s; }

function svgTitle(name){
  const first = name ? name.split(/\s+/)[0].toUpperCase() : USER.toUpperCase();
  const t = `${first}'S GALAXY`;
  return `<text x="${CX}" y="22" text-anchor="middle" font-family="monospace" font-size="15" font-weight="bold" fill="rgba(190,220,255,0.92)" letter-spacing="7">${esc(t)}</text>
<rect x="${CX-118}" y="27" width="236" height="1.4" fill="url(#titleUL)"/>
<text x="${CX}" y="40" text-anchor="middle" font-family="monospace" font-size="7" fill="rgba(110,165,225,0.45)" letter-spacing="2.5">LIVE · AUTO-UPDATED DAILY</text>`; }

const svgSyncStamp = () =>
  `<text x="${W-14}" y="${H-10}" text-anchor="end" font-family="monospace" font-size="6.5" fill="rgba(120,160,220,0.4)" letter-spacing="1">SYNCED ${new Date().toISOString().slice(0,10)}</text>`;

/* ── assemble ──────────────────────────────────────────────── */
async function main(){
  const { commitData, stats, techStack, dayCounts } = await fetchData();
  let initials = USER.substring(0,2).toUpperCase();
  if (stats.name){ const p = stats.name.split(/\s+/);
    initials = p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0].substring(0,2).toUpperCase(); }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="gTitle gDesc">
<title id="gTitle">${esc(stats.name)}'s GitHub Galaxy</title>
<desc id="gDesc">Animated solar system of ${esc(USER)}'s top repositories, live stats and tech stack. Auto-updated daily.</desc>
${svgDefs(commitData)}
${svgBG()}
${svgStars()}
${svgOrbits()}
${svgBelt()}
${svgComets(commitData)}
${svgShooting(stats.prs)}
${svgPlanets(commitData)}
${svgSun(initials)}
<rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>
${svgHUDLeft(stats, dayCounts)}
${svgTechStack(techStack)}
${svgTitle(stats.name)}
${svgSyncStamp()}
</svg>`;
  fs.writeFileSync('galaxy.svg', svg, 'utf8');
  console.log('✅ galaxy.svg written —', (svg.length/1024).toFixed(1), 'KB');
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
