import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questionBankAdminApi } from '../../api/question-bank.api';
import { schoolsApi } from '../../api/schools.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, PageHeader } from '../../components/ui/Saas';

export function SchoolActivation() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const schoolsQuery = useQuery({ queryKey: ['schools'], queryFn: schoolsApi.findAll });
  const accessQuery = useQuery({
    queryKey: ['question-bank-school-access'],
    queryFn: questionBankAdminApi.listSchoolAccess,
  });

  const toggle = useMutation({
    mutationFn: (input: { schoolId: number; active: boolean }) =>
      questionBankAdminApi.activateSchool(input),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['question-bank-school-access'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not update Question Bank access')),
  });

  const schools = schoolsQuery.data ?? [];
  const accessBySchoolId = new Map((accessQuery.data ?? []).map((entry) => [entry.schoolId, entry]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Admin"
        title="Question Bank — School Activation"
        meta="Only activated schools' teachers can browse the Question Bank."
      />

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        {schools.length === 0 ? (
          <EmptyState title="No schools yet" />
        ) : (
          <div className="divide-y divide-slate-100">
            {schools.map((school) => {
              const access = accessBySchoolId.get(school.id);
              const active = access?.active ?? false;
              return (
                <div key={school.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#101820]">{school.name}</p>
                    <p className="text-xs text-slate-500">
                      {school.code} · {active ? 'Question Bank active' : 'Not activated'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ schoolId: school.id, active: !active })}
                    className={`min-h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-40 ${
                      active
                        ? 'border border-red-300 text-red-700'
                        : 'bg-[#101820] text-white'
                    }`}
                  >
                    {active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default SchoolActivation;
