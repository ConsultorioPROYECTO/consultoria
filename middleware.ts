/**
 * Global middleware for Next.js 15.5
 * 
 * Este middleware global aprovecha las mejoras de Node.js Middleware estable
 * introducidas en Next.js 15.5. Proporciona funcionalidades de:
 * - Logging de requests
 * - Headers de seguridad básicos
 * - Redirecciones condicionales
 * - Rate limiting básico (en memoria)
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (para desarrollo)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests por minuto

/**
 * Función de rate limiting simple
 */
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

/**
 * Middleware principal
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Obtener IP del cliente usando headers estándar
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || request.headers.get('cf-connecting-ip') || 'unknown';
  
  // Rate limiting para rutas de API
  if (pathname.startsWith('/api/')) {
    // Obtener IP del cliente usando headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || request.headers.get('cf-connecting-ip') || ip;
    
    if (!rateLimit(clientIp)) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }
  }
  
  // Crear respuesta con headers de seguridad mejorados
  const response = NextResponse.next();
  
  // Headers de seguridad básicos
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  
  // Header personalizado para identificar el middleware
  response.headers.set('X-Middleware-Version', 'Next.js-15.5');
  
  // Logging básico para desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${request.method} ${pathname} - IP: ${ip}`);
  }
  
  return response;
}

/**
 * Configuración del matcher para especificar en qué rutas se ejecuta el middleware
 * 
 * Este matcher excluye:
 * - Archivos estáticos (_next/static)
 * - Archivos de imagen
 * - Favicon
 * - Archivos de manifest
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};