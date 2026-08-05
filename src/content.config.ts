import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 작업물(포트폴리오) — src/content/works/*.md
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // 목록에서 최신순 정렬에 쓰입니다. 예: 2026-03-14
      date: z.coerce.date(),
      // 한 줄 설명 (썸네일 아래에 작게 뜹니다)
      summary: z.string().optional(),
      // 종류. 예: 애니메이션 / 일러스트 / 게임
      category: z.string().default('작업'),
      // 대표 이미지. src/assets/works/ 에 넣고 파일명을 적으세요.
      cover: image().optional(),
      // 유튜브 영상이 있으면 주소를 넣으세요.
      video: z.string().optional(),
      // 홈 화면에 크게 띄우고 싶으면 true
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

// 블로그 글 — src/content/blog/*.md
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      summary: z.string().optional(),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { works, blog };
