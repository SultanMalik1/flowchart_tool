import type { WebsiteConfig } from '@/types';

/**
 * website config, without translations
 *
 * docs:
 * https://mksaas.com/docs/config/website
 */
export const websiteConfig: WebsiteConfig = {
  metadata: {
    theme: {
      defaultTheme: 'default',
      enableSwitch: true,
    },
    mode: {
      defaultMode: 'system',
      enableSwitch: true,
    },
    images: {
      ogImage: '/og.png',
      logoLight: '/logo.png',
      logoDark: '/logo.png',
    },
    social: {
      github: 'https://github.com/tanchaowen84/flowchartai',
      twitter: 'https://x.com/tanchaowen84',
      discord: 'https://discord.gg/EhuSZNHNQh',
    },
  },
  features: {
    enableDiscordWidget: false,
    enableAffonsoAffiliate: false,
    enablePromotekitAffiliate: false,
    enableDocsPage: false,
    enableAIPages: false,
  },
  analytics: {
    enableVercelAnalytics: false,
    enableSpeedInsights: false,
  },
  i18n: {
    defaultLocale: 'en',
    locales: {
      en: {
        flag: '🇺🇸',
        name: 'English',
      },
    },
  },
  blog: {
    paginationSize: 6,
    relatedPostsSize: 3,
  },
  mail: {
    provider: 'resend',
    fromEmail: 'FlowChart AI Support <support@flowchartai.org>',
    supportEmail: 'FlowChart AI Support <support@flowchartai.org>',
  },
  newsletter: {
    provider: 'resend',
  },
};
