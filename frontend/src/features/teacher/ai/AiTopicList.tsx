import type { AiTopic } from '../../../api/ai-content.api';

function TopicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M5 5.5A2.5 2.5 0 017.5 3H19v16H7.5A2.5 2.5 0 015 16.5v-11zm0 11A2.5 2.5 0 017.5 14H19M9 7h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AiTopicList({
  topics,
  selectedId,
  onSelect,
  isLoading,
}: {
  topics: AiTopic[];
  selectedId?: string;
  onSelect: (topic: AiTopic) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading topics...</div>;
  }

  if (!topics.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No extracted topics yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {topics.map((topic) => {
        const active = selectedId === topic.id;
        return (
          <button
            type="button"
            key={topic.id}
            onClick={() => onSelect(topic)}
            className={`min-h-36 rounded-2xl border p-4 text-left transition ${
              active
                ? 'border-[#101820] bg-[#101820] text-white shadow-[0_14px_35px_rgba(16,24,32,0.18)]'
                : 'border-slate-200 bg-white text-[#101820] hover:-translate-y-0.5 hover:border-slate-400'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-[#B5E61D] text-[#101820]' : 'bg-slate-100'}`}>
              <TopicIcon />
            </span>
            <span className="mt-4 block text-base font-semibold">{topic.name}</span>
            <span className={`mt-2 block text-xs font-medium ${active ? 'text-white/65' : 'text-slate-500'}`}>
              {topic.subject} · {topic.grade ?? 'Grade not specified'} · {topic.subtopics.length} subtopics
            </span>
          </button>
        );
      })}
    </div>
  );
}
