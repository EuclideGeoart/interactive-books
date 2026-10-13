import { chapters, parts } from '../curriculum/registry';
export function GET() { return new Response(JSON.stringify({ parts, chapters }), { headers: { 'content-type': 'application/json' } }); }
