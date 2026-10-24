'use client';

import { Routes } from '@/routes';
import type { NestedMenuItem } from '@/types';
import { LayoutDashboardIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Get sidebar config with translations
 *
 * NOTICE: used in client components only
 *
 * @returns The sidebar config with translated titles and descriptions
 */
export function getSidebarLinks(): NestedMenuItem[] {
  const t = useTranslations('Dashboard');

  return [
    {
      title: t('dashboard.title'),
      icon: <LayoutDashboardIcon className="size-4 shrink-0" />,
      href: Routes.Dashboard,
      external: false,
    },
  ];
}
