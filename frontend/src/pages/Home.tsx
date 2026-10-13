import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';

const problems = [
  'Printing costs for every assignment and revision pack',
  'Teacher time lost collecting, sorting and returning paper',
  'Work that is misplaced before it reaches the classroom',
  'No clear view of learner progress until marks are compiled',
];

const steps = [
  {
    number: '01',
    title: 'Teachers publish work',
    text: 'Set instructions, deadlines and attachments for the right class or stream.',
  },
  {
    number: '02',
    title: 'Learners respond online',
    text: 'Students complete and submit work from a phone, tablet or computer.',
  },
  {
    number: '03',
    title: 'Schools act on results',
    text: 'Review submissions, give feedback and identify where learners need support.',
  },
];

const audiences = [
  {
    title: 'For teachers',
    text: 'Publish assignments, track submissions and review learner work without carrying stacks of paper.',
  },
  {
    title: 'For students',
    text: 'Sign in with school credentials, complete assignments and access practical learning resources on any device.',
  },
  {
    title: 'For parents',
    text: 'Reduce printing trips and understand progress through clearer school reports and study guidance.',
    id: 'for-parents',
  },
];

const features = [
  {
    title: 'Personalized study plans',
    text: 'Academic results help shape a practical weekly timetable around each learner’s weaker topics.',
  },
  {
    title: 'STEM and practical skills',
    text: 'Guided labs, coding activities and skills workspaces connect coursework to practical learning.',
  },
  {
    title: 'Actionable learner reports',
    text: 'Teachers and schools can see performance patterns instead of waiting for paper records to be compiled.',
  },
  {
    title: 'Designed for everyday devices',
    text: 'Responsive workspaces support entry-level Android phones, tablets and shared school computers.',
  },
];

const faqs = [
  {
    question: 'Does Assignment Hub require an app?',
    answer: 'No. It works directly in a modern web browser on a phone, tablet or computer.',
  },
  {
    question: 'How do school learners sign in?',
    answer: 'A learner uses the school code and credentials issued during school onboarding.',
  },
  {
    question: 'Can a school begin with a small group?',
    answer: 'Yes. A school can begin with selected classes or departments before expanding access.',
  },
  {
    question: 'Can independent learners use the platform?',
    answer: 'Yes. Individual learners can create a personal account and access the learning workspace independently.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#101820]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
          <Link to="/" aria-label="Assignment Hub home" className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101820] focus-visible:ring-offset-2">
            <Logo name="Assignment Hub" size="sm" className="!rounded-lg shadow-none ring-0" />
            <span className="hidden text-sm font-extrabold tracking-tight text-[#101820] sm:inline">Assignment Hub</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#for-parents" className="transition hover:text-[#101820]">For parents</a>
            <a href="#for-schools" className="transition hover:text-[#101820]">For schools</a>
            <a href="#pricing" className="transition hover:text-[#101820]">Pricing</a>
          </div>
          <Link to="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-bold text-[#101820] transition hover:bg-[#a8d617] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101820] focus-visible:ring-offset-2">
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute -right-28 top-16 h-80 w-80 rounded-full bg-[#B5E61D]/15 blur-3xl" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-28">
            <div className="relative max-w-3xl">
              <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#526b00]">Built for Kenyan schools</p>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-[-0.045em] text-[#101820] sm:text-5xl lg:text-[4.4rem]">
                Digital assignments for Kenyan high schools
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Move schoolwork from paper to one clear digital workspace. Teachers publish, learners submit from any device, and schools use results to guide the next step.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#101820] px-6 text-sm font-bold text-white transition hover:bg-[#1c2a38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B5E61D] focus-visible:ring-offset-2">
                  Request a school demo
                </Link>
                <a href="#for-parents" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-[#101820] transition hover:border-slate-400 hover:bg-slate-50">
                  Information for parents
                </a>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">Works in the browser. No new hardware or app installation required.</p>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="rounded-[2rem] bg-[#101820] p-5 shadow-[0_30px_80px_rgba(16,24,32,0.22)] sm:p-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B5E61D]">Learner workspace</p>
                    <p className="mt-2 text-xl font-semibold text-white">This week</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">Grade 10</span>
                </div>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Mathematics</p><p className="mt-1 font-semibold">Linear equations</p></div>
                      <span className="rounded-lg bg-[#B5E61D]/25 px-2.5 py-1 text-xs font-bold text-[#405400]">Due today</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold">Weekly progress</span><span className="text-sm font-bold">68%</span></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-[#B5E61D]" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#B5E61D] p-4"><p className="text-2xl font-bold">4</p><p className="mt-1 text-xs font-semibold">Tasks completed</p></div>
                    <div className="rounded-2xl bg-white p-4"><p className="text-2xl font-bold">2</p><p className="mt-1 text-xs font-semibold text-slate-500">Need attention</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#101820] text-white" aria-labelledby="problem-heading">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B5E61D]">The problem</p>
              <h2 id="problem-heading" className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Hardcopy homework creates work around the work.</h2>
              <p className="mt-5 max-w-lg leading-7 text-slate-300">Printing, distributing and recovering paper assignments adds cost without improving the learning record.</p>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {problems.map((problem, index) => (
                <li key={problem} className="bg-[#101820] p-5 sm:p-6">
                  <span className="text-xs font-bold text-[#B5E61D]">0{index + 1}</span>
                  <p className="mt-3 font-medium leading-7 text-slate-100">{problem}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="for-schools" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="how-heading">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">How it works</p>
            <h2 id="how-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">One platform. Three clear steps.</h2>
          </div>
          <div className="mt-10 grid border-y border-slate-200 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="border-b border-slate-200 py-7 last:border-b-0 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                <p className="text-sm font-extrabold text-[#6f8c09]">{step.number}</p>
                <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white" aria-labelledby="audience-heading">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 id="audience-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">Built around the school community</h2>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {audiences.map((audience, index) => (
                <article id={audience.id} key={audience.title} className="scroll-mt-28 rounded-2xl border border-slate-200 p-6 sm:p-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101820] text-sm font-extrabold text-[#B5E61D]">{index + 1}</div>
                  <h3 className="mt-6 text-xl font-bold">{audience.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{audience.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="difference-heading">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">Beyond submission</p>
              <h2 id="difference-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">A connected learning workspace</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 bg-[#eaf7bb]" aria-labelledby="pricing-heading">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">Access</p>
              <h2 id="pricing-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Flexible access for learners and schools</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-white p-6 sm:p-8">
                <p className="text-sm font-bold text-slate-500">Individual learners</p>
                <h3 className="mt-3 text-2xl font-bold">Personal learning account</h3>
                <p className="mt-4 leading-7 text-slate-600">Assignments, feedback, study planning and practical learning resources through an independent account.</p>
                <Link to="/register" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101820] px-5 text-sm font-bold text-white">Create an account</Link>
              </article>
              <article className="rounded-2xl bg-[#101820] p-6 text-white sm:p-8">
                <p className="text-sm font-bold text-[#B5E61D]">Schools</p>
                <h3 className="mt-3 text-2xl font-bold">Managed school workspace</h3>
                <p className="mt-4 leading-7 text-slate-300">Class and stream access, teacher workflows, academic reporting, school branding and onboarding support.</p>
                <Link to="/login" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-bold text-[#101820]">Request a demo</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white" aria-labelledby="trust-heading">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">Local and accountable</p>
              <h2 id="trust-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Built in Kenya, for Kenyan schools</h2>
              <p className="mt-5 max-w-2xl leading-7 text-slate-600">Assignment Hub is a product of Andolih EdTech Studios, a registered Kenyan business building practical digital learning infrastructure for schools and families.</p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F8FAFC] p-5"><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Business</dt><dd className="mt-2 font-bold">BN-P7SEYQQL</dd></div>
              <div className="rounded-2xl bg-[#F8FAFC] p-5"><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Location</dt><dd className="mt-2 font-bold">Nairobi, Kenya</dd></div>
            </dl>
            {/* Add a verified school testimonial here once one is available. */}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-bold marker:hidden">
                  {faq.question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-normal transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pt-4 leading-7 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24" aria-labelledby="cta-heading">
          <div className="overflow-hidden rounded-[2rem] bg-[#101820] px-6 py-12 text-white sm:px-10 lg:flex lg:items-end lg:justify-between lg:gap-10 lg:px-14 lg:py-14">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B5E61D]">Start a conversation</p>
              <h2 id="cta-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Ready to move schoolwork online?</h2>
              <p className="mt-4 leading-7 text-slate-300">See how assignments, feedback, resources and learner support work together in one school workspace.</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#B5E61D] px-6 text-sm font-bold text-[#101820]">Request a school demo</Link>
              <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-bold text-white">Create student account</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0a1117] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p className="font-bold text-white">Assignment Hub</p>
            <p className="mt-2 text-sm">A product of Andolih EdTech Studios · Nairobi, Kenya · BN-P7SEYQQL</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm" aria-label="Footer navigation">
            <a href="/about/" className="hover:text-white">About</a>
            <a href="#for-parents" className="hover:text-white">For parents</a>
            <a href="#for-schools" className="hover:text-white">For schools</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link to="/login" className="hover:text-white">Login</Link>
          </nav>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-slate-500">© 2026 Andolih EdTech Studios. All rights reserved.</div>
      </footer>
    </div>
  );
}
