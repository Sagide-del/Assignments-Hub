import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  aiContentApi,
  type AiArtifactContent,
  type AiTopic,
} from '../../api/ai-content.api';
import { apiErrorMessage } from '../../api/axios';
import { MetricCard, PageHeader } from '../../components/ui/Saas';
import { AiArtifactPreview } from './ai/AiArtifactPreview';
import {
  AiGenerationConfigurator,
  type AiGenerationOptions,
} from './ai/AiGenerationConfigurator';
import { AiTopicList } from './ai/AiTopicList';
import { AiTopicUploader } from './ai/AiTopicUploader';

function ProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" aria-hidden="true">
      <path d="M20 12a8 8 0 10-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AiAssignmentGenerator() {
  const queryClient = useQueryClient();
  const [extractionId, setExtractionId] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<AiTopic | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [artifactId, setArtifactId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const quotaQuery = useQuery({
    queryKey: ['ai-quota'],
    queryFn: aiContentApi.getQuota,
    retry: false,
  });

  const topicsQuery = useQuery({
    queryKey: ['ai-topics'],
    queryFn: () => aiContentApi.listTopics({ take: 100 }),
    retry: false,
  });

  const extractionQuery = useQuery({
    queryKey: ['ai-pdf-content', extractionId],
    queryFn: () => aiContentApi.getPdfContent(extractionId!),
    enabled: extractionId !== null,
    refetchInterval: (query) =>
      query.state.data?.status === 'PROCESSING' || !query.state.data ? 2_000 : false,
  });

  useEffect(() => {
    if (extractionQuery.data?.status === 'COMPLETED') {
      setNotice(`${extractionQuery.data.topicCount} topics are ready.`);
      void queryClient.invalidateQueries({ queryKey: ['ai-topics'] });
    }
    if (extractionQuery.data?.status === 'FAILED') {
      setError(extractionQuery.data.error || 'Topic extraction failed.');
    }
  }, [extractionQuery.data, queryClient]);

  const generationsQuery = useQuery({
    queryKey: ['ai-generations'],
    queryFn: () => aiContentApi.listGenerations({ take: 50 }),
    refetchInterval: (query) => {
      const active = query.state.data?.items.some(
        (job) => job.status === 'QUEUED' || job.status === 'RUNNING',
      );
      return activeJobId || active ? 2_000 : false;
    },
  });

  useEffect(() => {
    if (!activeJobId || !generationsQuery.data) return;
    const job = generationsQuery.data.items.find((entry) => entry.id === activeJobId);
    if (!job) return;
    if (job.status === 'SUCCEEDED' && job.artifacts[0]) {
      setArtifactId(job.artifacts[0].id);
      setActiveJobId(null);
      setNotice('Assignment generated. Review every question before approval.');
      void queryClient.invalidateQueries({ queryKey: ['ai-quota'] });
    } else if (job.status === 'FAILED') {
      setActiveJobId(null);
      setError(job.errorMessage || 'Assignment generation failed.');
    }
  }, [activeJobId, generationsQuery.data, queryClient]);

  const artifactQuery = useQuery({
    queryKey: ['ai-artifact', artifactId],
    queryFn: () => aiContentApi.getArtifact(artifactId!),
    enabled: artifactId !== null,
  });

  const generate = useMutation({
    mutationFn: (options: AiGenerationOptions) => aiContentApi.generate(options),
    onSuccess: (result) => {
      setError('');
      setNotice('Generation queued.');
      setActiveJobId(result.jobId);
      setArtifactId(null);
      void queryClient.invalidateQueries({ queryKey: ['ai-generations'] });
    },
    onError: (generationError) =>
      setError(apiErrorMessage(generationError, 'Could not generate the assignment')),
  });

  const save = useMutation({
    mutationFn: (content: AiArtifactContent) => aiContentApi.editArtifact(artifactId!, content),
    onSuccess: (artifact) => {
      queryClient.setQueryData(['ai-artifact', artifact.id], artifact);
      setNotice('Edits saved as a new version.');
      setError('');
    },
    onError: (saveError) => setError(apiErrorMessage(saveError, 'Could not save edits')),
  });

  const approve = useMutation({
    mutationFn: () => aiContentApi.approveArtifact(artifactId!),
    onSuccess: (artifact) => {
      queryClient.setQueryData(['ai-artifact', artifact.id], artifact);
      setNotice('Assignment approved. It is ready to publish.');
      setError('');
    },
    onError: (approvalError) =>
      setError(apiErrorMessage(approvalError, 'Validation failed. Review the questions and answers.')),
  });

  const publish = useMutation({
    mutationFn: (publishNow: boolean) => aiContentApi.publishArtifact(artifactId!, publishNow),
    onSuccess: (result) => {
      setNotice(
        `Assignment ${result.assignmentId} ${
          result.assignment.isPublished ? 'published to students' : 'created as a draft'
        }.`,
      );
      setArtifactId(result.artifact.id);
      void queryClient.invalidateQueries({ queryKey: ['ai-artifact', result.artifact.id] });
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['ai-generations'] });
    },
    onError: (publishError) => setError(apiErrorMessage(publishError, 'Could not publish the assignment')),
  });

  const reject = useMutation({
    mutationFn: (notes: string) => aiContentApi.rejectArtifact(artifactId!, notes),
    onSuccess: (artifact) => {
      queryClient.setQueryData(['ai-artifact', artifact.id], artifact);
      setNotice('Artifact rejected. Edit it before approving.');
      setError('');
    },
    onError: (rejectError) => setError(apiErrorMessage(rejectError, 'Could not reject the artifact')),
  });

  const quota = quotaQuery.data;
  const jobs = generationsQuery.data?.items ?? [];
  const processing =
    extractionQuery.data?.status === 'PROCESSING' || activeJobId !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher tools"
        title="AI Assignment Studio"
        actions={
          <Link
            to="/teacher/assignments/new"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-[#101820]"
          >
            Manual assignment
          </Link>
        }
      />

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-medium text-[#33410a]">
          {notice}
        </div>
      ) : null}

      {quotaQuery.error ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#101820]">AI access unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">
            {apiErrorMessage(quotaQuery.error, 'AI Assignment Studio is not enabled for this school.')}
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Monthly limit" value={quota?.limit === null ? 'Unlimited' : quota?.limit ?? '-'} />
            <MetricCard label="Used" value={quota?.used ?? '-'} />
            <MetricCard label="Remaining" value={quota?.remaining === null ? 'Unlimited' : quota?.remaining ?? '-'} />
          </section>

          {processing ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#101820] px-4 py-3 text-sm font-medium text-white">
              <ProgressIcon />
              {activeJobId ? 'Generating questions in the background...' : 'Extracting topics from the PDF...'}
            </div>
          ) : null}

          <AiTopicUploader
            onUploaded={(id) => {
              setExtractionId(id);
              setSelectedTopic(null);
              setArtifactId(null);
              setError('');
              setNotice('PDF uploaded. Topic extraction has started.');
            }}
          />

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Topic library</p>
                <h2 className="mt-1 text-xl font-semibold text-[#101820]">Choose source content</h2>
              </div>
              <span className="text-sm font-medium text-slate-500">{topicsQuery.data?.total ?? 0} topics</span>
            </div>
            <AiTopicList
              topics={topicsQuery.data?.items ?? []}
              selectedId={selectedTopic?.id}
              onSelect={(topic) => {
                setSelectedTopic(topic);
                setArtifactId(null);
              }}
              isLoading={topicsQuery.isLoading}
            />
          </section>

          {selectedTopic ? (
            <AiGenerationConfigurator
              key={selectedTopic.id}
              topic={selectedTopic}
              isGenerating={generate.isPending || activeJobId !== null}
              onGenerate={(options) => generate.mutate(options)}
            />
          ) : null}

          {artifactQuery.data ? (
            <AiArtifactPreview
              artifact={artifactQuery.data}
              isSaving={save.isPending}
              isApproving={approve.isPending}
              isPublishing={publish.isPending}
              isRejecting={reject.isPending}
              onSave={(content) => save.mutate(content)}
              onApprove={() => approve.mutate()}
              onPublish={(publishNow) => publish.mutate(publishNow)}
              onReject={(notes) => reject.mutate(notes)}
            />
          ) : null}

          {jobs.length ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#101820]">Recent generations</h2>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{jobs.length} jobs</span>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {jobs.slice(0, 10).map((job) => (
                  <button
                    type="button"
                    key={job.id}
                    disabled={!job.artifacts[0]}
                    onClick={() => job.artifacts[0] && setArtifactId(job.artifacts[0].id)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left disabled:cursor-default"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#101820]">
                        {job.extractedContent?.subject ?? 'AI assignment'} · Job {job.id}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      job.status === 'SUCCEEDED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : job.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}>
                      {job.status}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
