import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://graduation-project-autohub-production.up.railway.app/api/ai';

export async function POST(req: NextRequest) {
  try {
    const headers: HeadersInit = {};
    const authHeader = req.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;
    const contentType = req.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    let body;
    try {
      body = await req.text();
    } catch (e) {
      // no body
    }

    const response = await fetch(`${API_BASE}/index`, {
      method: 'POST',
      headers,
      body: body || undefined,
    });

    let data;
    const resContentType = response.headers.get('content-type');
    if (resContentType && resContentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error(`Error proxying POST /index:`, error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
