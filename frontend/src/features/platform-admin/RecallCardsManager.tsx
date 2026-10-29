import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Eye, EyeOff, Check, ArrowLeft } from "lucide-react";
import { mnemonicCardsApi } from "../../api/mnemonic-cards.api";
import { apiErrorMessage } from "../../api/axios";
import type { MnemonicCard } from "../../types";
import type { RecallContent } from "../../api/content-library.api";
import { MnemonicCardsStudio } from "./MnemonicCardsStudio";
const field = "w-full rounded-lg border border-slate-200 bg-white p-3 text-sm";
export function RecallPreview({ content }: { content: RecallContent }) {
  return (
    <article className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
        Recall cue
      </p>
      <h3 className="text-lg font-semibold">{content.cue}</h3>
      <p className="rounded-lg bg-white p-4 text-lg font-semibold text-indigo-800">
        {content.mnemonic}
      </p>
      <dl className="space-y-2">
        {content.facts.map((f, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(70px,1fr)_3fr] gap-3 text-sm"
          >
            <dt className="font-semibold">{f.label}</dt>
            <dd>{f.meaning}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-7 text-slate-600">{content.explanation}</p>
      <div className="border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide">
          Test your recall
        </p>
        {content.checks.map((c, i) => (
          <details
            key={i}
            className="mt-3 rounded-lg border bg-white p-3 text-sm"
          >
            <summary className="cursor-pointer">{c.question}</summary>
            <p className="mt-3 text-slate-600">{c.answer}</p>
          </details>
        ))}
      </div>
    </article>
  );
}
export function RecallCardsManager() {
  const client = useQueryClient(),
    cards = useQuery({
      queryKey: ["mnemonic-cards", "admin"],
      queryFn: () => mnemonicCardsApi.findAll(),
    }),
    [editing, setEditing] = useState<MnemonicCard | null>(null),
    [content, setContent] = useState<RecallContent | null>(null),
    [title, setTitle] = useState(""),
    [grade, setGrade] = useState("ALL"),
    [notice, setNotice] = useState(""),
    [legacy, setLegacy] = useState(false),
    [selection, setSelection] = useState<number[]>([]);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["mnemonic-cards"] });
  };
  const save = useMutation({
    mutationFn: () =>
      mnemonicCardsApi.update(editing!.id, {
        title,
        content: content!,
        isPublished: false,
      }),
    onSuccess: () => {
      setEditing(null);
      refresh();
      setNotice("Saved as a draft. Review again before publishing.");
    },
    onError: (e) => setNotice(apiErrorMessage(e, "Could not save card.")),
  });
  const publish = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => mnemonicCardsApi.update(id, { isPublished: true })),
      );
      const failed = results.flatMap((r, i) =>
        r.status === "rejected" ? [ids[i]] : [],
      );
      return { failed, count: ids.length - failed.length };
    },
    onSuccess: (r) => {
      setSelection(r.failed);
      refresh();
      setNotice(
        `${r.count} cards published.${r.failed.length ? ` ${r.failed.length} failed; review and retry.` : ""}`,
      );
    },
  });
  const unpublish = useMutation({
    mutationFn: (id: number) =>
      mnemonicCardsApi.update(id, { isPublished: false }),
    onSuccess: refresh,
    onError: (e) => setNotice(apiErrorMessage(e, "Could not unpublish.")),
  });
  if (legacy)
    return (
      <>
        <button
          className="mb-4 text-sm underline"
          onClick={() => setLegacy(false)}
        >
          Back to generated cards
        </button>
        <MnemonicCardsStudio />
      </>
    );
  if (editing && content)
    return (
      <div className="space-y-4">
        <button
          className="inline-flex items-center gap-2 text-sm"
          onClick={() => setEditing(null)}
        >
          <ArrowLeft size={16} />
          Card library
        </button>
        <div className="grid gap-5 lg:grid-cols-2">
          <form
            className="space-y-4 rounded-xl border bg-white p-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <h2 className="font-semibold">
              Review & edit · {editing.grade} · {editing.subject}
            </h2>
            <label className="block text-xs">
              Title
              <input
                aria-label="Card title"
                className={field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            {(["cue", "mnemonic", "explanation"] as const).map((key) => (
              <label className="block text-xs capitalize" key={key}>
                {key}
                <textarea
                  className={field}
                  rows={key === "explanation" ? 4 : 2}
                  value={content[key]}
                  onChange={(e) =>
                    setContent({ ...content, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <p className="text-xs font-semibold">Mnemonic → accurate fact</p>
            {content.facts.map((f, i) => (
              <div className="grid grid-cols-2 gap-2" key={i}>
                <input
                  aria-label={`Memory label ${i + 1}`}
                  className={field}
                  value={f.label}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      facts: content.facts.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <textarea
                  aria-label={`Memory meaning ${i + 1}`}
                  className={field}
                  value={f.meaning}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      facts: content.facts.map((x, j) =>
                        j === i ? { ...x, meaning: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <p className="text-xs font-semibold">Retrieval practice</p>
            {content.checks.map((c, i) => (
              <div key={i} className="space-y-2">
                <input
                  aria-label={`Recall question ${i + 1}`}
                  className={field}
                  value={c.question}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      checks: content.checks.map((x, j) =>
                        j === i ? { ...x, question: e.target.value } : x,
                      ),
                    })
                  }
                />
                <textarea
                  aria-label={`Recall answer ${i + 1}`}
                  className={field}
                  value={c.answer}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      checks: content.checks.map((x, j) =>
                        j === i ? { ...x, answer: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <button
              disabled={save.isPending}
              className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white"
            >
              Save reviewed draft
            </button>
          </form>
          <RecallPreview content={content} />
        </div>
        {notice && <p role="status">{notice}</p>}
      </div>
    );
  const visible = (cards.data ?? []).filter(
    (c) => c.content && (grade === "ALL" || c.grade === grade),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Memory & recall cards</h2>
          <p className="mt-1 text-sm text-slate-500">
            Generate from curriculum sources, check accuracy, then publish to
            the matching grade.
          </p>
        </div>
        <button onClick={() => setLegacy(true)} className="text-xs underline">
          Existing PDF cards
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Card grade"
          className={field + " max-w-44"}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        >
          <option value="ALL">All grades</option>
          {[7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g}>Grade {g}</option>
          ))}
        </select>
        <button
          disabled={!selection.length || publish.isPending}
          onClick={() => publish.mutate(selection)}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          Publish {selection.length} reviewed cards
        </button>
      </div>
      {notice && (
        <p role="status" className="rounded-lg border bg-white p-3 text-sm">
          {notice}
        </p>
      )}
      {cards.isError && (
        <p role="alert">
          Could not load cards.{" "}
          <button onClick={() => cards.refetch()}>Retry</button>
        </p>
      )}
      {cards.isLoading ? (
        <p>Loading cards…</p>
      ) : !visible.length ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">
          Select saved curriculum sources and choose Generate memory cards to
          create your first drafts.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((card) => (
            <article className="rounded-xl border bg-white p-5" key={card.id}>
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-center gap-3">
                  <input
                    aria-label={`Select ${card.title}`}
                    type="checkbox"
                    checked={selection.includes(card.id)}
                    onChange={(e) =>
                      setSelection(
                        e.target.checked
                          ? [...selection, card.id]
                          : selection.filter((id) => id !== card.id),
                      )
                    }
                  />
                  <Brain className="text-indigo-600" size={20} />
                  <span className="text-xs text-slate-500">
                    {card.grade} · {card.subject}
                  </span>
                </label>
                <span className="text-xs">
                  {card.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{card.content!.cue}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 text-sm text-blue-700"
                  onClick={() => {
                    setEditing(card);
                    setContent(card.content!);
                    setTitle(card.title);
                  }}
                >
                  <Eye size={15} />
                  Review & edit
                </button>
                {card.isPublished ? (
                  <button
                    onClick={() => unpublish.mutate(card.id)}
                    className="inline-flex gap-2 text-xs"
                  >
                    <EyeOff size={15} />
                    Unpublish
                  </button>
                ) : (
                  <button
                    disabled={publish.isPending}
                    onClick={() => publish.mutate([card.id])}
                    className="inline-flex gap-2 text-xs"
                  >
                    <Check size={15} />
                    Publish reviewed card
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
