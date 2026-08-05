import { getCollection, type CollectionEntry } from 'astro:content';
import { langs, defaultLang, type Lang } from '../i18n/ui';

// ─────────────────────────────────────────────────────────────
// 여러 언어 다루는 법
//
//   works/봄날.md      ← 한국어 (기본, 반드시 있어야 함)
//   works/봄날.en.md   ← 영어판 (없으면 한국어판이 대신 나옴)
//   works/봄날.ja.md   ← 일본어판
//
// 파일 이름 뒤에 .en / .ja 만 붙이면 됩니다. 주소는 셋 다 /works/봄날/ 입니다.
// ─────────────────────────────────────────────────────────────

/** '봄날.en' → { base: '봄날', lang: 'en' } */
export function splitId(id: string): { base: string; lang: Lang } {
  const m = id.match(/^(.*)\.([a-z]{2})$/);
  if (m && (langs as string[]).includes(m[2])) return { base: m[1], lang: m[2] as Lang };
  return { base: id, lang: defaultLang };
}

const isVisible = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;
const byNewest = (a: { data: { date: Date } }, b: { data: { date: Date } }) =>
  b.data.date.valueOf() - a.data.date.valueOf();

export type Localized<T> = { base: string; lang: Lang; translated: boolean; entry: T };

function pickLanguage<T extends { id: string; data: { draft: boolean } }>(
  entries: T[],
  lang: Lang
): Localized<T>[] {
  const groups = new Map<string, Partial<Record<Lang, T>>>();
  for (const entry of entries) {
    const { base, lang: l } = splitId(entry.id);
    if (!groups.has(base)) groups.set(base, {});
    groups.get(base)![l] = entry;
  }

  const out: Localized<T>[] = [];
  for (const [base, byLang] of groups) {
    // 한국어판이 없으면 그 작업물은 없는 것으로 칩니다 (번역본만 덩그러니 남는 걸 막음)
    const fallback = byLang[defaultLang];
    if (!fallback) continue;
    const chosen = byLang[lang] ?? fallback;
    if (!isVisible(chosen)) continue;
    out.push({ base, lang, translated: Boolean(byLang[lang]), entry: chosen });
  }
  return out;
}

export async function getWorks(lang: Lang): Promise<Localized<CollectionEntry<'works'>>[]> {
  const all = await getCollection('works');
  return pickLanguage(all, lang).sort((a, b) => byNewest(a.entry, b.entry));
}

export async function getPosts(lang: Lang): Promise<Localized<CollectionEntry<'blog'>>[]> {
  const all = await getCollection('blog');
  return pickLanguage(all, lang).sort((a, b) => byNewest(a.entry, b.entry));
}

/** 유튜브 주소를 embed 주소로 바꿔줍니다. */
export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}
