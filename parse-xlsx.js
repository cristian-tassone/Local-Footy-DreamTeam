'use strict';
// Parse the unzipped xlsx (sheet1) into rows. No external deps.
const fs = require('fs');
const path = require('path');

const X = process.argv[2] || (process.env.TEMP + '\\mpfnl_xlsx\\x');
const ssXml = fs.readFileSync(path.join(X, 'xl', 'sharedStrings.xml'), 'utf8');
const shXml = fs.readFileSync(path.join(X, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');

function decode(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&apos;/g,"'")
          .replace(/&#x([0-9a-fA-F]+);/g,(m,h)=>String.fromCodePoint(parseInt(h,16)))
          .replace(/&#(\d+);/g,(m,d)=>String.fromCodePoint(parseInt(d,10)));
}

// shared strings: each <si> may contain one <t> or several <r><t>
const shared = [];
const siRe = /<si>([\s\S]*?)<\/si>/g;
let m;
while ((m = siRe.exec(ssXml))) {
  const inner = m[1];
  let text = '';
  const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let tm;
  while ((tm = tRe.exec(inner))) text += tm[1];
  shared.push(decode(text));
}

function colToNum(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const rows = [];
const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
let rm;
while ((rm = rowRe.exec(shXml))) {
  const cells = [];
  const cRe = /<c r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>|<c r="([A-Z]+\d+)"([^>]*)\/>/g;
  let cm;
  while ((cm = cRe.exec(rm[1]))) {
    const ref = cm[1] || cm[4];
    const attrs = cm[2] || cm[5] || '';
    const body = cm[3] || '';
    const col = colToNum(ref);
    let val = '';
    const isStr = /t="s"/.test(attrs);
    const isInline = /t="inlineStr"/.test(attrs);
    const vMatch = body.match(/<v>([\s\S]*?)<\/v>/);
    if (isStr && vMatch) val = shared[parseInt(vMatch[1], 10)];
    else if (isInline) { const im = body.match(/<t[^>]*>([\s\S]*?)<\/t>/); val = im ? decode(im[1]) : ''; }
    else if (vMatch) val = decode(vMatch[1]);
    cells[col] = val;
  }
  rows.push(cells);
}

console.log('Total rows: ' + rows.length);
console.log('--- first 12 rows ---');
rows.slice(0, 12).forEach((r, i) => console.log(i + ': ' + JSON.stringify(r)));

// save full parse for later use
fs.writeFileSync(path.join(__dirname, 'mpfnl_rows.json'), JSON.stringify(rows));
console.log('Saved mpfnl_rows.json');
