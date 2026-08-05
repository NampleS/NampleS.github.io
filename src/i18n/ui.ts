// ─────────────────────────────────────────────────────────────
// 화면에 나오는 글자들. 세 언어를 여기서 다 관리합니다.
// ─────────────────────────────────────────────────────────────

export const languages = {
  ko: { label: '한국어', short: 'KO', locale: 'ko-KR' },
  en: { label: 'English', short: 'EN', locale: 'en-US' },
  ja: { label: '日本語', short: 'JA', locale: 'ja-JP' },
} as const;

export type Lang = keyof typeof languages;
export const langs = Object.keys(languages) as Lang[];
export const defaultLang: Lang = 'ko';

export const ui = {
  ko: {
    nav_works: '작업',
    nav_blog: '기록',
    nav_games: '게임',
    nav_about: '소개',
    cta_works: '작업 보기',
    cta_games: '게임 하기',
    see_all: '전부 보기',
    sec_works: '작업',
    sec_blog: '기록',
    sec_games: '게임',
    games_note: '설치 없이 바로',
    controls: '조작',
    empty_works: '아직 올린 작업이 없습니다.',
    empty_posts: '아직 쓴 글이 없습니다.',
    empty_games: '아직 올린 게임이 없습니다.',
    back_works: '작업 목록으로',
    back_blog: '기록 목록으로',
    coming_soon: '준비 중',
    count_works: '{n}개',
    count_posts: '글 {n}개',
    font_label: '글씨체',
    lang_label: '언어',
    about_doing: '하는 일',
    about_contact: '연락',
    about_contact_note: '작업 문의도, 그냥 인사도 환영합니다.',
    copied: '복사했습니다',
    no_translation: '이 글은 아직 한국어판만 있습니다.',
    doing_1: '2D 애니메이션 · 캐릭터 디자인',
    doing_2: '일러스트',
    doing_3: '브라우저에서 돌아가는 작은 게임',
  },
  en: {
    nav_works: 'Works',
    nav_blog: 'Notes',
    nav_games: 'Games',
    nav_about: 'About',
    cta_works: 'See works',
    cta_games: 'Play something',
    see_all: 'See all',
    sec_works: 'Works',
    sec_blog: 'Notes',
    sec_games: 'Games',
    games_note: 'No install. Just play.',
    controls: 'Controls',
    empty_works: 'Nothing here yet.',
    empty_posts: 'No notes yet.',
    empty_games: 'No games yet.',
    back_works: 'Back to works',
    back_blog: 'Back to notes',
    coming_soon: 'In progress',
    count_works: '{n} works',
    count_posts: '{n} notes',
    font_label: 'Typeface',
    lang_label: 'Language',
    about_doing: 'What I do',
    about_contact: 'Say hello',
    about_contact_note: 'Work enquiries and plain hellos are both welcome.',
    copied: 'Copied',
    no_translation: 'This piece is only written in Korean so far.',
    doing_1: '2D animation · character design',
    doing_2: 'Illustration',
    doing_3: 'Small games that run in a browser',
  },
  ja: {
    nav_works: '作品',
    nav_blog: '記録',
    nav_games: 'ゲーム',
    nav_about: 'プロフィール',
    cta_works: '作品を見る',
    cta_games: '遊んでみる',
    see_all: 'すべて見る',
    sec_works: '作品',
    sec_blog: '記録',
    sec_games: 'ゲーム',
    games_note: 'インストール不要',
    controls: '操作',
    empty_works: 'まだ何もありません。',
    empty_posts: 'まだ記録がありません。',
    empty_games: 'まだゲームがありません。',
    back_works: '作品一覧へ',
    back_blog: '記録一覧へ',
    coming_soon: '準備中',
    count_works: '{n}点',
    count_posts: '{n}件',
    font_label: '書体',
    lang_label: '言語',
    about_doing: 'やっていること',
    about_contact: '連絡先',
    about_contact_note: 'お仕事の相談も、ただの挨拶も歓迎です。',
    copied: 'コピーしました',
    no_translation: 'この記事は今のところ韓国語のみです。',
    doing_1: '2Dアニメーション・キャラクターデザイン',
    doing_2: 'イラスト',
    doing_3: 'ブラウザで動く小さなゲーム',
  },
} as const;

type Key = keyof (typeof ui)['ko'];

export function useT(lang: Lang) {
  return (key: Key, vars?: Record<string, string | number>) => {
    let s: string = (ui[lang] as Record<string, string>)[key] ?? ui[defaultLang][key];
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

/** '/works/' + 'en' → '/en/works/' (한국어는 접두사 없음) */
export function localize(path: string, lang: Lang): string {
  const p = path.startsWith('/') ? path : '/' + path;
  return lang === defaultLang ? p : `/${lang}${p}`;
}

/** 현재 주소에서 언어를 알아냅니다. */
export function langFromPath(pathname: string): Lang {
  const seg = pathname.split('/').filter(Boolean)[0];
  return (langs as string[]).includes(seg) ? (seg as Lang) : defaultLang;
}

/** 언어 전환 링크용 — 현재 경로에서 언어 부분만 갈아끼웁니다. */
export function swapLang(pathname: string, to: Lang): string {
  const parts = pathname.split('/').filter(Boolean);
  if ((langs as string[]).includes(parts[0])) parts.shift();
  return localize('/' + parts.join('/') + (parts.length ? '/' : ''), to);
}

export const dateFormat = (d: Date, lang: Lang) =>
  new Intl.DateTimeFormat(languages[lang].locale, {
    dateStyle: 'long',
    timeZone: 'Asia/Seoul',
  }).format(d);
