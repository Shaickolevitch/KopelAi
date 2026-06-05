import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') ?? 'US';
  const currency: 'NIS' | 'USD' = country === 'IL' ? 'NIS' : 'USD';
  return NextResponse.json({ currency, country });
}
