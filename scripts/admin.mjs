// ─────────────────────────────────────────────────────────────
// 내 전용 작업물 관리 화면.
// 내 컴퓨터에서만 열립니다 (127.0.0.1). 인터넷에는 절대 안 뜹니다.
//   실행: 관리.cmd 더블클릭  →  http://localhost:4600
// ─────────────────────────────────────────────────────────────

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKS = path.join(ROOT, 'src', 'content', 'works');
const ASSETS = path.join(ROOT, 'src', 'assets', 'works');
const TRASH = path.join(ROOT, '_휴지통');
const PORT = 4600;

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

// ── 프론트매터 읽기/쓰기 ─────────────────────────────────────

function parseFrontmatter(raw) {
  const m = raw.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let v = kv[2].trim();
    if (v === '') { data[key] = ''; continue; }
    if (v === 'true' || v === 'false') { data[key] = v === 'true'; continue; }
    if (v.startsWith('[') && v.endsWith(']')) {
      data[key] = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      continue;
    }
    data[key] = v.replace(/^["']|["']$/g, '');
  }
  return { data, body: m[2] };
}

const needsQuote = (s) =>
  s === '' || /^[\s"'#>|*&!%@`{}\[\],]|[:#]\s|\s$/.test(s) || /^(true|false|null|~|\d)/.test(s);

function quote(s) {
  return needsQuote(String(s)) ? `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : String(s);
}

const KEY_ORDER = ['title', 'date', 'category', 'summary', 'cover', 'video', 'featured', 'draft'];

function stringifyFrontmatter(data, body) {
  const lines = [];
  for (const key of KEY_ORDER) {
    const v = data[key];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'boolean') {
      if (v) lines.push(`${key}: true`);
      continue;
    }
    lines.push(`${key}: ${quote(v)}`);
  }
  for (const [key, v] of Object.entries(data)) {
    if (KEY_ORDER.includes(key) || v === undefined || v === null || v === '') continue;
    lines.push(`${key}: ${Array.isArray(v) ? `[${v.join(', ')}]` : quote(v)}`);
  }
  return `---\n${lines.join('\n')}\n---\n\n${(body || '').replace(/^\s+/, '')}`;
}

const toDateStr = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.valueOf())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
};

// ── 작업물 읽기 ──────────────────────────────────────────────

async function listWorks() {
  await fsp.mkdir(WORKS, { recursive: true });
  const files = (await fsp.readdir(WORKS)).filter((f) => f.toLowerCase().endsWith('.md'));
  const out = [];
  for (const file of files) {
    const raw = await fsp.readFile(path.join(WORKS, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const id = file.replace(/\.md$/i, '');
    const langMatch = id.match(/\.(en|ja)$/);
    out.push({
      id,
      lang: langMatch ? langMatch[1] : 'ko',
      file,
      title: data.title ?? '',
      date: toDateStr(data.date),
      category: data.category ?? '작업',
      summary: data.summary ?? '',
      cover: data.cover ?? '',
      coverName: data.cover ? path.basename(String(data.cover)) : '',
      video: data.video ?? '',
      featured: data.featured === true,
      draft: data.draft === true,
      body: body.trim(),
    });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)));
  return out;
}

async function writeWork(w) {
  const data = {
    title: w.title,
    date: toDateStr(w.date),
    category: w.category || '작업',
    summary: w.summary,
    cover: w.cover,
    video: w.video,
    featured: !!w.featured,
    draft: !!w.draft,
  };
  await fsp.writeFile(path.join(WORKS, `${w.id}.md`), stringifyFrontmatter(data, w.body), 'utf8');
}

// ── 삭제 = 휴지통으로 이동 (되돌릴 수 있게) ──────────────────

async function trashWork(id) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const dir = path.join(TRASH, `${stamp}_${id}`);
  await fsp.mkdir(dir, { recursive: true });

  const md = path.join(WORKS, `${id}.md`);
  if (!fs.existsSync(md)) throw new Error('그 작업물을 찾을 수 없습니다: ' + id);

  const { data } = parseFrontmatter(await fsp.readFile(md, 'utf8'));
  await fsp.rename(md, path.join(dir, `${id}.md`));

  if (data.cover) {
    const img = path.join(ASSETS, path.basename(String(data.cover)));
    if (fs.existsSync(img)) {
      // 다른 작업물이 같은 그림을 쓰고 있으면 그림은 남겨둡니다
      const stillUsed = (await listWorks()).some((w) => w.coverName === path.basename(String(data.cover)));
      if (!stillUsed) await fsp.rename(img, path.join(dir, path.basename(String(data.cover))));
    }
  }
  return dir;
}

// ── 새 작업물 만들기 (그림 올리기) ───────────────────────────

function slugify(name) {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return base || 'work';
}

async function uniqueName(dir, name, ext) {
  let n = name;
  let i = 2;
  while (fs.existsSync(path.join(dir, n + ext))) n = `${name}-${i++}`;
  return n;
}

async function addWorkFromImage(filename, buffer) {
  const ext = path.extname(filename).toLowerCase();
  if (!IMAGE_EXT.has(ext)) throw new Error('그림 파일이 아닙니다: ' + filename);

  await fsp.mkdir(ASSETS, { recursive: true });
  await fsp.mkdir(WORKS, { recursive: true });

  const base = slugify(filename);
  const imgBase = await uniqueName(ASSETS, base, ext);
  await fsp.writeFile(path.join(ASSETS, imgBase + ext), buffer);

  const id = await uniqueName(WORKS, base, '.md');
  await writeWork({
    id,
    title: path.basename(filename, path.extname(filename)),
    date: new Date().toISOString().slice(0, 10),
    category: '작업',
    summary: '',
    cover: `../../assets/works/${imgBase}${ext}`,
    video: '',
    featured: false,
    draft: false,
    body: '',
  });
  return id;
}

// ── HTTP ────────────────────────────────────────────────────

const json = (res, code, obj) => {
  const b = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': b.length });
  res.end(b);
};

function readBody(req, limit = 60 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('파일이 너무 큽니다 (60MB 넘음)')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      const b = Buffer.from(PAGE, 'utf8');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': b.length });
      return res.end(b);
    }

    if (req.method === 'GET' && url.pathname === '/api/works') {
      return json(res, 200, await listWorks());
    }

    if (req.method === 'GET' && url.pathname === '/api/thumb') {
      const name = path.basename(url.searchParams.get('f') || '');
      const file = path.join(ASSETS, name);
      if (!name || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      const buf = await fsp.readFile(file);
      res.writeHead(200, {
        'content-type': MIME[path.extname(name).toLowerCase()] || 'application/octet-stream',
        'content-length': buf.length,
        'cache-control': 'no-store',
      });
      return res.end(buf);
    }

    if (req.method === 'POST' && url.pathname === '/api/save') {
      const w = JSON.parse((await readBody(req)).toString('utf8'));
      const current = (await listWorks()).find((x) => x.id === w.id);
      if (!current) return json(res, 404, { error: '없는 작업물입니다' });
      await writeWork({ ...current, ...w, id: current.id });
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/delete') {
      const { id } = JSON.parse((await readBody(req)).toString('utf8'));
      const dir = await trashWork(String(id));
      return json(res, 200, { ok: true, movedTo: path.relative(ROOT, dir) });
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const filename = decodeURIComponent(req.headers['x-filename'] || '');
      if (!filename) return json(res, 400, { error: '파일 이름이 없습니다' });
      const id = await addWorkFromImage(filename, await readBody(req));
      return json(res, 200, { ok: true, id });
    }

    if (req.method === 'POST' && url.pathname === '/api/deploy') {
      const git = async (...args) => (await run('git', args, { cwd: ROOT, windowsHide: true })).stdout;
      await git('add', '-A');
      const status = await git('status', '--porcelain');
      if (!status.trim()) return json(res, 200, { ok: true, message: '바뀐 게 없습니다.' });
      await git('commit', '-m', `작업물 정리 ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
      await git('push');
      return json(res, 200, { ok: true, message: '올렸습니다. 1~2분 뒤 사이트에 반영됩니다.' });
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('없는 주소입니다');
  } catch (err) {
    json(res, 500, { error: String(err?.stderr || err?.message || err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  관리 화면이 열렸습니다.');
  console.log('  브라우저에서  ->  http://localhost:' + PORT);
  console.log('');
  console.log('  끄려면 이 창에서 Ctrl + C');
  console.log('');
});

// ── 화면 ────────────────────────────────────────────────────

const PAGE = /* html */ `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>작업물 관리</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Nanum+Pen+Script&family=Nanum+Gothic+Coding:wght@400;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box}
:root{--paper:#f0e9dc;--paper2:#e6dcca;--ink:#16130e;--soft:#6a6154;--faint:#b3a894;--accent:#c8401d}
@media (prefers-color-scheme:dark){:root{--paper:#14120e;--paper2:#1e1a14;--ink:#ece3d2;--soft:#948b7c;--faint:#4a4338;--accent:#ff6e42}}
body{margin:0;background:var(--paper);color:var(--ink);font-family:'Caveat','Nanum Pen Script',cursive;font-size:20px;line-height:1.55}
header{padding:1.4rem 0 0}
.bar{max-width:1200px;margin:0 auto;padding:0 1.5rem;display:flex;gap:1rem;align-items:baseline;flex-wrap:wrap}
h1{font-size:1.7rem;margin:0;letter-spacing:-.02em;transform:rotate(-1.4deg)}
.count{color:var(--soft);font-size:.8em}
.spacer{flex:1}
.rule{max-width:1200px;margin:1rem auto 0;padding:0 1.5rem;position:relative;height:12px}
.rule::after{content:'';position:absolute;left:1.5rem;right:1.5rem;top:3px;height:12px;border-top:1.6px solid var(--ink);filter:url(#wobble)}
button{position:relative;font:inherit;background:none;border:0;color:var(--ink);padding:.35rem 1.1rem;cursor:pointer}
button::before{content:'';position:absolute;inset:0;border:1.8px solid var(--ink);filter:url(#wobble)}
button:hover{color:var(--accent)}
button:hover::before{border-color:var(--accent)}
button.primary{color:var(--accent)}
button.primary::before{border-color:var(--accent);border-width:2.4px}
button:disabled{opacity:.45;cursor:default}
main{max-width:1200px;margin:0 auto;padding:1.8rem 1.5rem 5rem}
#drop{position:relative;padding:1.5rem;text-align:center;color:var(--soft);margin-bottom:2.2rem;font-size:.95em}
#drop::before{content:'';position:absolute;inset:0;border:2px dashed var(--faint);filter:url(#wobble)}
#drop.on{color:var(--accent)}
#drop.on::before{border-color:var(--accent)}
#pick{cursor:pointer;border-bottom:1.5px solid var(--accent)}
.grid{display:grid;gap:2.4rem 1.8rem;grid-template-columns:repeat(auto-fill,minmax(265px,1fr))}
.card{position:relative;display:flex;flex-direction:column}
.card:nth-child(3n+1){transform:rotate(-.6deg)}
.card:nth-child(3n+2){transform:rotate(.5deg)}
.card.gone{opacity:.3;pointer-events:none}
.thumb{position:relative;aspect-ratio:4/3;background:var(--paper2);display:grid;place-items:center;overflow:hidden}
.thumb::before{content:'';position:absolute;inset:-4px;border:1.6px solid var(--ink);filter:url(#wobble);pointer-events:none;z-index:2}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb .none{color:var(--faint);font-size:.8em;text-align:center;padding:1rem}
.badge{position:absolute;top:.5rem;left:.5rem;z-index:3;font-size:.7em;letter-spacing:.14em;text-transform:uppercase;color:var(--paper);background:var(--ink);padding:.05rem .45rem}
.x{position:absolute;top:-.7rem;right:-.7rem;z-index:4;width:34px;height:34px;padding:0;display:grid;place-items:center;font-size:1.1rem;line-height:1;background:var(--paper);color:var(--ink)}
.x::before{border-radius:50%}
.x:hover{color:var(--accent)}
.body{padding:.8rem .1rem 0;display:flex;flex-direction:column;gap:.3rem}
input,select,textarea{font:inherit;width:100%;background:transparent;color:var(--ink);border:0;border-bottom:1.4px solid transparent;padding:.15rem .1rem}
input:hover,select:hover,textarea:hover{border-bottom-color:var(--faint)}
input:focus,select:focus,textarea:focus{outline:none;border-bottom-color:var(--accent)}
.t-title{font-size:1.15em;font-weight:700}
.t-sum{font-size:.88em;color:var(--soft);resize:vertical;min-height:2.2rem;font-family:inherit}
.row{display:flex;gap:.6rem;align-items:center}
.row select{flex:1;font-size:.85em}
.row input[type=date]{width:auto;font-size:.8em;color:var(--soft);font-family:'Nanum Gothic Coding',monospace}
label.star{display:flex;align-items:center;gap:.3rem;font-size:.85em;color:var(--soft);cursor:pointer;white-space:nowrap}
label.star input{width:auto}
#toast{position:fixed;left:50%;bottom:1.6rem;transform:translate(-50%,220%);background:var(--ink);color:var(--paper);padding:.5rem 1.3rem;font-size:.9em;transition:transform .22s;z-index:50;max-width:90vw}
#toast.on{transform:translate(-50%,0)}
.empty{text-align:center;color:var(--faint);padding:4rem 1rem}
</style></head>
<body>
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <filter id="wobble" x="-15%" y="-60%" width="130%" height="220%">
    <feTurbulence type="fractalNoise" baseFrequency="0.013 0.021" numOctaves="3" seed="9" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="4.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
<header>
  <div class="bar">
    <h1>작업물 관리</h1><span class="count" id="count"></span>
    <span class="spacer"></span>
    <button id="reload">새로고침</button>
    <button id="deploy" class="primary">인터넷에 올리기</button>
  </div>
  <div class="rule"></div>
</header>

<main>
  <div id="drop">그림 파일을 여기로 끌어다 놓으면 작업물이 만들어집니다 &nbsp;·&nbsp; <u id="pick" style="cursor:pointer">직접 고르기</u>
    <input type="file" id="file" multiple accept="image/*" hidden/></div>
  <div class="grid" id="grid"></div>
</main>

<div id="toast"></div>

<script>
const $ = (s,r=document)=>r.querySelector(s);
const grid = $('#grid');
let works = [];

function toast(msg, ms=2600){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'), ms); }

async function api(path, opts){ const r = await fetch(path, opts); const j = await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||('오류 '+r.status)); return j; }

async function load(){
  works = await api('/api/works');
  $('#count').textContent = works.length + '개';
  grid.innerHTML = '';
  if(!works.length){ grid.innerHTML = '<p class="empty">아직 작업물이 없습니다.<br/>위에 그림을 끌어다 놓아보세요.</p>'; return; }
  const cats = [...new Set(works.map(w=>w.category).concat(['애니메이션','일러스트','게임','작업']))];
  for(const w of works) grid.appendChild(card(w, cats));
}

function card(w, cats){
  const el = document.createElement('div');
  el.className = 'card';
  const thumb = w.coverName
    ? '<img src="/api/thumb?f='+encodeURIComponent(w.coverName)+'" alt=""/>'
    : (w.video ? '<span class="none">유튜브 영상</span>' : '<span class="none">그림 없음</span>');
  const badge = w.lang && w.lang !== 'ko' ? '<span class="badge">'+w.lang+'</span>' : '';
  el.innerHTML =
    '<div class="thumb">'+badge+thumb+'</div>'+
    '<button class="x" title="삭제">✕</button>'+
    '<div class="body">'+
      '<input class="t-title" value="">'+
      '<textarea class="t-sum" rows="2" placeholder="한 줄 설명"></textarea>'+
      '<div class="row">'+
        '<select class="t-cat">'+cats.map(c=>'<option>'+c+'</option>').join('')+'</select>'+
        '<input type="date" class="t-date">'+
      '</div>'+
      '<div class="row">'+
        '<label class="star"><input type="checkbox" class="t-feat"> 홈에 띄우기</label>'+
        '<label class="star"><input type="checkbox" class="t-draft"> 숨기기</label>'+
      '</div>'+
    '</div>';

  const title = $('.t-title',el), sum = $('.t-sum',el), cat = $('.t-cat',el),
        date = $('.t-date',el), feat = $('.t-feat',el), draft = $('.t-draft',el);
  title.value = w.title; sum.value = w.summary; cat.value = w.category;
  date.value = w.date; feat.checked = w.featured; draft.checked = w.draft;

  const save = async () => {
    try{
      await api('/api/save', {method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ id:w.id, title:title.value, summary:sum.value, category:cat.value,
          date:date.value, featured:feat.checked, draft:draft.checked })});
      toast('저장했습니다');
    }catch(e){ toast('저장 실패: '+e.message, 5000); }
  };
  for(const n of [title,sum,date]) n.addEventListener('change', save);
  for(const n of [cat,feat,draft]) n.addEventListener('change', save);

  $('.x',el).addEventListener('click', async () => {
    if(!confirm('"'+(w.title||w.id)+'" 을(를) 삭제할까요?\\n\\n휴지통 폴더로 옮겨두니 나중에 되살릴 수 있습니다.')) return;
    el.classList.add('gone');
    try{ const r = await api('/api/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:w.id})});
      toast('삭제했습니다 → ' + r.movedTo); el.remove();
      works = works.filter(x=>x.id!==w.id); $('#count').textContent = works.length+'개';
    }catch(e){ el.classList.remove('gone'); toast('삭제 실패: '+e.message, 5000); }
  });
  return el;
}

// 그림 올리기
async function upload(files){
  let n = 0;
  for(const f of files){
    if(!f.type.startsWith('image/')) continue;
    try{
      await api('/api/upload', {method:'POST', headers:{'x-filename':encodeURIComponent(f.name)}, body: f});
      n++; toast('올리는 중... '+n+'/'+files.length);
    }catch(e){ toast(f.name+' 실패: '+e.message, 5000); }
  }
  if(n) { toast(n+'개 추가했습니다'); await load(); }
}
const drop = $('#drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{e.preventDefault();drop.classList.add('on');}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{e.preventDefault();drop.classList.remove('on');}));
drop.addEventListener('drop', e => upload(e.dataTransfer.files));
$('#pick').addEventListener('click', ()=>$('#file').click());
$('#file').addEventListener('change', e => upload(e.target.files));

$('#reload').addEventListener('click', load);
$('#deploy').addEventListener('click', async e => {
  e.target.disabled = true; toast('올리는 중...', 60000);
  try{ const r = await api('/api/deploy',{method:'POST'}); toast(r.message, 6000); }
  catch(err){ toast('실패: '+err.message, 9000); }
  finally{ e.target.disabled = false; }
});

load();
</script>
</body></html>`;
