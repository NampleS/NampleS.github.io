// ─────────────────────────────────────────────────────────────
// 사이트 기본 정보. 여기만 고치면 사이트 전체에 반영됩니다.
// 언어별로 세 줄씩 있으니 세 개 다 고쳐주세요.
// ─────────────────────────────────────────────────────────────

import type { Lang } from './i18n/ui';

/** 사이트 이름 (탭 제목, 왼쪽 위) */
export const siteName = 'NampleS';

export const text: Record<Lang, { eyebrow: string; headline: string; intro: string; description: string }> = {
  ko: {
    eyebrow: '애니메이션 · 일러스트 · 게임',
    headline: '움직이는 것을 만듭니다',
    intro:
      '애니메이션과 일러스트, 그리고 가끔 게임을 만듭니다. 캐릭터가 살아 움직이는 순간을 좋아합니다.',
    description: 'NampleS의 작업물과 기록, 직접 만든 미니게임.',
  },
  en: {
    eyebrow: 'Animation · Illustration · Games',
    headline: 'I make things that move',
    intro:
      'Animation and illustration, with the occasional small game. I like the moment a character starts to feel alive.',
    description: 'Works, notes and small browser games by NampleS.',
  },
  ja: {
    eyebrow: 'アニメーション · イラスト · ゲーム',
    headline: '動くものをつくっています',
    intro:
      'アニメーションとイラスト、たまに小さなゲームをつくります。キャラクターが動きだす瞬間が好きです。',
    description: 'NampleS の作品と記録、そして自作のミニゲーム。',
  },
};

/** 바닥과 소개 페이지에 뜨는 링크. 안 쓰는 건 줄째로 지우면 됩니다. */
export const links = [
  { label: 'X', text: '@s_nample', href: 'https://x.com/s_nample' },
  { label: 'YouTube', text: '@SpookyFlare', href: 'https://www.youtube.com/@SpookyFlare' },
  { label: 'Discord', text: 'spookyflare', copy: 'spookyflare' },
  { label: 'Discord Server', text: 'discord.gg/NmdeBpWCUw', href: 'https://discord.gg/NmdeBpWCUw' },
  { label: 'Email', text: 'b7784812@gmail.com', href: 'mailto:b7784812@gmail.com' },
] as const;

/** 위쪽 차림표 */
export const nav = [
  { key: 'nav_works', path: '/works/' },
  { key: 'nav_blog', path: '/blog/' },
  { key: 'nav_games', path: '/games/' },
  { key: 'nav_about', path: '/about/' },
] as const;

/** 글씨체 고르기 목록. 첫 번째가 기본값입니다. */
export const fonts = [
  { id: 'pen', label: { ko: '손글씨', en: 'Handwritten', ja: '手書き' } },
  { id: 'mincho', label: { ko: '명조', en: 'Serif', ja: '明朝' } },
  { id: 'gothic', label: { ko: '고딕', en: 'Sans', ja: 'ゴシック' } },
  { id: 'type', label: { ko: '타자기', en: 'Typewriter', ja: 'タイプ' } },
] as const;
