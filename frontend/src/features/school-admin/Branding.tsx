import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolsApi } from '../../api/schools.api';
import { uploadsApi } from '../../api/uploads.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

// PATCH /schools/:id. The School model only has logoUrl for branding —
// there is NO motto or brandColor column (see backend/prisma/schema.prisma
// and ROADMAP.md's gap table). This form only edits fields that actually
// exist and persist: logo, address, phone, contact email. Sending a `motto`
// or `brandColor` field would be rejected outright by the backend's
// ValidationPipe (forbidNonWhitelisted: true in main.ts).
export function BrandingSettings() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: school } = useQuery({
    queryKey: ['school', user?.schoolId],
    queryFn: () => schoolsApi.findOne(user!.schoolId),
    enabled: !!user,
  });

  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (patch: { phone?: string; contactEmail?: string; logoUrl?: string }) =>
      schoolsApi.update(user!.schoolId, patch),
    onSuccess: () => {
      setStatus('Saved.');
      queryClient.invalidateQueries({ queryKey: ['school'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save')),
  });

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const result = await uploadsApi.uploadSingle(file);
      updateMutation.mutate({ logoUrl: result.url });
    } catch (err) {
      setStatus(apiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">School Branding</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
          {school?.logoUrl && <img src={school.logoUrl} alt="logo" className="h-16 w-16 rounded object-cover mb-2" />}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact phone</label>
          <input
            defaultValue={school?.phone ?? ''}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
          <input
            defaultValue={school?.contactEmail ?? ''}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        {status && <p className="text-sm text-gray-600">{status}</p>}
        <button
          onClick={() => updateMutation.mutate({ phone, contactEmail })}
          disabled={updateMutation.isPending}
          className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Motto and brand-color customization aren't available yet — the backend has no fields for them.
        See ROADMAP.md.
      </p>
    </div>
  );
}
