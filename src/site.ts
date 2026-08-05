// ─────────────────────────────────────────────────────────────
// 사이트 기본 정보. 여기만 고치면 사이트 전체에 반영됩니다.
// ─────────────────────────────────────────────────────────────

export const site = {
  /** 사이트 이름 (탭 제목, 왼쪽 위 로고) */
  name: 'NampleS',

  /** 홈 화면 큰 제목 */
  headline: '움직이는 것을 만듭니다',

  /** 홈 화면 소개 문단 */
  intro:
    '애니메이션과 일러스트, 그리고 가끔 게임을 만듭니다. 캐릭터가 살아 움직이는 순간을 좋아합니다.',

  /** 홈 화면 이름 위에 붙는 작은 글씨 */
  eyebrow: '애니메이션 · 일러스트 · 게임',

  /** 사이트 설명 (검색 결과에 뜨는 문구) */
  description:
    'NampleS의 개인 사이트. 애니메이션·일러스트 작업물과 작업 기록, 직접 만든 미니게임을 모아둔 곳입니다.',

  /** 바닥과 소개에 뜨는 링크. 안 쓰는 건 지우면 됩니다. */
  links: [
    { label: '이메일', href: 'mailto:b7784812@gmail.com' },
    { label: 'GitHub', href: 'https://github.com/NampleS' },
    // { label: '인스타그램', href: 'https://instagram.com/아이디' },
    // { label: '유튜브', href: 'https://youtube.com/@아이디' },
    // { label: 'X (트위터)', href: 'https://x.com/아이디' },
  ],
} as const;

export const nav = [
  { label: '작업', href: '/works/' },
  { label: '기록', href: '/blog/' },
  { label: '게임', href: '/games/' },
  { label: '소개', href: '/about/' },
];
