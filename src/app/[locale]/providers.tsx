'use client';

import { ActiveThemeProvider } from '@/components/layout/active-theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { websiteConfig } from '@/config/website';
import { ThemeProvider } from 'next-themes';
import type { PropsWithChildren } from 'react';

export function Providers({ children }: PropsWithChildren) {
  const defaultMode = websiteConfig.metadata.mode?.defaultMode ?? 'system';

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={defaultMode}
      enableSystem={true}
      disableTransitionOnChange
    >
      <ActiveThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </ActiveThemeProvider>
    </ThemeProvider>
  );
}
