'use strict';
// Build the PLAYERS array from the MPFNL database and inject it into footy-fantasy.html.
//
// Pipeline (run when positional data is ready):
//   1. unzip MPFNL Database.xlsx  (PowerShell Expand-Archive)
//   2. node parse-xlsx.js          -> writes mpfnl_rows.json
//   3. node import-mpfnl.js        -> injects PLAYERS into footy-fantasy.html
//
// Expected columns (matched by header name, order-independent):
//   Name | Team | Division | Position | Games | Ranking Points | Price
// Position is OPTIONAL here — if absent the script still runs but warns and
// leaves pos empty. Add the Position column to the xlsx, re-run steps 1-3, done.

const fs = require('fs');
const path = require('path');

const ROWS = path.join(__dirname, 'mpfnl_rows.json');
const HTML = path.join(__dirname, 'footy-fantasy.html');

const rows = JSON.parse(fs.readFileSync(ROWS, 'utf8'));
const header = rows[0].map(h => (h || '').toString().trim().toLowerCase());

function col(...names) {
  for (const n of names) {
    const i = header.indexOf(n.toLowerCase());
    if (i !== -1) return i;
  }
  return -1;
}

const iName = col('name');
const iTeam = col('team');
const iDiv  = col('division', 'div');
const iPos  = col('position', 'pos');
const iRP   = col('ranking points', 'rp avg', 'rp', 'ranking points avg');

if (iName === -1 || iTeam === -1 || iRP === -1) {
  throw new Error(`Missing required column. Headers found: ${header.join(', ')}`);
}

function priceFromRP(rp) {
  return Math.round((rp / 150 * 730000) / 5000) * 5000; // nearest $5,000
}

function normPos(v) {
  const s = (v || '').toString().trim().toUpperCase();
  if (['DEF','MID','RUC','FWD'].includes(s)) return s;
  // tolerate common variants
  if (s.startsWith('DEF')) return 'DEF';
  if (s.startsWith('MID')) return 'MID';
  if (s.startsWith('RUC') || s === 'RUCK') return 'RUC';
  if (s.startsWith('FWD') || s.startsWith('FOR')) return 'FWD';
  return '';
}

let players = rows.slice(1)
  .filter(r => r[iName] && r[iTeam] && r[iRP] !== undefined && r[iRP] !== '')
  .map(r => ({
    name: r[iName].toString().trim(),
    team: r[iTeam].toString().trim(),
    division: iDiv !== -1 ? parseInt(r[iDiv], 10) : null,
    rp: Math.round(parseFloat(r[iRP]) * 10) / 10,
    pos: iPos !== -1 ? normPos(r[iPos]) : '',
    price: priceFromRP(parseFloat(r[iRP]))
  }));

// rank by RP desc
players.sort((a, b) => b.rp - a.rp);
players.forEach((p, i) => p.rank = i + 1);

// ---- report ----
const teams = [...new Set(players.map(p => p.team))].sort();
const divs = [...new Set(players.map(p => p.division))].sort();
const noPos = players.filter(p => !p.pos).length;
console.log(`Parsed ${players.length} players, ${teams.length} clubs, divisions: ${divs.join(', ')}`);
console.log(`Price range: ${Math.min(...players.map(p=>p.price))} - ${Math.max(...players.map(p=>p.price))}`);
if (iPos === -1) {
  console.log('WARNING: no Position column found — pos left empty. NOT injecting until positions exist.');
  process.exit(0);
}
if (noPos) console.log(`WARNING: ${noPos} players have an unrecognised/empty position.`);

// ---- inject ----
const playersJson = JSON.stringify(players.map(p => ({
  rank: p.rank, name: p.name, team: p.team, division: p.division, rp: p.rp, pos: p.pos, price: p.price
})));

let html = fs.readFileSync(HTML, 'utf8');
const before = html;
html = html.replace(/const PLAYERS = \[[\s\S]*?\];/, `const PLAYERS = ${playersJson};`);
if (html === before) throw new Error('Could not find PLAYERS array to replace');
fs.writeFileSync(HTML, html);
console.log('Injected MPFNL players into footy-fantasy.html');
