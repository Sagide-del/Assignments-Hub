import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiContentApi } from '../../../api/ai-content.api';
import { apiErrorMessage } from '../../../api/axios';

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AiTopicUploader({
  onUploaded,
}: {
  onUploaded: (extractionId: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a PDF first.');
      return aiContentApi.uploadPdf({ file, subject: subject.trim(), grade: grade.trim() || undefined });
    },
    onSuccess: (result) => {
      setError('');
      onUploaded(result.id);
    },
    onError: (uploadError) => {
      setError(
        uploadError instanceof Error && !('response' in uploadError)
          ? uploadError.message
          : apiErrorMessage(uploadError, 'Could not upload the PDF'),
      );
    },
  });

  function chooseFile(next: File | undefined) {
    if (!next) return;
    if (next.type !== 'application/pdf' || !next.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a valid PDF file.');
      return;
    }
    if (next.size > 15 * 1024 * 1024) {
      setError('PDF files must be 15 MB or smaller.');
      return;
    }
    setError('');
    setFile(next);
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(16,24,32,0.05)]">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            chooseFile(event.dataTransfer.files[0]);
          }}
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-[#101820] hover:bg-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
            <UploadIcon />
          </span>
          <span className="mt-4 text-sm font-semibold text-[#101820]">
            {file ? file.name : 'Choose or drop a subject PDF'}
          </span>
          <span className="mt-1 text-xs text-slate-500">PDF only, up to 15 MB</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Biology"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-[#101820] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Grade or form</span>
            <input
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder="Grade 10"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-[#101820] focus:outline-none"
            />
          </label>
          <button
            type="button"
            disabled={!file || subject.trim().length < 2 || upload.isPending}
            onClick={() => upload.mutate()}
            className="min-h-11 w-full rounded-xl bg-[#B5E61D] px-4 text-sm font-semibold text-[#101820] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {upload.isPending ? 'Uploading...' : 'Extract topics'}
          </button>
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
