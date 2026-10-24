import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { LOCALES, routing } from './i18n/routing';
import { isKnownUnlocalizedPath } from './lib/routing/known-unlocalized-paths';
import { originalRequestUrl } from './lib/routing/request-url';

const intlMiddleware = createMiddleware(routing);

/**
 * Next.js middleware
 * https://nextjs.org/docs/app/building-your-application/routing/middleware
 *
 * Only handles locale routing; the app has no accounts, so there are no
 * session checks or protected routes.
 */
export default async function middleware(req: NextRequest) {
  // Even with skipMiddlewareUrlNormalize, nextUrl itself is normalized by Next.
  // next-intl reads nextUrl.search, so restore it from the original request URL.
  req.nextUrl.search = originalRequestUrl(req).search;
  const { nextUrl } = req;

  const hasLocalePrefix = pathnameHasLocale(nextUrl.pathname, LOCALES);
  if (!hasLocalePrefix && !isKnownUnlocalizedPath(nextUrl.pathname)) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
}

function pathnameHasLocale(pathname: string, locales: string[]): boolean {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return !!firstSegment && locales.includes(firstSegment);
}

/**
 * Next.js internationalized routing
 * specify the routes the middleware applies to
 *
 * https://next-intl.dev/docs/routing#base-path
 */
export const config = {
  // The `matcher` is relative to the `basePath`
  matcher: [
    // Match all pathnames except for
    // - if they start with `/api`, `/_next` or `/_vercel`
    // - if they contain a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
