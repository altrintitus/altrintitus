const https = require('https');
const fs = require('fs');

const USERNAME = 'altrin7311';
const TOKEN = process.env.GITHUB_TOKEN;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'galaxy-updater',
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(url, opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

const LANG_MAP = {
  Python:'python', JavaScript:'js', TypeScript:'typescript',
  Rust:'rust', HTML:'js', CSS:'js', Go:'python',
  'C++':'rust', C:'rust', Java:'typescript', Shell:'js',
  Vue:'js', Svelte:'js', Ruby:'rust', PHP:'js',
};

const ORBITS = [
  {speed:0.008},{speed:0.005},{speed:0.003},
  {speed:0.002},{speed:0.0015},{speed:0.001},{speed:0.0004}
];

async function main() {
  console.log('🌌 Fetching GitHub data for', USERNAME);

  const user    = await fetchJSON(`https://api.github.com/users/${USERNAME}`);
  const allRepos = await fetchJSON(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed`);
  const events  = await fetchJSON(`https://api.github.com/users/${USERNAME}/events?per_page=100`);

  // Stats
  const totalStars = allRepos.reduce((s, r) => s + r.stargazers_count, 0);
  const recentCommits = events
    .filter(e => e.type === 'PushEvent')
    .reduce((s, e) => s + (e.payload.commits?.length || 0), 0);
  const langs = [...new Set(allRepos.map(r => r.language).filter(Boolean))];
  const archivedCount = allRepos.filter(r => r.archived).length;
  const openIssues = allRepos.reduce((s, r) => s + r.open_issues_count, 0);
  const activeSince = new Date(user.created_at).getFullYear();

  // Pick top 6 active + 1 archived for planets
  const active = allRepos
    .filter(r => !r.fork && !r.archived)
    .sort((a, b) => (b.stargazers_count * 3 + b.size) - (a.stargazers_count * 3 + a.size))
    .slice(0, 6);

  const archived = allRepos.filter(r => r.archived).slice(0, 1);
  const planetRepos = [...active, ...archived].slice(0, 7);

  // Build repos array string
  const reposStr = planetRepos.map((r, i) => {
    const lang = r.archived ? 'archived' : (LANG_MAP[r.language] || 'python');
    const moons = Math.min(r.forks_count, 2);
    const ang = (i * 1.1).toFixed(2);
    const spd = ORBITS[i]?.speed || 0.001;
    return `  { name: '${r.name.slice(0,14)}', lang: '${lang}', orbit: ${i}, speed: ${spd}, moons: ${moons}, ang: ${ang} }`;
  }).join(',\n');

  // Read HTML
  let html = fs.readFileSync('index.html', 'utf8');

  // Replace repos array
  html = html.replace(
    /const repos\s*=\s*\[[\s\S]*?\];/,
    `const repos = [\n${reposStr}\n];`
  );

  // Replace HUD stats - these match the pattern in the generated HTML
  const replacements = [
    [/('REPOS'\s*,\s*)\d+/, `$1${user.public_repos}`],
    [/('COMMITS'\s*,\s*)\d+/, `$1${recentCommits}`],
    [/('STARS'\s*,\s*)\d+/, `$1${totalStars}`],
    [/('LANGUAGES'\s*,\s*)\d+/, `$1${langs.length}`],
    [/('OPEN ISSUES'\s*,\s*)\d+/, `$1${openIssues}`],
    [/('ACTIVE SINCE'\s*,\s*)['"]?\d+['"]?/, `$12021`],
    [/REPOS.*?(\d{2,})/,  `REPOS      ${user.public_repos}`],
  ];

  replacements.forEach(([pattern, replacement]) => {
    html = html.replace(pattern, replacement);
  });

  fs.writeFileSync('index.html', html);

  console.log('✅ Done!');
  console.log(`   Repos: ${user.public_repos} | Stars: ${totalStars} | Langs: ${langs.length} | Issues: ${openIssues}`);
  console.log(`   Planets: ${planetRepos.map(r => r.name).join(', ')}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
