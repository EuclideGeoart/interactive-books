import type { APIRoute } from 'astro';
import { cleanSource } from '../../engine/source';
const files = import.meta.glob(['../../../cpp/chapter-00/*.{hpp,cpp}', '../../../cpp/chapter-0[2-9]/*.{hpp,cpp}', '../../../cpp/chapter-1[0-9]/*.{hpp,cpp}', '../../../cpp/chapter-2[0-3]/*.{hpp,cpp}', '../../../cpp/chapter-2[4-9]/*.{hpp,cpp}', '../../../cpp/chapter-3[0-6]/*.{hpp,cpp}', '../../../cpp/chapter-3[7-9]/*.{hpp,cpp}', '../../../cpp/chapter-4[0-4]/*.{hpp,cpp}', '../../../cpp/chapter-4[5-9]/*.{hpp,cpp}', '../../../cpp/chapter-50/*.{hpp,cpp}', '../../../cpp/chapter-5[1-9]/*.{hpp,cpp}', '../../../cpp/chapter-6[0-6]/*.{hpp,cpp}'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export function getStaticPaths() {
  return Object.entries(files).filter(([file]) => file.endsWith('.hpp') || file.endsWith('/main.cpp')).map(([file, source]) => ({ params: { path: file.split('/cpp/')[1] }, props: { source } }));
}
export const GET: APIRoute = ({ props }) => new Response(cleanSource(props.source), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
