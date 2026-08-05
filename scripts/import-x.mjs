// ─────────────────────────────────────────────────────────────
// X(트위터) 데이터 아카이브 → 작업물로 가져오기
//
//   사용법:  X가져오기.cmd 더블클릭 → 아카이브 폴더를 창에 끌어다 놓기
//   또는:    node scripts/import-x.mjs "C:\경로\twitter-archive" [옵션]
//
//   옵션:  --답글포함   답글로 올린 것도 가져옴 (기본: 제외)
//          --리트윗포함  리트윗도 가져옴 (기본: 제외)
//          --글도포함   그림/영상 없는 순수 글도 가져옴 (기본: 제외)
// ─────────────────────────────────────────────────────────────

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKS = path.join(ROOT, 'src', 'content', 'works');
const ASSETS = path.join(ROOT, 'src', 'assets', 'works');
const PUBMEDIA = path.join(ROOT, 'public', 'works-media');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const archiveArg = args.find((a) => !a.startsWith('--'));

const WITH_REPLIES = flags.has('--답글포함');
const WITH_RETWEETS = flags.has('--리트윗포함');
const WITH_TEXT_ONLY = flags.has('--글도포함');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm']);

const say = (...a) => console.log(...a);
const die = (msg) => {
  console.error('\n  ✗ ' + msg + '\n');
  process.exit(1);
};

// ── 아카이브 안에서 필요한 것 찾기 ───────────────────────────

function findDataDir(start) {
  const tries = [start, path.join(start, 'data')];
  // 압축을 풀면 한 겹 더 들어가 있는 경우가 흔합니다
  if (fs.existsSync(start)) {
    for (const e of fs.readdirSync(start, { withFileTypes: true })) {
      if (e.isDirectory()) {
        tries.push(path.join(start, e.name));
        tries.push(path.join(start, e.name, 'data'));
      }
    }
  }
  for (const dir of tries) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    if (files.some((f) => /^tweets?(-part\d+)?\.js$/i.test(f))) return dir;
  }
  return null;
}

function readTweetFiles(dataDir) {
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => /^tweets?(-part\d+)?\.js$/i.test(f))
    .sort();
  const all = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dataDir, f), 'utf8');
    const start = raw.indexOf('[');
    if (start < 0) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw.slice(start));
    } catch (e) {
      say(`  ! ${f} 를 읽지 못했습니다 (${e.message})`);
      continue;
    }
    all.push(...parsed);
    say(`  · ${f} — ${parsed.length}건`);
  }
  return all.map((x) => x.tweet ?? x).filter(Boolean);
}

function findMediaDir(dataDir) {
  for (const name of ['tweets_media', 'tweet_media', 'tweets-media']) {
    const p = path.join(dataDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── 글 다듬기 ────────────────────────────────────────────────

const stripUrls = (s) => s.replace(/https?:\/\/t\.co\/\w+/g, '').trim();

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function makeTitle(text, date) {
  const first = stripUrls(text).split(/\r?\n/).find((l) => l.trim()) || '';
  const clean = first.replace(/^[@#\s]+/, '').trim();
  if (!clean) return `무제 (${date})`;
  return clean.length > 42 ? clean.slice(0, 42).trimEnd() + '…' : clean;
}

const yaml = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

// ── 본체 ────────────────────────────────────────────────────

async function main() {
  if (!archiveArg) die('아카이브 폴더 경로를 알려주세요.');

  const archive = path.resolve(archiveArg.replace(/^"|"$/g, ''));
  if (!fs.existsSync(archive)) die('그런 폴더가 없습니다: ' + archive);

  say('\n  X 아카이브를 뒤지는 중...\n');
  const dataDir = findDataDir(archive);
  if (!dataDir) {
    die(
      '아카이브 안에서 tweets.js 를 찾지 못했습니다.\n' +
        '    압축(.zip)을 먼저 푸신 뒤, 압축을 푼 폴더를 넣어주세요.\n' +
        '    그 안에 data 폴더와 Your archive.html 이 있어야 정상입니다.'
    );
  }
  say('  찾았습니다: ' + dataDir + '\n');

  const tweets = readTweetFiles(dataDir);
  if (!tweets.length) die('글을 하나도 읽지 못했습니다.');

  const mediaDir = findMediaDir(dataDir);
  if (!mediaDir) say('\n  ! 그림/영상 폴더(tweets_media)를 찾지 못했습니다. 글만 가져옵니다.');

  const mediaFiles = mediaDir ? fs.readdirSync(mediaDir) : [];
  const mediaByTweet = new Map();
  for (const f of mediaFiles) {
    const id = f.split('-')[0];
    if (!mediaByTweet.has(id)) mediaByTweet.set(id, []);
    mediaByTweet.get(id).push(f);
  }

  await fsp.mkdir(WORKS, { recursive: true });
  await fsp.mkdir(ASSETS, { recursive: true });

  const stat = { 리트윗: 0, 답글: 0, 미디어없음: 0, 이미있음: 0, 가져옴: 0, 그림: 0, 영상: 0 };

  for (const t of tweets) {
    const id = t.id_str || t.id;
    if (!id) continue;

    const text = decode(t.full_text ?? t.text ?? '');

    if (!WITH_RETWEETS && /^RT @/.test(text)) { stat.리트윗++; continue; }
    if (!WITH_REPLIES && (t.in_reply_to_status_id_str || t.in_reply_to_user_id_str)) { stat.답글++; continue; }

    const files = (mediaByTweet.get(id) || []).sort();
    const images = files.filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
    const videos = files.filter((f) => VIDEO_EXT.has(path.extname(f).toLowerCase()));

    if (!images.length && !videos.length && !WITH_TEXT_ONLY) { stat.미디어없음++; continue; }

    const mdPath = path.join(WORKS, `x-${id}.md`);
    if (fs.existsSync(mdPath)) { stat.이미있음++; continue; }

    const created = new Date(t.created_at);
    const date = Number.isNaN(created.valueOf())
      ? new Date().toISOString().slice(0, 10)
      : created.toISOString().slice(0, 10);

    // 그림 복사 (첫 장이 대표 이미지)
    const copied = [];
    for (const f of images) {
      const dest = `x-${id}-${copied.length + 1}${path.extname(f).toLowerCase()}`;
      await fsp.copyFile(path.join(mediaDir, f), path.join(ASSETS, dest));
      copied.push(dest);
      stat.그림++;
    }

    // 영상 복사
    const vids = [];
    if (videos.length) {
      await fsp.mkdir(PUBMEDIA, { recursive: true });
      for (const f of videos) {
        const dest = `x-${id}-${vids.length + 1}${path.extname(f).toLowerCase()}`;
        await fsp.copyFile(path.join(mediaDir, f), path.join(PUBMEDIA, dest));
        vids.push(dest);
        stat.영상++;
      }
    }

    const body = stripUrls(text);
    const extras = [];
    for (const v of vids) {
      extras.push(`<video src="/works-media/${v}" controls playsinline loop style="width:100%;border-radius:14px;"></video>`);
    }
    for (const img of copied.slice(1)) {
      extras.push(`![](../../assets/works/${img})`);
    }

    const fm = [
      '---',
      `title: ${yaml(makeTitle(text, date))}`,
      `date: ${date}`,
      'category: X 아카이브',
      body ? `summary: ${yaml(stripUrls(text).replace(/\s+/g, ' ').slice(0, 90))}` : null,
      copied.length ? `cover: ../../assets/works/${copied[0]}` : null,
      'draft: true',
      '---',
      '',
      body,
      '',
      ...extras,
      '',
      `<p style="font-size:.85rem;opacity:.6">원문: <a href="https://x.com/i/status/${id}">X에서 보기</a></p>`,
      '',
    ]
      .filter((l) => l !== null)
      .join('\n');

    await fsp.writeFile(mdPath, fm, 'utf8');
    stat.가져옴++;
  }

  say('');
  say('  ─────────────────────────────────');
  say(`  가져온 작업물   ${stat.가져옴}개`);
  say(`    그림 ${stat.그림}장 / 영상 ${stat.영상}개`);
  say('  ─────────────────────────────────');
  say(`  건너뜀 · 리트윗       ${stat.리트윗}`);
  say(`  건너뜀 · 답글         ${stat.답글}`);
  say(`  건너뜀 · 그림 없는 글 ${stat.미디어없음}`);
  say(`  건너뜀 · 이미 있음    ${stat.이미있음}`);
  say('  ─────────────────────────────────');
  say('');
  say('  전부 "숨김(draft)" 상태로 들어갔습니다.');
  say('  관리.cmd 를 열어서 보여줄 것만 골라 숨김을 풀고,');
  say('  나머지는 ✕ 로 지우시면 됩니다.');
  say('');
}

main().catch((e) => die(e.stack || e.message));
