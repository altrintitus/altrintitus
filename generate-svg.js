'use strict';
const https = require('https');
const fs    = require('fs');

const USERNAME = 'altrin7311'; // Update to your username if needed
const TOKEN    = process.env.GITHUB_TOKEN || ''; 
const W = 860, H = 480, CX = W / 2, CY = H / 2;
const TILT = -12 * Math.PI / 180; // Flatter tilt so orbits are wider
const FLAT = 0.35; // Thicker orbital ellipses to prevent squishing

// 5 Vibrant, Cartoonish Colors
const PALETTE = [
  { fill: '#FF477E', outline: '#9E0031', shine: '#FF99B6' }, // Bright Pink
  { fill: '#00B4D8', outline: '#0077B6', shine: '#90E0EF' }, // Sky Blue
  { fill: '#FFD166', outline: '#E09F3E', shine: '#FFE6A7' }, // Sunny Yellow
  { fill: '#06D6A0', outline: '#028090', shine: '#83E8CA' }, // Mint Green
  { fill: '#FF9F1C', outline: '#9A031E', shine: '#FFBF69' }  // Tiger Orange
];

// 5 Widely spaced orbits
const ORBITS = [
  { rx: 110 }, { rx: 175 }, { rx: 240 }, { rx: 305 }, { rx: 370 }
];
ORBITS.forEach(o => o.ry = Math.round(o.rx * FLAT));

const SPEEDS = [12, 18, 24, 30, 38]; // Varied speeds
const PRADII = [16, 14, 18, 15, 13]; // Chunky, visible planets
const STARTS = [0, 1.25, 2.5, 3.75, 5.0]; // Perfectly spaced starting angles so they never collide

function get(url) {
  return new Promise((res, rej) => {
    const opts = {
      headers: {
        'User-Agent': 'galaxy-gen/3',
        'Accept': 'application/vnd.github.v3+json',
        ...(TOKEN ? { Authorization: `token ${TOKEN}` } : {})
      }
    };
    https.get(url, opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } });
    }).on('error', rej);
  });
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function orbitPt(rx, ry, t) {
  const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
  return { x: CX + ex * cosT - ey * sinT, y: CY + ex * sinT + ey * cosT };
}

function orbitPath(rx, ry, start = 0, n = 80) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = start + (i / n) * 2 * Math.PI, p = orbitPt(rx, ry, t);
    return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

function stylesAndDefs() {
  let d = `<defs>
    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD166" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FFD166" stop-opacity="0"/>
    </radialGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <style>
    /* Bubbly, bold, cartoonish font stack */
    text {
      font-family: 'Fredoka One', 'Nunito', 'Comic Sans MS', 'Arial Rounded MT Bold', sans-serif;
      font-weight: 800;
    }
    .panel {
      fill: #FFFFFF;
      stroke: #2B2D42;
      stroke-width: 4;
      rx: 16; /* Rounded corners */
    }
  </style>`;
  return d;
}

function backgroundAndStars() {
  let s = `<rect width="${W}" height="${H}" fill="#1D2038"/>`; // Deep, vibrant space blue
  // Bright, chunky cartoon stars
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = Math.random() * 2.5 + 1;
    const dur = Math.random() * 3 + 2;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF" opacity="0.8">
            <animate attributeName="opacity" values="0.2;1;0.2" dur="${dur}s" repeatCount="indefinite"/>
          </circle>`;
  }
  return s;
}

function rings() {
  return ORBITS.map(({ rx, ry }, i) => {
    return `<path d="${orbitPath(rx, ry)}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.25" stroke-dasharray="8, 8"/>`;
  }).join('');
}

function sun() {
  return `
    <circle cx="${CX}" cy="${CY}" r="65" fill="url(#sunGlow)"/>
    <circle cx="${CX}" cy="${CY}" r="35" fill="#FFD166" stroke="#E09F3E" stroke-width="4"/>
    <circle cx="${CX-12}" cy="${CY-10}" r="8" fill="#FFF" opacity="0.6"/> <text x="${CX}" y="${CY+6}" text-anchor="middle" font-size="20" fill="#E09F3E">AT</text>
  `;
}

function planets(repos) {
  return repos.map((r, i) => {
    const pr = PRADII[i], dur = SPEEDS[i], name = esc(r.name.slice(0, 15));
    const colors = PALETTE[i];
    
    let s = `<g><animateMotion dur="${dur}s" repeatCount="indefinite" rotate="0" calcMode="linear"><mpath href="#op${i}"/></animateMotion>`;
    
    // Planet body
    s += `<circle r="${pr}" fill="${colors.fill}" stroke="${colors.outline}" stroke-width="3"/>`;
    // Cartoon shine highlight
    s += `<circle cx="${-pr*0.3}" cy="${-pr*0.3}" r="${pr*0.3}" fill="${colors.shine}"/>`;
    
    // Moon (optional, for visual flair)
    if (i % 2 === 0) {
      const mo = pr + 12;
      s += `<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${dur*0.2}s" repeatCount="indefinite"/>
              <circle cx="${mo}" cy="0" r="4" fill="#EAEAEA" stroke="#A0A0A0" stroke-width="2"/>
            </g>`;
    }
    
    // Planet Label (floating bubble)
    s += `<rect x="-40" y="${pr + 8}" width="80" height="20" rx="10" fill="#FFF" stroke="${colors.outline}" stroke-width="2"/>`;
    s += `<text x="0" y="${pr + 22}" text-anchor="middle" font-size="11" fill="${colors.outline}">${name}</text>`;
    return s + '</g>';
  }).join('') + ORBITS.map((o, i) => `<path id="op${i}" d="${orbitPath(o.rx, o.ry, STARTS[i])}" fill="none"/>`).join('');
}

function simpleFloatingStats(stats) {
  // Top left bubbly panel
  let s = `<g transform="translate(20, 20)" filter="url(#dropShadow)">`;
  s += `<rect width="180" height="120" class="panel" />`;
  s += `<rect x="10" y="10" width="160" height="30" rx="8" fill="#FF477E"/>`;
  s += `<text x="90" y="30" text-anchor="middle" font-size="14" fill="#FFF">GALAXY STATS</text>`;
  
  const metrics = [
    ['REPOS', stats.repos, '#00B4D8'],
    ['STARS', stats.stars, '#FFD166'],
    ['COMMITS (30D)', stats.commits, '#06D6A0']
  ];
  
  metrics.forEach(([label, val, color], i) => {
    s += `<text x="15" y="${65 + i*22}" font-size="12" fill="#2B2D42">${label}</text>`;
    s += `<text x="165" y="${65 + i*22}" text-anchor="end" font-size="14" fill="${color}" stroke="#2B2D42" stroke-width="1">${val}</text>`;
  });
  s += `</g>`;
  
  // Bottom Right Badge
  s += `<g transform="translate(${W - 160}, ${H - 60})" filter="url(#dropShadow)">`;
  s += `<rect width="140" height="40" rx="20" fill="#FF9F1C" stroke="#9A031E" stroke-width="3"/>`;
  s += `<text x="70" y="25" text-anchor="middle" font-size="14" fill="#FFF">ALTRIN7311</text>`;
  s += `</g>`;

  return s;
}

async function main() {
  console.log('🚀 Fetching GitHub data...');
  
  // Fetch user data
  const user = await get(`https://api.github.com/users/${USERNAME}`);
  
  // Fetch repositories
  const allRepos = await get(`https://api.github.com/users/${USERNAME}/repos?per_page=100`);
  
  // Filter for ONLY the 5 most recently pushed, non-archived, non-forked repos
  const activeRepos = allRepos
    .filter(r => !r.fork && !r.archived)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 5);

  // Fetch recent events for commit stats
  const ev1 = await get(`https://api.github.com/users/${USERNAME}/events?per_page=100&page=1`).catch(() => []);
  const ev2 = await get(`https://api.github.com/users/${USERNAME}/events?per_page=100&page=2`).catch(() => []);
  const allEvents = [...(Array.isArray(ev1) ? ev1 : []), ...(Array.isArray(ev2) ? ev2 : [])];
  
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const commits = allEvents
    .filter(e => e.type === 'PushEvent' && new Date(e.created_at).getTime() > thirtyDaysAgo)
    .reduce((sum, e) => sum + (e.payload?.commits?.length || 0), 0);

  const stats = {
    repos: user.public_repos,
    stars: allRepos.reduce((sum, r) => sum + r.stargazers_count, 0),
    commits: commits
  };

  console.log('🪐 Active Planets Found:', activeRepos.map(r => r.name).join(', '));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${stylesAndDefs()}
    ${backgroundAndStars()}
    ${rings()}
    ${planets(activeRepos)}
    ${sun()}
    ${simpleFloatingStats(stats)}
  </svg>`;

  fs.writeFileSync('galaxy.svg', svg, 'utf8');
  console.log('✅ Done! Cartoon galaxy.svg written successfully.');
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
