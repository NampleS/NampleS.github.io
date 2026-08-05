import { getCollection, type CollectionEntry } from 'astro:content';

/** draft: true 인 글은 배포된 사이트에서만 숨깁니다 (내 컴퓨터 미리보기에는 보임). */
const visible = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;

const byNewest = (a: { data: { date: Date } }, b: { data: { date: Date } }) =>
  b.data.date.valueOf() - a.data.date.valueOf();

export async function getWorks(): Promise<CollectionEntry<'works'>[]> {
  return (await getCollection('works', visible)).sort(byNewest);
}

export async function getPosts(): Promise<CollectionEntry<'blog'>[]> {
  return (await getCollection('blog', visible)).sort(byNewest);
}

export const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' }).format(d);

/** 유튜브 주소를 embed 주소로 바꿔줍니다. */
export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}
