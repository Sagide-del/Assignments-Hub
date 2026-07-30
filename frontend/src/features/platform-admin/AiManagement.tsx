import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiContentApi, type AiFeatureConfig } from '../../api/ai-content.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

function featureLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function FeatureRow({
  feature,
  isUpdating,
  onUpdate,
}: {
  feature: AiFeatureConfig;
  isUpdating: boolean;
  onUpdate: (update: {
    enabled?: boolean;
    previewOnly?: boolean;
    monthlyRequestLimit?: number;
  }) => void;
}) {
  const [limit, setLimit] = useState(feature.monthlyRequestLimit?.toString() ?? '');

  return (
    <div className="grid gap-4 border-t border-slate-100 px-4 py-4 first:border-t-0 lg:grid-cols-[1fr_130px_130px_150px_auto] lg:items-center">
      <div>
        <p className="text-sm font-semibold text-[#101820]">{featureLabel(feature.feature)}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 font-semibold ${feature.globallyEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            Global {feature.globallyEnabled ? 'on' : 'off'}
          </span>
          <span className={`rounded-full px-2 py-1 font-semibold ${feature.effectiveEnabled ? 'bg-lime-100 text-lime-800' : 'bg-amber-50 text-amber-700'}`}>
            Effective {feature.effectiveEnabled ? 'on' : 'off'}
          </span>
        </div>
      </div>

      <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600">
        Enabled
        <input
          type="checkbox"
          checked={feature.configuredEnabled}
          disabled={isUpdating}
          onChange={(event) => onUpdate({ enabled: event.target.checked })}
          className="h-4 w-4 accent-[#101820]"
        />
      </label>

      <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600">
        Preview
        <input
          type="checkbox"
          checked={feature.previewOnly}
          disabled={isUpdating}
          onChange={(event) => onUpdate({ previewOnly: event.target.checked })}
          className="h-4 w-4 accent-[#101820]"
        />
      </label>

      <label>
        <span className="sr-only">Monthly request limit</span>
        <input
          type="number"
          min={1}
          max={100000}
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          placeholder="Plan default"
          className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
        />
      </label>

      <button
        type="button"
        disabled={isUpdating || !limit || Number(limit) < 1}
        onClick={() => onUpdate({ monthlyRequestLimit: Number(limit) })}
        className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-[#101820] disabled:opacity-40"
      >
        Save limit
      </button>
    </div>
  );
}

export function AiManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const featuresQuery = useQuery({
    queryKey: ['ai-admin-features'],
    queryFn: () => aiContentApi.getAdminFeatures(),
  });
  const monitoringQuery = useQuery({
    queryKey: ['ai-admin-monitoring'],
    queryFn: aiContentApi.getMonitoring,
    refetchInterval: 30_000,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      value,
    }: {
      id: string;
      value: { enabled?: boolean; previewOnly?: boolean; monthlyRequestLimit?: number };
    }) => aiContentApi.updateAdminFeature(id, value),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['ai-admin-features'] });
    },
    onError: (updateError) =>
      setError(apiErrorMessage(updateError, 'Could not update the AI feature')),
  });

  const grouped = useMemo(() => {
    const entries = featuresQuery.data ?? [];
    const query = search.trim().toLowerCase();
    return entries.reduce<
      {
        school: AiFeatureConfig['school'];
        features: AiFeatureConfig[];
      }[]
    >((groups, feature) => {
      if (
        query &&
        !`${feature.school.name} ${feature.school.code}`.toLowerCase().includes(query)
      ) {
        return groups;
      }
      let group = groups.find((entry) => entry.school.id === feature.school.id);
      if (!group) {
        group = { school: feature.school, features: [] };
        groups.push(group);
      }
      group.features.push(feature);
      return groups;
    }, []);
  }, [featuresQuery.data, search]);

  const monitoring = monitoringQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform controls" title="AI Management" />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jobs · 30 days" value={monitoring?.jobs.total ?? '-'} />
        <MetricCard label="Succeeded" value={monitoring?.jobs.byStatus.SUCCEEDED ?? '-'} />
        <MetricCard label="Failure rate" value={monitoring ? `${monitoring.jobs.failureRatePercent}%` : '-'} />
        <MetricCard
          label="Average time"
          value={
            monitoring?.jobs.averageGenerationSeconds === null ||
            monitoring?.jobs.averageGenerationSeconds === undefined
              ? '-'
              : `${monitoring.jobs.averageGenerationSeconds}s`
          }
        />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#101820]">School feature controls</h2>
            <p className="mt-1 text-xs text-slate-500">Global environment switches must also be enabled.</p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search school or code"
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm sm:w-72"
          />
        </div>
      </section>

      {featuresQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading school controls...
        </div>
      ) : grouped.length ? (
        <div className="space-y-4">
          {grouped.map((group) => (
            <section key={group.school.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 py-4">
                <div>
                  <h3 className="font-semibold text-[#101820]">{group.school.name}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {group.school.code} · {group.school.subscriptionStatus}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {group.features.filter((feature) => feature.effectiveEnabled).length} active
                </span>
              </div>
              {group.features.map((feature) => (
                <FeatureRow
                  key={feature.id}
                  feature={feature}
                  isUpdating={update.isPending && update.variables?.id === feature.id}
                  onUpdate={(value) => update.mutate({ id: feature.id, value })}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No schools found" />
      )}

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-semibold text-[#101820]">Recent AI jobs</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Auto-refresh 30s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th className="px-5 py-3">School</th>
                <th className="px-5 py-3">Requested by</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Model</th>
                <th className="px-5 py-3">Tokens</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(monitoring?.recentJobs ?? []).map((job) => (
                <tr key={job.id}>
                  <td className="px-5 py-3 font-semibold text-[#101820]">{job.school.name}</td>
                  <td className="px-5 py-3 text-slate-600">{job.requestedBy.name}</td>
                  <td className="px-5 py-3 text-slate-500">{new Date(job.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-600">{job.model ?? '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{job.totalTokens ?? '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      job.status === 'SUCCEEDED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : job.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!monitoring?.recentJobs.length ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No AI jobs recorded in this period.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
