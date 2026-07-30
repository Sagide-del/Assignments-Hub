import { useEffect, useState } from 'react';
import type { AiArtifact, AiArtifactContent } from '../../../api/ai-content.api';
import { AiQuestionEditor } from './AiQuestionEditor';

export function AiArtifactPreview({
  artifact,
  isSaving,
  isApproving,
  isPublishing,
  isRejecting,
  onSave,
  onApprove,
  onPublish,
  onReject,
}: {
  artifact: AiArtifact;
  isSaving: boolean;
  isApproving: boolean;
  isPublishing: boolean;
  isRejecting: boolean;
  onSave: (content: AiArtifactContent) => void;
  onApprove: () => void;
  onPublish: (publishNow: boolean) => void;
  onReject: (notes: string) => void;
}) {
  const [content, setContent] = useState(artifact.content);
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    setContent(artifact.content);
  }, [artifact.content, artifact.version]);

  const locked = artifact.status === 'PUBLISHED' || artifact.status === 'ARCHIVED';
  const editable = !locked;
  const totalMarks = content.questions.reduce((sum, question) => sum + question.points, 0);

  return (
    <section className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(16,24,32,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <input
              disabled={!editable}
              value={content.title}
              onChange={(event) => setContent((current) => ({ ...current, title: event.target.value }))}
              className="w-full border-0 p-0 text-2xl font-semibold tracking-tight text-[#101820] outline-none disabled:bg-white"
            />
            <textarea
              disabled={!editable}
              value={content.description ?? ''}
              onChange={(event) => setContent((current) => ({ ...current, description: event.target.value }))}
              rows={2}
              placeholder="Assignment description"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:bg-slate-50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#101820] px-3 py-1.5 text-xs font-semibold text-white">{artifact.status.replace('_', ' ')}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Version {artifact.version}</span>
            <span className="rounded-full bg-[#B5E61D]/35 px-3 py-1.5 text-xs font-semibold text-[#101820]">{totalMarks} marks</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {content.questions.map((question, index) => (
          <AiQuestionEditor
            key={`${artifact.id}-${index}`}
            question={question}
            index={index}
            disabled={!editable}
            onChange={(nextQuestion) =>
              setContent((current) => ({
                ...current,
                questions: current.questions.map((entry, entryIndex) =>
                  entryIndex === index ? nextQuestion : entry,
                ),
              }))
            }
          />
        ))}
      </div>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_50px_rgba(16,24,32,0.16)] backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {editable ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onSave(content)}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-[#101820] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save edits'}
              </button>
            ) : null}
            {artifact.status === 'GENERATED' || artifact.status === 'IN_REVIEW' || artifact.status === 'REJECTED' ? (
              <button
                type="button"
                disabled={isApproving}
                onClick={onApprove}
                className="min-h-11 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isApproving ? 'Validating...' : 'Approve'}
              </button>
            ) : null}
            {artifact.status === 'APPROVED' ? (
              <>
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => onPublish(false)}
                  className="min-h-11 rounded-xl border border-[#101820] px-4 text-sm font-semibold text-[#101820] disabled:opacity-50"
                >
                  Create draft
                </button>
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => onPublish(true)}
                  className="min-h-11 rounded-xl bg-[#B5E61D] px-4 text-sm font-semibold text-[#101820] disabled:opacity-50"
                >
                  {isPublishing ? 'Publishing...' : 'Publish to students'}
                </button>
              </>
            ) : null}
          </div>

          {!locked && artifact.status !== 'APPROVED' ? (
            <div className="flex min-w-0 flex-1 gap-2 xl:max-w-xl">
              <input
                value={rejectNotes}
                onChange={(event) => setRejectNotes(event.target.value)}
                placeholder="Reason for rejection"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <button
                type="button"
                disabled={rejectNotes.trim().length < 2 || isRejecting}
                onClick={() => onReject(rejectNotes)}
                className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
