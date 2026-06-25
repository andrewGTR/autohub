import { NextRequest } from 'next/server';

const API_BASE = 'https://graduation-project-autohub-production.up.railway.app/api/ai';

export async function POST(req: NextRequest) {
  try {
    const headers: HeadersInit = {};
    const authHeader = req.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;
    const contentType = req.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    const body = await req.text();

    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      body,
    });

    // Return the response directly to stream it back to the client
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error(`Error proxying POST /chat/stream:`, error);
    return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
