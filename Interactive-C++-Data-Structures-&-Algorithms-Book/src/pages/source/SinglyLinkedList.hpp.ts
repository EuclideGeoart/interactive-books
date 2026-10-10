import type { APIRoute } from 'astro';
import source from '../../../cpp/chapter-01/SinglyLinkedList.hpp?raw';
import { cleanSource } from '../../engine/source';
export const GET: APIRoute = () => new Response(cleanSource(source), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
