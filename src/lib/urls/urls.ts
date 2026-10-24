import { routing } from '@/i18n/routing';
import type { Locale } from 'next-intl';
import { resolveBaseUrl } from './base-url';

/**
 * Get the base URL of the application
 */
export function getBaseUrl(): string {
  return resolveBaseUrl({
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    PORT: process.env.PORT,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  });
}

/**
 * Check if the locale should be appended to the URL
 */
export function shouldAppendLocale(locale?: Locale | null): boolean {
  return !!locale && locale !== routing.defaultLocale && locale !== 'default';
}

/**
 * Get the URL of the application with the locale appended
 */
export function getUrlWithLocale(url: string, locale?: Locale | null): string {
  const baseUrl = getBaseUrl();
  return shouldAppendLocale(locale)
    ? `${baseUrl}/${locale}${url}`
    : `${baseUrl}${url}`;
}

/**
 * Get the URL of the image, if the image is a relative path, it will be prefixed with the base URL
 * @param image - The image URL
 * @returns The URL of the image
 */
export function getImageUrl(image: string): string {
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  if (image.startsWith('/')) {
    return `${getBaseUrl()}${image}`;
  }
  return `${getBaseUrl()}/${image}`;
}
