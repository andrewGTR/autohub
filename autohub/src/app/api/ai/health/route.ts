import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://graduation-project-autohub-production.up.railway.app/api/ai';

export async function GET(req: NextRequest) {
  try {
    const headers: HeadersInit = {};
    const authHeader = req.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers,
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
    console.error(`Error proxying GET /health:`, error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
