import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://graduation-project-autohub-production.up.railway.app/api/ai';

async function forwardRequest(req: NextRequest, endpoint: string, method: string) {
  try {
    const headers: HeadersInit = {};
    const authHeader = req.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;
    const contentType = req.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    let body = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await req.text();
      } catch (e) {
        // no body
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body,
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
    console.error(`Error proxying ${method} ${endpoint}:`, error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return forwardRequest(req, '/conversations', 'GET');
}

export async function POST(req: NextRequest) {
  return forwardRequest(req, '/conversations', 'POST');
}
