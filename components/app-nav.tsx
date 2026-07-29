'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  FolderKanban,
  Inbox,
  Settings,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Navigation — INFORMATION_ARCHITECTURE.md.
 *
 * Desktop shows the full destination list; mobile shows exactly five
 * destinations. Every entry links to a route that exists and renders real data;
 * there are no placeholder items. Opportunities is absent because Phase 3 is
 * not enabled.
 */

/**
 * Only routes that are built and backed by real data appear here. The full
 * destination list in INFORMATION_ARCHITECTURE.md (Plan, Approvals, Home,
 * Fitness, Learning, Travel, Decisions) is added as each module lands —
 * see IMPLEMENTATION_STATUS.md. Listing a destination before it works would be
 * a dead navigation item, which AGENT_HANDOFF.md prohibits.
 */
const DESKTOP_LINKS = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/system/status', label: 'System status', icon: ShieldCheck },
] as const;

const MOBILE_LINKS = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/inbox', label: 'Capture', icon: Inbox },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  userEmail,
  displayName,
  signOutAction,
}: {
  userEmail: string;
  displayName: string | null;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      data-testid="nav-desktop"
      className="hidden w-60 shrink-0 border-r border-border bg-surface-sunken px-3 py-5 md:block"
    >
      <p className="px-2 text-xs font-semibold uppercase tracking-widest text-accent">
        Mission Control
      </p>
      <ul className="mt-5 space-y-0.5">
        {DESKTOP_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm',
                  active
                    ? 'bg-accent text-accent-contrast font-medium'
                    : 'text-text-muted hover:bg-surface-raised hover:text-text',
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 border-t border-border pt-4">
        <p className="truncate px-2 text-xs text-text-muted" title={userEmail}>
          {displayName ?? userEmail}
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-2 min-h-10 w-full rounded-md px-2.5 text-left text-sm text-text-muted hover:bg-surface-raised hover:text-text"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      data-testid="nav-mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]',
                  active ? 'text-accent font-medium' : 'text-text-muted',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
