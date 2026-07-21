import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { schoolsApi } from '../../api/schools.api';
import { uploadsApi } from '../../api/uploads.api';
import { useAuthStore } from '../../store/auth.store';
import type { School } from '../../types';
import { SCHOOL_THEME_TEMPLATES, resolveSchoolTheme, type SchoolThemeTemplate } from '../../themes/schoolTheme';

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M6.5 16l3.6-3.6a1 1 0 0 1 1.4 0l2.4 2.4 1.5-1.5a1 1 0 0 1 1.4 0L19 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 4a8 8 0 1 0 0 16h1.2a2.3 2.3 0 0 0 0-4.6h-.7a1.6 1.6 0 0 1-1.4-2.4l.6-1A4.6 4.6 0 0 0 12 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
      <circle cx="11" cy="8" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M8 9.5h8M8 13h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M6 12.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SchoolLogo({
  src,
  schoolName,
  size = 'lg',
}: {
  src?: string | null;
  schoolName: string;
  size?: 'lg' | 'sm';
}) {
  const className = size === 'lg' ? 'h-18 w-18 rounded-3xl' : 'h-12 w-12 rounded-2xl';

  return (
    <div className={`${className} flex items-center justify-center overflow-hidden border border-black/5 bg-white shadow-sm`}>
      {src ? (
        <img src={src} alt={schoolName} className="h-full w-full object-contain p-2" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
          {schoolName
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || 'AH'}
        </div>
      )}
    </div>
  );
}

function ThemeChip({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

export function BrandingSettings() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<SchoolThemeTemplate>('ACADEMIC_NAVY');
  const [draftLogoUrl, setDraftLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: school } = useQuery({
    queryKey: ['school', user?.schoolId],
    queryFn: () => schoolsApi.findOne(user!.schoolId),
    enabled: !!user?.schoolId,
  });

  useEffect(() => {
    if (school?.themeTemplate) {
      setSelectedTheme(school.themeTemplate);
    }
    if (school?.logoUrl) {
      setDraftLogoUrl(school.logoUrl);
    }
  }, [school?.logoUrl, school?.themeTemplate]);

  const previewTheme = useMemo(() => resolveSchoolTheme(selectedTheme), [selectedTheme]);
  const previewLogo = draftLogoUrl ?? school?.logoUrl ?? null;
  const schoolName = school?.name ?? 'Your School';
  const schoolCode = school?.code ?? 'SCHOOL CODE';
  const schoolType = school?.type === 'BOARDING' ? 'Boarding School' : 'Day School';

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Pick<School, 'logoUrl' | 'themeTemplate'>>) => schoolsApi.update(user!.schoolId, patch),
    onSuccess: async () => {
      setStatus('School branding updated.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['school', user?.schoolId] }),
        queryClient.invalidateQueries({ queryKey: ['school'] }),
      ]);
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Could not update school branding')),
  });

  async function handleLogoUpload(file: File) {
    const isPng = file.type === 'image/png' && file.name.toLowerCase().endsWith('.png');
    if (!isPng) {
      setStatus('Only PNG logo files are allowed.');
      return;
    }

    setUploading(true);
    setStatus('Uploading school logo...');
    try {
      const result = await uploadsApi.uploadSingle(file);
      setDraftLogoUrl(result.url);
      setStatus('PNG logo uploaded. Save branding to apply it school-wide.');
    } catch (error) {
      setStatus(apiErrorMessage(error, 'Logo upload failed'));
    } finally {
      setUploading(false);
    }
  }

  function handleSaveBranding() {
    setStatus(null);
    updateMutation.mutate({
      themeTemplate: selectedTheme,
      logoUrl: draftLogoUrl ?? undefined,
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(16,24,32,0.07)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">School branding</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#101820]">School identity foundation</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Configure a controlled branding layer for your school. Students will experience a consistent
              school identity through the logo, approved theme template, and a branded portal preview.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">School code</p>
              <p className="mt-2 text-sm font-semibold text-[#101820]">{schoolCode}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">School type</p>
              <p className="mt-2 text-sm font-semibold text-[#101820]">{schoolType}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Theme template</p>
              <p className="mt-2 text-sm font-semibold text-[#101820]">{SCHOOL_THEME_TEMPLATES[selectedTheme].label}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.08fr]">
        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
                <ImageIcon />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">School logo</p>
                <h2 className="mt-1 text-xl font-semibold text-[#101820]">PNG-only logo upload</h2>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              <SchoolLogo src={previewLogo} schoolName={schoolName} />
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-600">
                  Upload a transparent or white-background PNG logo for the student portal, school admin
                  pages, and future branded experiences.
                </p>
                <input
                  type="file"
                  accept=".png,image/png"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleLogoUpload(file);
                    }
                    event.currentTarget.value = '';
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#101820] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-900"
                />
                <p className="text-xs text-slate-400">Accepted format: PNG only. Other file types are rejected.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
                <PaletteIcon />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Theme selection</p>
                <h2 className="mt-1 text-xl font-semibold text-[#101820]">Approved school themes</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {(
                Object.entries(SCHOOL_THEME_TEMPLATES) as [
                  SchoolThemeTemplate,
                  (typeof SCHOOL_THEME_TEMPLATES)[SchoolThemeTemplate],
                ][]
              ).map(([key, theme]) => {
                const isActive = selectedTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTheme(key)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      isActive ? 'shadow-[0_14px_30px_rgba(16,24,32,0.08)]' : 'hover:border-slate-300'
                    }`}
                    style={{
                      borderColor: isActive ? theme.accent : '#e2e8f0',
                      backgroundColor: isActive ? theme.background : '#ffffff',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#101820]">{theme.label}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Controlled branding template for a professional school learning experience.
                        </p>
                      </div>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          isActive ? 'text-[#101820]' : 'text-transparent'
                        }`}
                        style={{ borderColor: isActive ? theme.accent : '#cbd5e1', backgroundColor: isActive ? theme.accent : 'transparent' }}
                      >
                        <CheckIcon />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <ThemeChip color={theme.primary} label="Primary" />
                      <ThemeChip color={theme.accent} label="Accent" />
                      <ThemeChip color={theme.background} label="Background" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publish branding</p>
                <h2 className="mt-1 text-xl font-semibold text-[#101820]">Apply to your school portal</h2>
              </div>
              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={updateMutation.isPending || uploading}
                className="inline-flex items-center justify-center rounded-2xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Saving branding...' : 'Save branding'}
              </button>
            </div>

            {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
            <p className="mt-3 text-xs leading-6 text-slate-400">
              Branding updates remain isolated to your authenticated school account. Students only read the
              active school identity after it is saved.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
              <PreviewIcon />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Live student portal preview</p>
              <h2 className="mt-1 text-xl font-semibold text-[#101820]">School-branded learner experience</h2>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[30px] border border-slate-200" style={{ backgroundColor: previewTheme.background }}>
            <div className="grid min-h-[560px] lg:grid-cols-[260px_1fr]">
              <aside className="flex flex-col justify-between p-6 text-white" style={{ backgroundColor: previewTheme.primary }}>
                <div>
                  <div className="flex items-center gap-3">
                    <SchoolLogo src={previewLogo} schoolName={schoolName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{schoolName}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
                        {schoolCode}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/6 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Student profile</p>
                    <p className="mt-3 text-base font-semibold">Student Name</p>
                    <p className="mt-1 text-sm text-white/70">Grade / Class</p>
                    <p className="mt-1 text-sm text-white/70">Learning pathway</p>
                  </div>

                  <nav className="mt-6 space-y-2">
                    {['Home', 'My Assignments', 'STEM Labs', 'Future Skills', 'My Future', 'My Activities'].map((item, index) => (
                      <div
                        key={item}
                        className="rounded-2xl px-4 py-3 text-sm font-medium"
                        style={
                          index === 0
                            ? { backgroundColor: previewTheme.accent, color: '#101820' }
                            : { backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.82)' }
                        }
                      >
                        {item}
                      </div>
                    ))}
                  </nav>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Theme template</p>
                  <p className="mt-2 text-sm font-semibold">{SCHOOL_THEME_TEMPLATES[selectedTheme].label}</p>
                </div>
              </aside>

              <div className="p-6 md:p-8">
                <div
                  className="rounded-[28px] px-6 py-7 text-white"
                  style={{ backgroundColor: previewTheme.primary }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: previewTheme.accent }}>
                    Personalized student dashboard
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold tracking-tight">Welcome back, Student</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
                    Continue your school-based learning journey with assignments, practical work, and future
                    growth pathways in one trusted platform.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm">Grade / Class</span>
                    <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm">{schoolName}</span>
                    <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm">Pathway-ready</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    'Assignments workspace',
                    'STEM learning access',
                    'Future skills foundation',
                    'Learning activity portfolio',
                  ].map((card) => (
                    <div key={card} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-[#101820]">{card}</p>
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: previewTheme.accent }} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Theme-aware student modules will inherit the selected school identity automatically.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
