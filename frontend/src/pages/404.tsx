import { ArrowLeft, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-12 text-[#101820]">
      <section className="w-full max-w-lg">
        <a href="/" className="text-sm font-bold">Assignment Hub</a>
        <p className="mt-12 text-sm font-semibold text-[#526b00]">404 · Page not found</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Let’s get you back on track.</h1>
        <p className="mt-4 leading-7 text-slate-600">This page doesn’t exist or has moved. You can return home or try our available revision questions.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="/" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white"><ArrowLeft size={17} /> Back home</a>
          <a href="/free-revision/" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-semibold"><BookOpen size={17} /> Free revision</a>
        </div>
      </section>
    </main>
  );
}
