import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock3, GraduationCap, MonitorSmartphone, RefreshCw, School, Users } from 'lucide-react';

import { presenceApi, type PresenceRange } from '../../api/presence.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

const ranges: Array<{ value: PresenceRange; label: string }> = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

const roleLabel = {
  PLATFORM_ADMIN: 'Platform admin',
  SCHOOL_ADMIN: 'School admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

function lastSeenLabel(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 20) return 'Now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function LiveActivity() {
  const [range, setRange] = useState<PresenceRange>('24h');
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['platform-live-activity', range],
    queryFn: () => presenceApi.getDashboard(range),
    refetchInterval: 30_000,
  });

  const maxTrend = Math.max(1, ...(data?.trend.map((point) => point.sessions) ?? [1]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Console"
        title="Live activity"
        meta="Current usage and authenticated session health"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as PresenceRange)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#B5E61D]"
              aria-label="Activity period"
            >
              {ranges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        }
      />

      {isError ? (
        <EmptyState title="Activity data could not be loaded. Refresh to try again." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active now" value={isLoading ? '-' : data?.metrics.activeUsers ?? 0} />
            <MetricCard label="Students online" value={isLoading ? '-' : data?.metrics.activeStudents ?? 0} />
            <MetricCard label="Teachers online" value={isLoading ? '-' : data?.metrics.activeTeachers ?? 0} />
            <MetricCard label="Logins today" value={isLoading ? '-' : data?.metrics.loginsToday ?? 0} />
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard compact label="Unique users" value={isLoading ? '-' : data?.metrics.uniqueUsers ?? 0} />
            <MetricCard compact label="Sessions" value={isLoading ? '-' : data?.metrics.sessions ?? 0} />
            <MetricCard compact label="Average session" value={isLoading ? '-' : `${data?.metrics.averageSessionMinutes ?? 0} min`} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-[#6d8f00]" aria-hidden="true" />
                  <h2 className="font-semibold text-[#101820]">Users online</h2>
                </div>
                <span className="text-xs font-medium text-slate-400">Updated every 30 seconds</span>
              </div>

              {!data?.activeUsers.length ? (
                <div className="p-5"><EmptyState title="No authenticated users are active right now." /></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.activeUsers.map((user) => (
                    <div key={user.userId} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_160px_110px] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                          <p className="truncate font-semibold text-[#101820]">{user.name}</p>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">{user.school.name} · {roleLabel[user.role]}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{user.module}</p>
                        <p className="mt-1 text-xs text-slate-400">{user.deviceType.toLowerCase()}</p>
                      </div>
                      <p className="text-sm font-medium text-slate-500 sm:text-right">{lastSeenLabel(user.lastSeenAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
              <div className="flex items-center gap-3">
                <School className="h-5 w-5 text-[#6d8f00]" aria-hidden="true" />
                <h2 className="font-semibold text-[#101820]">Active schools</h2>
              </div>
              {!data?.activeBySchool.length ? (
                <div className="mt-5"><EmptyState title="No schools active now." /></div>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.activeBySchool.map((school) => (
                    <div key={school.schoolId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#101820]">{school.name}</p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{school.code}</p>
                        </div>
                        <span className="rounded-full bg-[#101820] px-2.5 py-1 text-xs font-semibold text-white">{school.activeUsers}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{school.students} students · {school.teachers} teachers</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-[#6d8f00]" aria-hidden="true" />
                <h2 className="font-semibold text-[#101820]">Session trend</h2>
              </div>
              <div className="mt-6 flex h-44 items-end gap-1.5" aria-label="Session trend chart">
                {data?.trend.map((point, index) => (
                  <div key={`${point.label}-${index}`} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className="w-full min-w-[4px] rounded-t-md bg-[#B5E61D] transition hover:bg-[#9dca12]"
                      style={{ height: `${Math.max(4, (point.sessions / maxTrend) * 132)}px` }}
                      title={`${point.label}: ${point.sessions} sessions, ${point.uniqueUsers} users`}
                    />
                    {(data.trend.length <= 7 || index % Math.ceil(data.trend.length / 6) === 0) ? (
                      <span className="max-w-full truncate text-[10px] text-slate-400">{point.label}</span>
                    ) : <span className="h-[15px]" />}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
              <div className="flex items-center gap-3">
                <MonitorSmartphone className="h-5 w-5 text-[#6d8f00]" aria-hidden="true" />
                <h2 className="font-semibold text-[#101820]">Most used modules</h2>
              </div>
              {!data?.topModules.length ? (
                <div className="mt-5"><EmptyState title="No module activity in this period." /></div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {data.topModules.map((module) => (
                    <div key={module.name} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-medium text-[#101820]">{module.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{module.activeUsers} active now</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-600">{module.sessions} sessions</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="grid gap-4 rounded-[24px] border border-slate-200 bg-[#101820] p-5 text-white sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[#B5E61D]" aria-hidden="true" />
              <div><p className="text-xs text-white/55">Admins online</p><p className="mt-1 font-semibold">{data?.metrics.activeAdmins ?? 0}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-[#B5E61D]" aria-hidden="true" />
              <div><p className="text-xs text-white/55">Failed logins today</p><p className="mt-1 font-semibold">{data?.metrics.failedLoginsToday ?? 0}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-[#B5E61D]" aria-hidden="true" />
              <div><p className="text-xs text-white/55">Active definition</p><p className="mt-1 font-semibold">Past {Math.round((data?.activeWindowSeconds ?? 120) / 60)} minutes</p></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
