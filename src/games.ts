// ─────────────────────────────────────────────────────────────
// 게임 목록.
//
// 게임 추가하는 법:
//  1) public/games/ 안에 폴더를 하나 만들고 index.html 을 넣습니다.
//     (직접 만든 HTML 게임이든, 유니티 WebGL 빌드 결과물이든 상관없습니다)
//  2) 아래 목록에 한 덩어리 추가합니다. 세 언어를 다 적어주세요.
// ─────────────────────────────────────────────────────────────

import type { Lang } from './i18n/ui';

type L10n = Record<Lang, string>;

export type Game = {
  /** public/games/ 안의 폴더 이름 */
  slug: string;
  title: L10n;
  summary: L10n;
  controls: L10n;
  /** 아직 만드는 중이면 true — 목록에 '준비 중'으로 표시됩니다 */
  wip?: boolean;
};

export const games: Game[] = [
  {
    slug: 'star-catch',
    title: { ko: '별 받기', en: 'Star Catch', ja: '星ひろい' },
    summary: {
      ko: '떨어지는 별을 받고 폭탄은 피하세요. 목숨은 세 개.',
      en: 'Catch the falling stars, dodge the bombs. Three lives.',
      ja: '落ちてくる星を受けとめ、爆弾はよけて。ライフは3つ。',
    },
    controls: {
      ko: '← → 키 또는 화면 터치',
      en: 'Arrow keys or drag',
      ja: '矢印キーまたはドラッグ',
    },
  },
];
