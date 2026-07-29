import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { withUser } from '@/lib/db/session';
import { serverEnv } from '@/lib/env';
import { Badge, Card, CardTitle } from '@/components/ui/primitives';
import { SignOutPanel } from '@/components/settings/sign-out-panel';
import { PreferencesForm } from '@/components/settings/preferences-form';
import { StarterDataPanel } from '@/components/settings/starter-data-panel';
import { ExportPanel } from '@/components/settings/export-panel';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

interface SettingsRow extends Record<string, unknown> {
  display_name: string | null;
  home_timezone: string;
  planning_horizon_days: number;
  default_transition_minutes: number;
  default_travel_buffer_minutes: number;
  contingency_percent: number;
  hard_daily_load_percent: number;
  sync_event_descriptions: boolean;
  starter_data_installed_at: Date | null;
  weekday_capacity_minutes: number | null;
  weekend_capacity_minutes: number | null;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const env = serverEnv();

  const settings = await withUser(user.id, async (db) => {
    const result = await db.query<SettingsRow>(
      `select p.display_name, p.home_timezone,
              up.planning_horizon_days, up.default_transition_minutes,
              up.default_travel_buffer_minutes, up.contingency_percent,
              up.hard_daily_load_percent, up.sync_event_descriptions,
              up.starter_data_installed_at,
              cp.weekday_capacity_minutes, cp.weekend_capacity_minutes
         from public.profiles p
         join public.user_preferences up on up.user_id = p.id
         left join public.capacity_profiles cp on cp.user_id = p.id
        where p.id = $1`,
      [user.id],
    );
    return result.rows[0] ?? null;
  });

  if (settings === null) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardTitle>Profile not initialised</CardTitle>
          <p className="mt-2 text-sm text-text-muted">
            Sign out and back in to create your profile records.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Signed in as {user.email}.</p>
      </header>

      <SignOutPanel />

      <PreferencesForm
        defaults={{
          displayName: settings.display_name ?? '',
          homeTimezone: settings.home_timezone,
          planningHorizonDays: settings.planning_horizon_days,
          defaultTransitionMinutes: settings.default_transition_minutes,
          defaultTravelBufferMinutes: settings.default_travel_buffer_minutes,
          contingencyPercent: settings.contingency_percent,
          hardDailyLoadPercent: settings.hard_daily_load_percent,
          weekdayCapacityMinutes: settings.weekday_capacity_minutes ?? 180,
          weekendCapacityMinutes: settings.weekend_capacity_minutes ?? 300,
          syncEventDescriptions: settings.sync_event_descriptions,
        }}
      />

      <Card>
        <CardTitle>Google Calendar</CardTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="warning">Not connected</Badge>
          <Badge>
            FEATURE_CALENDAR_READ = {env.FEATURE_CALENDAR_READ ? 'true' : 'false'}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          The Google Calendar integration is not built yet in this build. No calendar data
          has been read, and this application has never written to Google Calendar. See
          IMPLEMENTATION_STATUS.md for the exact state and the credentials required.
        </p>
      </Card>

      {env.FEATURE_STARTER_DATA && (
        <StarterDataPanel installed={settings.starter_data_installed_at !== null} />
      )}

      <ExportPanel />

      <Card>
        <CardTitle>Account deletion</CardTitle>
        <div className="mt-2">
          <Badge tone="warning">
            Disabled (FEATURE_ACCOUNT_DELETION ={' '}
            {env.FEATURE_ACCOUNT_DELETION ? 'true' : 'false'})
          </Badge>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Account deletion is not implemented in this build. It is intentionally absent
          rather than shown as a control that would not actually delete your data.
        </p>
      </Card>
    </div>
  );
}
