import { env } from 'cloudflare:workers';
import { handleMcp } from '../../lib/site-mcp.mjs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => handleMcp(request, env);
export const GET = (request: Request) => handleMcp(request, env);
