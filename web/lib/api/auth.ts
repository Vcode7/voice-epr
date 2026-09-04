import { NextRequest, NextResponse } from 'next/server';

export interface ApiAuthResult {
  authorized: boolean;
  error?: string;
  statusCode?: number;
  clientInfo?: {
    apiKey?: string;
    clientId?: string;
  };
}

/**
 * Validates API request authorization.
 * 
 * In the initial implementation, authentication is disabled (all requests pass).
 * To enable authentication in the future:
 * 1. Set AUTH_REQUIRED = true or check process.env.API_AUTH_REQUIRED === 'true'
 * 2. Validate Authorization header (Bearer token) or x-api-key header
 */
export function validateApiRequest(req: NextRequest): ApiAuthResult {
  const authRequired = process.env.API_AUTH_REQUIRED === 'true';

  if (!authRequired) {
    // Open access: all requests are permitted
    return { authorized: true };
  }

  // Future-proof auth check: check for API key in header or Bearer token
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!apiKey) {
    return {
      authorized: false,
      error: 'Unauthorized: Missing API Key. Provide "x-api-key" or "Authorization: Bearer <key>" header.',
      statusCode: 401,
    };
  }

  // Optional: check configured keys
  const validKeys = (process.env.VALID_API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean);
  if (validKeys.length > 0 && !validKeys.includes(apiKey)) {
    return {
      authorized: false,
      error: 'Forbidden: Invalid API Key.',
      statusCode: 403,
    };
  }

  return {
    authorized: true,
    clientInfo: { apiKey },
  };
}

/**
 * Helper to generate standardized unauthorized responses
 */
export function unauthorizedResponse(authResult: ApiAuthResult): NextResponse {
  return NextResponse.json(
    {
      error: authResult.error || 'Unauthorized',
      status: authResult.statusCode || 401,
      message: 'Authentication is currently disabled by default. If enabled in configuration, please provide a valid API key.',
    },
    { status: authResult.statusCode || 401 }
  );
}
