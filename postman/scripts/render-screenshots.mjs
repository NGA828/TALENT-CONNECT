#!/usr/bin/env node
/*
 * Renders Postman-style screenshots from a newman JSON report.
 *
 *   node scripts/render-screenshots.mjs results/newman-run.json screenshots
 *
 * Every image is built from the real request that newman (Postman's CLI runner) sent and the
 * real response the API returned: method, URL, auth, body, status, time, size, response body
 * and the test results. The UI chrome imitates the Postman desktop app (light theme).
 *
 * Browser: uses playwright-core. Set CHROME_PATH to a Chrome/Chromium binary if Playwright's
 * bundled browsers are not installed (`npx playwright install chromium`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const reportPath = path.resolve(ROOT, process.argv[2] ?? 'results/newman-run.json');
const outDir = path.resolve(ROOT, process.argv[3] ?? 'screenshots');
const collection = JSON.parse(fs.readFileSync(path.join(ROOT, 'TalentConnect.postman_collection.json'), 'utf8'));
const environment = JSON.parse(fs.readFileSync(path.join(ROOT, 'TalentConnect.local.postman_environment.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// ─── fonts ───────────────────────────────────────────────────────────────────
const fontUrl = (pkg, file) => 'file://' + path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'files', file);
const FONT_CSS = [
  ...[400, 500, 600, 700].map((w) => `@font-face{font-family:Inter;font-weight:${w};src:url(${fontUrl('@fontsource/inter', `inter-latin-${w}-normal.woff2`)}) format('woff2')}`),
  ...[400, 500].map((w) => `@font-face{font-family:'IBM Plex Mono';font-weight:${w};src:url(${fontUrl('@fontsource/ibm-plex-mono', `ibm-plex-mono-latin-${w}-normal.woff2`)}) format('woff2')}`),
].join('\n');

// ─── helpers ─────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = (n) => String(n).padStart(2, '0');
const METHOD_COLOR = { GET: '#007f31', POST: '#ad7a03', PUT: '#0053b8', PATCH: '#623497', DELETE: '#8e1a10' };
const methodLabel = (m) => `<span class="m" style="color:${METHOD_COLOR[m] ?? '#555'}">${m === 'DELETE' ? 'DEL' : m}</span>`;
const fmtSize = (b) => (b >= 1024 ? `${(b / 1024).toFixed(2)} KB` : `${b} B`);
const STATUS_TEXT = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 413: 'Payload Too Large', 422: 'Unprocessable Entity', 429: 'Too Many Requests', 500: 'Internal Server Error' };

/** Highlight {{variables}} in a template string. */
const vars = (s) => esc(s).replace(/\{\{([^}]+)\}\}/g, '<span class="var">{{$1}}</span>');

/** Syntax-highlight a JSON string (already pretty printed) into numbered lines. */
function jsonLines(src, highlightVars = false) {
  const tok = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  return src.split('\n').map((line) => {
    let out = '';
    let last = 0;
    line.replace(tok, (m, str, colon, lit, num, idx) => {
      out += esc(line.slice(last, idx));
      if (str) {
        const inner = highlightVars ? vars(str) : esc(str);
        out += colon ? `<span class="k">${inner}</span>${esc(colon)}` : `<span class="s">${inner}</span>`;
      } else if (lit) out += `<span class="b">${lit}</span>`;
      else if (num) out += `<span class="n">${num}</span>`;
      last = idx + m.length;
      return m;
    });
    out += esc(line.slice(last));
    return out;
  });
}
const codeBlock = (lines, cls = '') =>
  `<div class="code ${cls}">${lines.map((l, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="tx">${l || ' '}</span></div>`).join('')}</div>`;

// Map collection structure → template items (with {{vars}} unresolved, as Postman shows them).
const folders = collection.item.map((f) => ({ name: f.name, items: f.item }));
const templateById = new Map();
for (const f of folders) for (const it of f.items) templateById.set(`${f.name}/${it.name}`, { folder: f.name, item: it });

const DD = '<svg class="ic" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const CAR_OPEN = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="#6b6b6b" stroke-width="1.4"/></svg>';
const CAR_CLOSED = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3.5 2l3 3-3 3" fill="none" stroke="#6b6b6b" stroke-width="1.4"/></svg>';
const DOT = '<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="#0cbb52"/></svg>';
const CLIP = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><path d="M21 11l-9 9a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8"/></svg>';
const PLAY = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" fill="#ff6c37"/></svg>';
const MENU = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 3h10M3 6h6M5 9h2" stroke="#9a9a9a" stroke-width="1.4"/></svg>';

// ─── page chrome ─────────────────────────────────────────────────────────────
const CSS = `
${FONT_CSS}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,sans-serif;font-size:12px;color:#212121;background:#fff;width:1600px;height:1000px;overflow:hidden}
.app{display:grid;grid-template-rows:48px 1fr 28px;height:1000px}
.top{display:flex;align-items:center;gap:18px;padding:0 14px;border-bottom:1px solid #e6e6e6;background:#fff}
.top .logo{width:26px;height:26px;border-radius:50%;background:#ff6c37;display:flex;align-items:center;justify-content:center}
.top .logo i{display:block;width:12px;height:12px;border-radius:50%;border:2.5px solid #fff;border-left-color:transparent;transform:rotate(-30deg)}
.top nav{display:flex;gap:18px;color:#6b6b6b;font-weight:500;font-size:13px}
.top nav b{color:#212121;font-weight:600}
.search{margin-left:auto;margin-right:auto;width:420px;height:30px;border-radius:6px;background:#f2f2f2;color:#8c8c8c;display:flex;align-items:center;padding:0 12px;font-size:12.5px}
.search kbd{margin-left:auto;font-family:Inter;font-size:11px;background:#fff;border:1px solid #ddd;border-radius:4px;padding:1px 6px;color:#777}
.tbtn{height:30px;padding:0 12px;border-radius:6px;display:flex;align-items:center;font-weight:600;font-size:12.5px}
.tbtn.inv{background:#f2f2f2}.tbtn.up{background:#097bed;color:#fff}
.avatar{width:28px;height:28px;border-radius:50%;background:#5b3cc4;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600}
.main{display:grid;grid-template-columns:64px 300px 1fr;min-height:0}
.rail{border-right:1px solid #e6e6e6;display:flex;flex-direction:column;align-items:center;padding-top:10px;gap:6px}
.rail div{width:54px;padding:7px 0;border-radius:6px;text-align:center;color:#6b6b6b;font-size:10.5px;font-weight:500}
.rail div.on{background:#ededed;color:#212121}
.rail svg{display:block;margin:0 auto 3px}
.side{border-right:1px solid #e6e6e6;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.ws{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eee}
.ws b{font-size:13px;font-weight:600}
.ws span{display:flex;gap:6px}.ws span i{font-style:normal;border:1px solid #d9d9d9;border-radius:5px;padding:3px 9px;font-weight:600;font-size:11.5px}
.filter{margin:8px 12px;height:28px;border:1px solid #e0e0e0;border-radius:5px;color:#9a9a9a;display:flex;align-items:center;padding:0 9px}
.tree{padding:2px 6px;font-size:12.5px;overflow:hidden;flex:1;min-height:0}
.row{display:flex;align-items:center;gap:6px;height:27px;padding:0 6px;border-radius:4px;white-space:nowrap;overflow:hidden}
.row .car{width:10px;color:#6b6b6b;font-size:9px}
.row.col{font-weight:600}
.row.f{padding-left:20px}
.row.r{padding-left:46px}
.row.r .m{width:34px;font-size:10px;font-weight:700;text-align:right;flex:none}
.row.sel{background:#e8e8e8}
.row .nm{overflow:hidden;text-overflow:ellipsis}
.fold{width:14px;height:11px;border:1.5px solid #6b6b6b;border-radius:2px;position:relative;flex:none}
.work{display:flex;flex-direction:column;min-width:0;min-height:0}
.tabs{display:flex;align-items:stretch;height:40px;border-bottom:1px solid #e6e6e6;background:#fafafa}
.tab{display:flex;align-items:center;gap:7px;padding:0 14px;border-right:1px solid #e6e6e6;max-width:280px;color:#6b6b6b;font-size:12.5px}
.tab .m{font-size:10px;font-weight:700}
.tab.on{background:#fff;color:#212121;box-shadow:inset 0 2px 0 #ff6c37}
.tab .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tab .x{color:#999;margin-left:4px}
.tabs .plus{padding:0 12px;display:flex;align-items:center;color:#777;font-size:16px}
.env{margin-left:auto;display:flex;align-items:center;gap:8px;padding:0 12px;border-left:1px solid #e6e6e6;color:#212121;font-size:12.5px}
.env .dd{border:1px solid #d9d9d9;border-radius:5px;padding:5px 10px;background:#fff;min-width:210px;display:flex;justify-content:space-between}
.crumb{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 6px}
.crumb .p{color:#6b6b6b;font-size:13px}.crumb .p b{color:#212121;font-weight:600}
.crumb .act{display:flex;gap:8px}.crumb .act i{font-style:normal;border:1px solid #d9d9d9;border-radius:5px;padding:4px 12px;font-weight:600;font-size:12px}
.urlbar{display:flex;gap:8px;padding:4px 16px 8px}
.url{flex:1;display:flex;height:36px;border:1px solid #d9d9d9;border-radius:6px;overflow:hidden}
.url .meth{width:108px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-weight:700;font-size:12.5px;border-right:1px solid #e3e3e3;background:#fff}
.url .addr{flex:1;display:flex;align-items:center;padding:0 12px;font-size:13px;white-space:nowrap;overflow:hidden}
.var{color:#e5582e}
.send{width:96px;border-radius:6px;background:#097bed;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;gap:10px}
.send i{font-style:normal;border-left:1px solid rgba(255,255,255,.35);padding-left:10px;font-size:10px}
.rtabs{display:flex;gap:20px;padding:0 16px;border-bottom:1px solid #eee;font-size:12.5px;color:#6b6b6b;height:34px;align-items:stretch}
.rtabs span{display:flex;align-items:center;gap:4px;position:relative}
.rtabs span.on{color:#212121;font-weight:500}
.rtabs span.on:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:#ff6c37}
.rtabs .dot{width:6px;height:6px;border-radius:50%;background:#0cbb52;display:inline-block}
.rtabs .cnt{color:#0a8a3e}
.rtabs .right{margin-left:auto;color:#097bed}
.req{height:270px;display:flex;flex-direction:column;border-bottom:1px solid #e6e6e6;min-height:0}
.sub{display:flex;gap:16px;align-items:center;padding:9px 16px;color:#6b6b6b;font-size:12px}
.sub .radio{display:flex;align-items:center;gap:5px}
.sub .radio i{width:12px;height:12px;border-radius:50%;border:1.5px solid #bdbdbd;display:inline-block}
.sub .radio.on{color:#212121}.sub .radio.on i{border:4px solid #ff6c37}
.sub .fmt{color:#097bed;font-weight:500}
.sub .beaut{margin-left:auto;color:#097bed}
.pane{flex:1;overflow:hidden;min-height:0}
.code{font-family:'IBM Plex Mono',monospace;font-size:12.5px;line-height:19px;padding:2px 0}
.ln{display:flex;white-space:pre}
.no{width:44px;text-align:right;padding-right:14px;color:#a8a8a8;flex:none;user-select:none}
.tx{flex:1;overflow:hidden;text-overflow:ellipsis}
.k{color:#a31515}.s{color:#0451a5}.n{color:#098658}.b{color:#0000ff;font-weight:500}
table.kv{width:calc(100% - 32px);margin:2px 16px;border-collapse:collapse;font-size:12.5px}
table.kv th{font-weight:600;color:#6b6b6b;text-align:left;padding:7px 10px;border:1px solid #e6e6e6;background:#fafafa}
table.kv td{padding:7px 10px;border:1px solid #e6e6e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px}
table.kv td.cb{width:30px;text-align:center}
.chk{display:inline-block;width:13px;height:13px;border-radius:3px;background:#ff6c37;position:relative;vertical-align:middle}
.chk:after{content:'';position:absolute;left:4px;top:1.5px;width:3px;height:7px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.ftype{color:#6b6b6b;font-size:11.5px;float:right}
.file{display:inline-flex;align-items:center;gap:6px;background:#f2f2f2;border-radius:4px;padding:2px 8px;font-size:12px}
.auth{display:grid;grid-template-columns:330px 1fr;gap:0;padding:14px 16px}
.auth .l{padding-right:20px;border-right:1px solid #eee;color:#6b6b6b;line-height:1.6}
.auth .l .sel{margin:6px 0 10px;border:1px solid #d9d9d9;border-radius:5px;padding:6px 10px;color:#212121;display:flex;justify-content:space-between;width:220px}
.auth .r{padding-left:20px;display:flex;align-items:center;gap:30px}
.auth .r .in{border:1px solid #d9d9d9;border-radius:5px;padding:7px 10px;width:420px;font-size:13px}
.empty{padding:40px;text-align:center;color:#8c8c8c}
.resp{flex:1;display:flex;flex-direction:column;min-height:0}
.rhead{display:flex;align-items:center;height:38px;padding:0 16px;border-bottom:1px solid #eee;gap:20px;font-size:12.5px;color:#6b6b6b}
.rhead span.on{color:#212121;font-weight:500;position:relative;height:38px;display:flex;align-items:center}
.rhead span.on:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:#ff6c37}
.rhead .meta{margin-left:auto;display:flex;gap:14px;align-items:center}
.pill{font-weight:600;padding:3px 8px;border-radius:4px}
.pill.ok{color:#007f31;background:#e5f5ec}.pill.err{color:#8e1a10;background:#fdecea}
.rhead .meta b{color:#007f31;font-weight:500}
.rhead .sv{border:1px solid #d9d9d9;border-radius:5px;padding:3px 10px;color:#212121;font-weight:500}
.rtool{display:flex;align-items:center;gap:8px;padding:8px 16px}
.seg{display:flex;background:#f2f2f2;border-radius:5px;padding:2px}
.seg span{padding:3px 10px;border-radius:4px;color:#6b6b6b}
.seg span.on{background:#fff;color:#212121;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.rtool .fmt{color:#097bed;font-weight:500;margin-left:6px}
.rbody{flex:1;overflow:hidden;min-height:0}
.tests{border-top:1px solid #eee;padding:8px 16px 10px;background:#fcfcfc}
.tests h4{font-size:12px;font-weight:600;margin-bottom:6px;color:#212121}
.tests h4 span{color:#6b6b6b;font-weight:400;margin-left:6px}
.tests .t{display:flex;align-items:center;gap:10px;height:21px;font-size:12.5px}
.badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;letter-spacing:.3px}
.badge.pass{background:#e5f5ec;color:#007f31}.badge.fail{background:#fdecea;color:#8e1a10}
.status{display:flex;align-items:center;gap:18px;padding:0 14px;border-top:1px solid #e6e6e6;color:#6b6b6b;font-size:11.5px}
.status .r{margin-left:auto;display:flex;gap:18px}
.status .g{color:#0a8a3e}
`;

const railIcon = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${d}</svg>`;
const RAIL = `
<div class="rail">
  <div class="on">${railIcon('<path d="M4 6h16v12H4z"/><path d="M4 10h16"/>')}Collections</div>
  <div>${railIcon('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>')}Environments</div>
  <div>${railIcon('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>')}History</div>
  <div>${railIcon('<path d="M5 5h5v5H5zM14 14h5v5h-5z"/><path d="M10 7.5h4v9"/>')}Flows</div>
</div>`;

function topBar() {
  return `<div class="top">
    <div class="logo"><i></i></div>
    <nav><b>Home</b><span>Workspaces</span><span>API Network</span></nav>
    <div class="search">Search Postman<kbd>Ctrl K</kbd></div>
    <div class="tbtn inv">Invite</div>
    <div class="tbtn up">Upgrade</div>
    <div class="avatar">TC</div>
  </div>`;
}

function sidebar(activeFolder, activeName) {
  let rows = `<div class="row col"><span class="car">${CAR_OPEN}</span>Talent Connect API</div>`;
  for (const f of folders) {
    const open = f.name === activeFolder;
    rows += `<div class="row f"><span class="car">${open ? CAR_OPEN : CAR_CLOSED}</span><span class="fold"></span><span class="nm">${esc(f.name)}</span></div>`;
    if (open) {
      for (const it of f.items) {
        rows += `<div class="row r${it.name === activeName ? ' sel' : ''}">${methodLabel(it.request.method)}<span class="nm">${esc(it.name)}</span></div>`;
      }
    }
  }
  return `<div class="side">
    <div class="ws"><b>Talent Connect</b><span><i>New</i><i>Import</i></span></div>
    <div class="filter">${MENU}&nbsp;&nbsp;Search collections</div>
    <div class="tree">${rows}</div>
  </div>`;
}

function statusBar(extra = '') {
  return `<div class="status"><span>${DOT} Online</span><span>Console</span><span>Postbot</span>${extra}<div class="r"><span>Runner</span><span>Start Proxy</span><span>Cookies</span><span>Vault</span><span>Trash</span></div></div>`;
}

// ─── request pane variants ───────────────────────────────────────────────────
function requestPane(tpl, exec) {
  const r = tpl.request;
  const hasBody = !!r.body;
  const query = r.url.query ?? [];
  const bearer = r.auth?.type === 'bearer' ? r.auth.bearer.find((b) => b.key === 'token')?.value : null;
  const headerCount = exec.request.header?.length ?? 0;
  const active = hasBody ? 'Body' : query.length ? 'Params' : 'Authorization';
  const tab = (name, label = name) => `<span class="${active === name ? 'on' : ''}">${label}</span>`;
  const tabs = `<div class="rtabs">
    ${tab('Params', `Params${query.length ? ' <span class="dot"></span>' : ''}`)}
    ${tab('Authorization', `Authorization${bearer ? ' <span class="dot"></span>' : ''}`)}
    ${tab('Headers', `Headers <span style="color:#8c8c8c">(${headerCount})</span>`)}
    ${tab('Body', `Body${hasBody ? ' <span class="dot"></span>' : ''}`)}
    <span>Scripts <span class="dot"></span></span>
    <span>Settings</span>
    <span class="right">Cookies</span>
  </div>`;

  let pane = '';
  if (active === 'Body' && r.body.mode === 'raw') {
    pane = `<div class="sub">
      ${['none', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary', 'GraphQL'].map((m) => `<span class="radio${m === 'raw' ? ' on' : ''}"><i></i>${m}</span>`).join('')}
      <span class="fmt">JSON ${DD}</span><span class="beaut">Beautify</span></div>
      <div class="pane">${codeBlock(jsonLines(r.body.raw, true))}</div>`;
  } else if (active === 'Body' && r.body.mode === 'formdata') {
    pane = `<div class="sub">
      ${['none', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary', 'GraphQL'].map((m) => `<span class="radio${m === 'form-data' ? ' on' : ''}"><i></i>${m}</span>`).join('')}
      <span class="beaut">Bulk Edit</span></div>
      <div class="pane"><table class="kv"><tr><th class="cb"></th><th style="width:30%">Key</th><th>Value</th><th style="width:22%">Description</th></tr>
      ${r.body.formdata
        .map(
          (f) => `<tr><td class="cb"><span class="chk"></span></td><td>${esc(f.key)}<span class="ftype">${f.type === 'file' ? 'File' : 'Text'} ${DD}</span></td>
          <td>${f.type === 'file' ? `<span class="file">${CLIP} ${esc(path.basename(f.src))}</span>` : vars(f.value)}</td><td></td></tr>`,
        )
        .join('')}
      <tr><td class="cb"></td><td style="color:#aaa">Key</td><td style="color:#aaa">Value</td><td style="color:#aaa">Description</td></tr></table></div>`;
  } else if (active === 'Params') {
    pane = `<div class="sub"><span style="color:#212121;font-weight:500">Query Params</span></div>
      <div class="pane"><table class="kv"><tr><th class="cb"></th><th style="width:30%">Key</th><th>Value</th><th style="width:22%">Description</th></tr>
      ${query.map((q) => `<tr><td class="cb"><span class="chk"></span></td><td>${esc(q.key)}</td><td>${vars(q.value)}</td><td></td></tr>`).join('')}
      <tr><td class="cb"></td><td style="color:#aaa">Key</td><td style="color:#aaa">Value</td><td style="color:#aaa">Description</td></tr></table></div>`;
  } else {
    pane = bearer
      ? `<div class="auth"><div class="l">Auth Type<div class="sel"><span>Bearer Token</span><span>${DD}</span></div>The authorization header will be automatically generated when you send the request.</div>
         <div class="r"><span>Token</span><div class="in">${vars(bearer)}</div></div></div>`
      : `<div class="auth"><div class="l">Auth Type<div class="sel"><span>No Auth</span><span>${DD}</span></div>This request does not use any authorization.</div>
         <div class="r" style="color:#8c8c8c">No authorization is required for this public endpoint.</div></div>`;
  }
  return `<div class="req">${tabs}${pane}</div>`;
}

function responsePane(exec) {
  const res = exec.response;
  const buf = Buffer.from(res.stream?.data ?? []);
  const raw = buf.toString('utf8');
  const ctype = (res.header ?? []).find((h) => h.key.toLowerCase() === 'content-type')?.value ?? '';
  let lines;
  let fmt = 'JSON';
  if (ctype.includes('json')) {
    try {
      lines = jsonLines(JSON.stringify(JSON.parse(raw), null, 4));
    } catch {
      lines = raw.split('\n').map(esc);
    }
  } else {
    fmt = ctype.includes('csv') ? 'Text' : 'HTML';
    lines = raw.split('\n').map(esc);
  }
  const passed = exec.assertions.filter((a) => !a.error).length;
  const total = exec.assertions.length;
  const ok = res.code < 400;
  const testsHtml = exec.assertions
    .map((a) => `<div class="t"><span class="badge ${a.error ? 'fail' : 'pass'}">${a.error ? 'FAIL' : 'PASS'}</span>${esc(a.assertion)}</div>`)
    .join('');
  return `<div class="resp">
    <div class="rhead">
      <span class="on">Body</span><span>Cookies</span><span>Headers <span style="color:#8c8c8c">(${res.header?.length ?? 0})</span></span>
      <span>Test Results <span class="cnt" style="color:${passed === total ? '#0a8a3e' : '#8e1a10'}">(${passed}/${total})</span></span>
      <div class="meta">
        <span class="pill ${ok ? 'ok' : 'err'}">${res.code} ${esc(res.status || STATUS_TEXT[res.code] || '')}</span>
        <span>•</span><span><b>${res.responseTime} ms</b></span><span>•</span><span><b>${fmtSize(res.responseSize ?? buf.length)}</b></span>
        <span class="sv">Save Response ${DD}</span>
      </div>
    </div>
    <div class="rtool"><div class="seg"><span class="on">Pretty</span><span>Raw</span><span>Preview</span><span>Visualize</span></div><span class="fmt">${fmt} ${DD}</span></div>
    <div class="rbody">${codeBlock(lines)}</div>
    <div class="tests"><h4>Test Results<span>${passed}/${total} passed</span></h4>${testsHtml}</div>
  </div>`;
}

function requestPage(folder, tpl, exec, openTabs) {
  const r = tpl.request;
  const urlRaw = r.url.raw;
  const tabs = openTabs
    .map((t) => `<div class="tab${t.name === tpl.name ? ' on' : ''}">${methodLabel(t.request.method)}<span class="nm">${esc(t.name)}</span><span class="x">×</span></div>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
  <div class="app">${topBar()}
    <div class="main">${RAIL}${sidebar(folder, tpl.name)}
      <div class="work">
        <div class="tabs">${tabs}<div class="plus">+</div><div class="env"><div class="dd"><span>${esc(environment.name)}</span><span>${DD}</span></div></div></div>
        <div class="crumb"><div class="p">Talent Connect API / ${esc(folder)} / <b>${esc(tpl.name)}</b></div><div class="act"><i>Save ${DD}</i><i>Share</i></div></div>
        <div class="urlbar"><div class="url"><div class="meth" style="color:${METHOD_COLOR[r.method]}">${r.method}<span style="color:#888">${DD}</span></div><div class="addr">${vars(urlRaw)}</div></div><div class="send">Send<i>${DD}</i></div></div>
        ${requestPane(tpl, exec)}
        ${responsePane(exec)}
      </div>
    </div>
    ${statusBar()}
  </div></body></html>`;
}

// ─── collection runner summary pages ─────────────────────────────────────────
function runnerPage(title, execs, stats, pageInfo) {
  const totalAll = report.run.stats.assertions.total;
  const passedAll = totalAll - report.run.stats.assertions.failed;
  const rows = execs
    .map((e) => {
      const res = e.response;
      const ok = res.code < 400;
      return `<div class="rr">
        <div class="rh">${methodLabel(e.request.method)}<b>${esc(e.item.name)}</b><span class="u">${esc(fullUrl(e.request.url))}</span>
          <span class="rs"><span class="pill ${ok ? 'ok' : 'err'}">${res.code} ${esc(res.status)}</span><span>${res.responseTime} ms</span><span>${fmtSize(res.responseSize ?? 0)}</span></span></div>
        ${e.assertions.map((a) => `<div class="rt"><span class="badge ${a.error ? 'fail' : 'pass'}">${a.error ? 'FAIL' : 'PASS'}</span>${esc(a.assertion)}</div>`).join('')}
      </div>`;
    })
    .join('');
  const css = `
  .run{padding:16px 24px;overflow:hidden}
  .run h2{font-size:18px;font-weight:600;display:flex;align-items:center;gap:10px}
  .run h2 small{font-size:12px;font-weight:500;color:#6b6b6b}
  .kpis{display:flex;gap:12px;margin:14px 0}
  .kpi{border:1px solid #e6e6e6;border-radius:8px;padding:10px 16px;min-width:150px}
  .kpi span{display:block;color:#6b6b6b;font-size:11.5px;margin-bottom:3px}.kpi b{font-size:18px;font-weight:600}
  .kpi b.g{color:#007f31}
  .filt{display:flex;gap:18px;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:8px;color:#6b6b6b;font-size:12.5px}
  .filt .on{color:#212121;font-weight:600}
  .rr{border-bottom:1px solid #f0f0f0;padding:7px 0}
  .rh{display:flex;align-items:center;gap:10px;font-size:12.5px;height:22px}
  .rh .m{font-size:10.5px;font-weight:700;width:40px}
  .rh b{font-weight:600}
  .rh .u{color:#6b6b6b;font-family:'IBM Plex Mono',monospace;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:600px}
  .rh .rs{margin-left:auto;display:flex;gap:14px;align-items:center;color:#6b6b6b}
  .rt{display:flex;align-items:center;gap:10px;padding-left:50px;height:19px;font-size:12px}
  .badge{font-size:9.5px}
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${css}</style></head><body>
  <div class="app">${topBar()}
    <div class="main">${RAIL}${sidebar(null, null)}
      <div class="work">
        <div class="tabs"><div class="tab on"><span class="m">${PLAY}</span><span class="nm">Runner – Talent Connect API</span><span class="x">×</span></div><div class="plus">+</div><div class="env"><div class="dd"><span>${esc(environment.name)}</span><span>${DD}</span></div></div></div>
        <div class="run">
          <h2>Talent Connect API – ${esc(title)} <small>${esc(pageInfo)}</small></h2>
          <div class="kpis">
            <div class="kpi"><span>Source</span><b style="font-size:14px">Runner</b></div>
            <div class="kpi"><span>Environment</span><b style="font-size:14px">${esc(environment.name)}</b></div>
            <div class="kpi"><span>Iterations</span><b>1</b></div>
            <div class="kpi"><span>Requests</span><b>${stats.requests}</b></div>
            <div class="kpi"><span>Duration</span><b>${stats.duration}</b></div>
            <div class="kpi"><span>Avg. Resp. Time</span><b>${stats.avg} ms</b></div>
          </div>
          <div class="filt"><span class="on">All Tests</span><span>Passed (${passedAll})</span><span>Failed (${totalAll - passedAll})</span><span>Skipped (0)</span></div>
          ${rows}
        </div>
      </div>
    </div>
    ${statusBar()}
  </div></body></html>`;
}

function fullUrl(u) {
  const q = (u.query ?? []).filter((x) => !x.disabled).map((x) => `${x.key}=${x.value}`).join('&');
  return `${u.protocol}://${u.host.join('.')}${u.port ? ':' + u.port : ''}/${u.path.join('/')}${q ? '?' + q : ''}`;
}

// ─── main ────────────────────────────────────────────────────────────────────
const executions = report.run.executions;
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const tmpHtml = path.join(outDir, '.render.html');

async function shoot(html, file) {
  fs.writeFileSync(tmpHtml, html);
  await page.goto('file://' + tmpHtml);
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
  });
  await page.screenshot({ path: file });
}

const index = [];
let n = 0;
for (const [fi, f] of folders.entries()) {
  const dir = path.join(outDir, `${pad(fi + 1)}-${slug(f.name.replace(/^\d+\s*·\s*/, ''))}`);
  fs.mkdirSync(dir, { recursive: true });
  const folderExecs = executions.filter((e) => templateById.get(`${f.name}/${e.item.name}`)?.folder === f.name);
  for (const [ii, exec] of folderExecs.entries()) {
    const tpl = templateById.get(`${f.name}/${exec.item.name}`).item;
    // Show the previous two requests of the folder as open tabs, like a real session.
    const openTabs = f.items.slice(Math.max(0, ii - 2), ii + 1);
    const file = path.join(dir, `${pad(ii + 1)}-${slug(tpl.name)}.png`);
    await shoot(requestPage(f.name, tpl, exec, openTabs), file);
    index.push({ folder: f.name, name: tpl.name, method: tpl.request.method, url: tpl.request.url.raw, code: exec.response.code, status: exec.response.status, ms: exec.response.responseTime, tests: `${exec.assertions.filter((a) => !a.error).length}/${exec.assertions.length}`, file: path.relative(outDir, file) });
    n++;
  }
}

// Runner summary screenshots (split so each page fits the viewport).
const t = report.run.timings;
const stats = {
  requests: executions.length,
  duration: `${((t.completed - t.started) / 1000).toFixed(1)}s`,
  avg: Math.round(t.responseAverage),
};
const runDir = path.join(outDir, '00-collection-runner');
fs.mkdirSync(runDir, { recursive: true });
const perPage = [];
let cur = [];
let lines = 0;
for (const e of executions) {
  const h = 1 + e.assertions.length;
  if (lines + h > 34 && cur.length) {
    perPage.push(cur);
    cur = [];
    lines = 0;
  }
  cur.push(e);
  lines += h + 0.4;
}
if (cur.length) perPage.push(cur);
for (const [pi, execs] of perPage.entries()) {
  await shoot(runnerPage('Run results', execs, stats, `page ${pi + 1} of ${perPage.length} · all ${report.run.stats.assertions.total} assertions ${report.run.stats.assertions.failed ? `(${report.run.stats.assertions.failed} failed)` : 'passed'}`), path.join(runDir, `runner-results-${pad(pi + 1)}.png`));
}
fs.rmSync(tmpHtml, { force: true });
await browser.close();

// Markdown index
const md = [
  '# Talent Connect – Postman API test screenshots',
  '',
  `Generated from a newman run on ${new Date(t.started).toISOString().replace('T', ' ').slice(0, 19)} UTC against a freshly seeded local API.`,
  '',
  `**${executions.length} requests · ${report.run.stats.assertions.total} assertions · ${report.run.stats.assertions.failed} failed · total ${stats.duration} · average response ${stats.avg} ms**`,
  '',
  '## Collection Runner',
  '',
  ...perPage.map((_, i) => `- [Runner results – page ${i + 1}](00-collection-runner/runner-results-${pad(i + 1)}.png)`),
  '',
];
let lastFolder = null;
for (const i of index) {
  if (i.folder !== lastFolder) {
    md.push('', `## ${i.folder}`, '', '| # | Request | Method & URL | Status | Time | Tests | Screenshot |', '| --- | --- | --- | --- | --- | --- | --- |');
    lastFolder = i.folder;
  }
  md.push(`| ${path.basename(i.file).slice(0, 2)} | ${i.name} | \`${i.method} ${i.url.replace('{{baseUrl}}', '')}\` | ${i.code} ${i.status} | ${i.ms} ms | ${i.tests}${i.tests.split("/")[0] === i.tests.split("/")[1] ? " ✅" : " ❌"} | [view](${i.file.replace(/ /g, '%20')}) |`);
}
fs.writeFileSync(path.join(outDir, 'README.md'), md.join('\n') + '\n');
console.log(`Rendered ${n} request screenshots and ${perPage.length} runner pages into ${path.relative(process.cwd(), outDir) || outDir}`);
