import { useMemo, useState } from 'react';
import { Heart, RefreshCw, Volume2 } from 'lucide-react';

type Choice = { id: string; emoji: string; label: string; correct?: boolean; group?: string };

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function Prompt({ text }: { text: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f4f5f7] p-4"><p className="text-lg font-bold leading-7 text-[#2a2b2e]">{text}</p><button type="button" aria-label="Hear instruction" onClick={() => speak(text)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#b5d334] text-[#2a2b2e]"><Volume2 /></button></div>;
}

export function TapTargetGame({ prompt, choices }: { prompt: string; choices: Choice[] }) {
  const [result, setResult] = useState<'good' | 'try' | null>(null);
  return <div className="space-y-5"><Prompt text={prompt} /><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{choices.map((choice) => <button key={choice.id} onClick={() => setResult(choice.correct ? 'good' : 'try')} className="min-h-36 rounded-3xl border-2 border-slate-200 bg-white p-4 text-center shadow-sm transition active:scale-95 hover:border-[#b5d334]"><span className="block text-6xl">{choice.emoji}</span><span className="mt-3 block text-base font-bold text-[#2a2b2e]">{choice.label}</span></button>)}</div><Feedback result={result} /></div>;
}

export function AudioQuiz({ prompt, choices }: { prompt: string; choices: Choice[] }) {
  return <TapTargetGame prompt={prompt} choices={choices} />;
}

export function DragAndDropSorter({ prompt, choices, groups }: { prompt: string; choices: Choice[]; groups: string[] }) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const done = choices.every((choice) => placed[choice.id] === choice.group);
  return <div className="space-y-5"><Prompt text={prompt} /><div className="grid grid-cols-2 gap-3">{groups.map((group) => <div key={group} className="min-h-36 rounded-3xl border-2 border-dashed border-[#b5d334] bg-[#f8fce9] p-3"><p className="text-center font-extrabold text-[#526b10]">{group}</p><div className="mt-3 flex flex-wrap justify-center gap-2">{choices.filter((choice) => placed[choice.id] === group).map((choice) => <span key={choice.id} className="rounded-2xl bg-white px-3 py-2 text-3xl shadow-sm">{choice.emoji}</span>)}</div></div>)}</div><div className="flex flex-wrap justify-center gap-3">{choices.filter((choice) => !placed[choice.id]).map((choice) => <div key={choice.id} className="rounded-2xl border bg-white p-3 text-center"><span className="text-4xl">{choice.emoji}</span><div className="mt-2 flex gap-1">{groups.map((group) => <button key={group} onClick={() => setPlaced((current) => ({ ...current, [choice.id]: group }))} className="min-h-10 rounded-xl bg-[#2a2b2e] px-3 text-xs font-bold text-white">{group}</button>)}</div></div>)}</div><Feedback result={done ? 'good' : null} /></div>;
}

export function ActionVerifier({ prompt, actionEmoji }: { prompt: string; actionEmoji: string }) {
  const [done, setDone] = useState(false);
  return <div className="space-y-5 text-center"><Prompt text={prompt} /><div className="rounded-[2rem] bg-gradient-to-br from-[#f8fce9] to-[#f4f5f7] p-8"><span className="inline-block text-8xl motion-safe:animate-bounce">{actionEmoji}</span><p className="mt-5 text-xl font-extrabold text-[#2a2b2e]">Try the action with your grown-up!</p></div><button onClick={() => setDone(true)} className="min-h-16 w-full rounded-3xl bg-[#b5d334] px-6 text-xl font-black text-[#2a2b2e] shadow-sm active:scale-[.98]">I did it!</button><Feedback result={done ? 'good' : null} /></div>;
}

function Feedback({ result }: { result: 'good' | 'try' | null }) {
  if (!result) return null;
  return <p role="status" className={`rounded-2xl p-4 text-center text-lg font-extrabold ${result === 'good' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{result === 'good' ? 'Wonderful! You did it! 🎉' : 'Good try! Listen and try again.'}</p>;
}

const AREAS = [
  { id: 'language', title: 'Listening & Sounds', icon: '🦁', description: 'Listen, look and tap.', type: 'tap' },
  { id: 'maths', title: 'Sorting & Counting', icon: '🧺', description: 'Match and sort colourful objects.', type: 'sort' },
  { id: 'environment', title: 'Discovery Time', icon: '🌦️', description: 'Explore animals, safety and weather.', type: 'tap' },
  { id: 'movement', title: 'Move & Music', icon: '🕺', description: 'Copy an action, then celebrate.', type: 'action' },
  { id: 'healthy', title: 'Healthy Habits', icon: '🧼', description: 'Practise kind, safe choices.', type: 'sort' },
  { id: 'values', title: 'Kindness Garden', icon: '🌼', description: 'Choose actions that help others.', type: 'tap' },
] as const;

export function EarlyYearsPlayground({ grade }: { grade: string | null }) {
  const [active, setActive] = useState<(typeof AREAS)[number]['id']>('language');
  const area = useMemo(() => AREAS.find((item) => item.id === active)!, [active]);
  const game = area.id === 'maths' ? <DragAndDropSorter prompt="Put each fruit in the correct basket." groups={['Red', 'Yellow']} choices={[{ id: 'apple', emoji: '🍎', label: 'Apple', group: 'Red' }, { id: 'banana', emoji: '🍌', label: 'Banana', group: 'Yellow' }, { id: 'cherry', emoji: '🍒', label: 'Cherries', group: 'Red' }]} />
    : area.id === 'healthy' ? <DragAndDropSorter prompt="Sort food for a healthy plate." groups={['Healthy', 'Sometimes']} choices={[{ id: 'apple', emoji: '🍎', label: 'Apple', group: 'Healthy' }, { id: 'broccoli', emoji: '🥦', label: 'Broccoli', group: 'Healthy' }, { id: 'sweet', emoji: '🍬', label: 'Sweet', group: 'Sometimes' }]} />
    : area.id === 'movement' ? <ActionVerifier prompt="Stand up and jump three times!" actionEmoji="🤸" />
    : area.id === 'values' ? <TapTargetGame prompt="Tap the kind choice." choices={[{ id: 'share', emoji: '🤝', label: 'Share a toy', correct: true }, { id: 'push', emoji: '🙅', label: 'Push a friend' }, { id: 'shout', emoji: '😠', label: 'Shout' }]} />
    : area.id === 'environment' ? <TapTargetGame prompt="Tap the animal that lives in water." choices={[{ id: 'fish', emoji: '🐟', label: 'Fish', correct: true }, { id: 'bird', emoji: '🐦', label: 'Bird' }, { id: 'cow', emoji: '🐄', label: 'Cow' }]} />
    : <AudioQuiz prompt="Listen carefully. Tap the lion." choices={[{ id: 'lion', emoji: '🦁', label: 'Lion', correct: true }, { id: 'elephant', emoji: '🐘', label: 'Elephant' }, { id: 'monkey', emoji: '🐒', label: 'Monkey' }]} />;
  return <main className="mx-auto max-w-5xl space-y-6 px-1 pb-8"><header className="rounded-[2rem] bg-[#2a2b2e] p-6 text-white sm:p-8"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#dff38a]">{grade ?? 'Early Years'} · Play & Explore</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Let’s learn by playing!</h1><p className="mt-3 max-w-xl text-base leading-7 text-slate-200">Choose an activity, listen to the instruction, and try it together.</p></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{AREAS.map((item) => <button key={item.id} onClick={() => setActive(item.id)} className={`min-h-32 rounded-3xl border-2 p-4 text-left transition active:scale-[.98] ${active === item.id ? 'border-[#b5d334] bg-[#f8fce9] shadow-md' : 'border-slate-200 bg-white'}`}><span className="text-4xl">{item.icon}</span><span className="mt-2 block text-lg font-extrabold text-[#2a2b2e]">{item.title}</span><span className="mt-1 block text-sm text-slate-600">{item.description}</span></button>)}</section><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-2xl font-black text-[#2a2b2e]">{area.title}</h2><button onClick={() => setActive(active)} aria-label="Restart activity" className="rounded-full border p-3 text-slate-600"><RefreshCw size={20} /></button></div>{game}</section><p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-slate-600"><Heart className="text-rose-500" size={17} />Grown-ups: celebrate effort and repeat activities together.</p></main>;
}
