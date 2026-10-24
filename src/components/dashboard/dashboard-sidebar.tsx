'use client';

import { SidebarMain } from '@/components/dashboard/sidebar-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { getSidebarLinks } from '@/config/sidebar-config';
import { LocaleLink } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { Logo } from '../layout/logo';

/**
 * Dashboard sidebar
 */
export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations();
  const sidebarLinks = getSidebarLinks();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <LocaleLink href={Routes.Root}>
                <Logo className="size-5" />
                <span className="truncate font-semibold text-base">
                  {t('Metadata.name')}
                </span>
              </LocaleLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMain items={sidebarLinks} />
      </SidebarContent>
    </Sidebar>
  );
}
