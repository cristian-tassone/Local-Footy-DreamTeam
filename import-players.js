'use strict';
// One-off: parse the AFL CSV and inject the player DB + team abbreviations into footy-fantasy.html
const fs = require('fs');
const path = require('path');

const CSV = path.join(__dirname, 'afl_dream_team_player_database.csv');
const HTML = path.join(__dirname, 'footy-fantasy.html');

const ABBR = {
  "Adelaide":"ADE", "Brisbane Lions":"BRL", "Carlton":"CAR", "Collingwood":"COL",
  "Essendon":"ESS", "Fremantle":"FRE", "Geelong":"GEE", "Gold Coast":"GCS",
  "Greater Western Sydney":"GWS", "Hawthorn":"HAW", "Melbourne":"MEL",
  "North Melbourne":"NTH", "Port Adelaide":"PTA", "Richmond":"RIC",
  "St Kilda":"STK", "Sydney":"SYD", "West Coast":"WCE", "Western Bulldogs":"WBD"
};

const lines = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter(l => l.trim());
lines.shift(); // header

let players = lines.map(line => {
  const [name, team, rp, pos, price] = line.split(',');
  return {
    name: name.trim(),
    team: team.trim(),
    rp: parseFloat(rp),
    pos: pos.trim(),
    price: parseInt(price, 10)
  };
});

// rank = overall RP rank (1 = highest)
players.sort((a, b) => b.rp - a.rp);
players.forEach((p, i) => p.rank = i + 1);

// sanity checks
const positions = [...new Set(players.map(p => p.pos))].sort();
const teams = [...new Set(players.map(p => p.team))].sort();
const missingAbbr = teams.filter(t => !ABBR[t]);
console.log(`Parsed ${players.length} players across ${teams.length} teams.`);
console.log(`Positions found: ${positions.join(', ')}`);
console.log(`Price range: ${Math.min(...players.map(p=>p.price))} - ${Math.max(...players.map(p=>p.price))}`);
if (missingAbbr.length) console.log(`WARNING: no abbreviation for: ${missingAbbr.join(', ')}`);
const badPos = players.filter(p => !['DEF','MID','FWD','RUC'].includes(p.pos));
if (badPos.length) console.log(`WARNING: unexpected positions: ${badPos.map(p=>p.name+':'+p.pos).join(', ')}`);

// order array by rank for a clean default
const playersJson = JSON.stringify(players.map(p => ({
  rank: p.rank, name: p.name, team: p.team, rp: p.rp, pos: p.pos, price: p.price
})));
const abbrJson = JSON.stringify(ABBR, null, 2)
  .replace(/^\{/, '{')
  .replace(/\n/g, '\n');

let html = fs.readFileSync(HTML, 'utf8');

const beforePlayers = html;
html = html.replace(/const PLAYERS = \[[\s\S]*?\];/, `const PLAYERS = ${playersJson};`);
if (html === beforePlayers) throw new Error('Could not find PLAYERS array to replace');

const beforeAbbr = html;
html = html.replace(/const TEAM_ABBR = \{[\s\S]*?\};/, `const TEAM_ABBR = ${abbrJson};`);
if (html === beforeAbbr) throw new Error('Could not find TEAM_ABBR to replace');

fs.writeFileSync(HTML, html);
console.log('Injected into footy-fantasy.html');
