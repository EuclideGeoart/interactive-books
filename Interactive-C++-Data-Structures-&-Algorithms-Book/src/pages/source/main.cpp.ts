import type { APIRoute } from 'astro';
import source from '../../../cpp/chapter-01/main.cpp?raw';
export const GET: APIRoute = () => new Response(source, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
