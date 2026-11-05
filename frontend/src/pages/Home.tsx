import { useEffect } from "react";
import { showHomepageFaq } from "../utils/homepage-schema";
import homeContent from "../content/homepage.json";
import { HomeProductPreview } from "../components/HomeProductPreview";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  BrainCircuit,
  ClipboardList,
  CircleCheck,
  Timer,
} from "lucide-react";
import { AssignmentHubWordmark } from "../components/ui/Logo";

const WHATSAPP_NUMBER = "254748519923";
const WHATSAPP_CONTACT_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello, I would like to learn more about Assignment Hub.")}`;
const WHATSAPP_DEMO_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello, I would like to book a free Assignment Hub school demo.")}`;

const problems = [
  "Revision materials scattered across books, chats and PDFs",
  "Feedback that arrives after the class has moved on",
  "Practical concepts without enough time in the lab",
  "Study time spent without a clear view of weaker topics",
];

const steps = [
  {
    number: "01",
    title: "Grades 1–6 · Primary school",
    text: "Play-based activities, foundational literacy and numeracy build confidence for primary-school learning. No pathways to choose.",
  },
  {
    number: "02",
    title: "Grades 7–9 · Junior school",
    text: "Explore integrated science and pre-technical skills, with topic practice and KJSEA mock preparation.",
  },
  {
    number: "03",
    title: "Grades 10–12 · Senior school",
    text: "Follow STEM, Social Sciences or Arts and Sports Science pathways, with subject-specific 3D labs, SBA tracking and KCBE mock practice.",
  },
];
const aiFeatures = [
  {
    Icon: ClipboardList,
    title: "Topic-Led Assignments",
    text: "Choose a subject and focus on one topic at a time, with 30-question practice batches where available. Smaller age-appropriate sets support younger learners.",
  },
  {
    Icon: CircleCheck,
    title: "Instant Feedback",
    text: "Get prompt feedback on auto-marked work. SymPy verifies supported exact Math and Chemistry calculations, with explanations to help you understand your answer. Teacher-reviewed work follows its release schedule.",
  },
  {
    Icon: BrainCircuit,
    title: "AI Study Coach",
    text: "Use your assessment results to identify weaker topics, build a personalised weekly study timetable and revise with published cheat sheets.",
  },
  {
    Icon: Timer,
    title: "KCBE & KJSEA Mocks",
    text: "Practise against the clock with subject papers, relevant diagrams and explained answers. Use mock results and school projections to plan your next steps.",
  },
];

const audiences = [
  {
    title: "For teachers",
    text: "Publish topic-led assignments, follow submissions and focus feedback on the concepts your assigned learners need.",
  },
  {
    title: "For students",
    text: "Open work for your grade and subjects, practise one topic at a time and build understanding through feedback and practical activities.",
  },
  {
    title: "For parents",
    text: "Follow clearer learning reports and help your child build a steady revision routine.",
    id: "for-parents",
  },
];

const features = [
  {
    icon: BookOpenCheck,
    title: "Personalized study plans",
    text: "Published cheat sheets and illustrated recall cards help learners revisit key concepts alongside topic practice.",
  },
  {
    icon: Sparkles,
    title: "STEM and practical skills",
    text: "Guided labs, coding activities and skills workspaces connect coursework to practical learning.",
  },
  {
    icon: BarChart3,
    title: "Actionable learner reports",
    text: "Teachers and schools can see performance patterns instead of waiting for paper records to be compiled.",
  },
  {
    icon: ShieldCheck,
    title: "Designed for everyday devices",
    text: "Responsive workspaces support entry-level Android phones, tablets and shared school computers.",
  },
];

const faqs = homeContent.faqs;

export default function Home() {
  useEffect(() => {
    showHomepageFaq(true);
    return () => showHomepageFaq(false);
  }, []);
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#101820]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <nav
          className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
          aria-label="Primary navigation"
        >
          <Link
            to="/"
            aria-label="Assignment Hub home"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101820] focus-visible:ring-offset-2"
          >
            <AssignmentHubWordmark size="sm" />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="/revision/" className="transition hover:text-[#101820]">
              Free revision
            </a>
            <a href="#for-parents" className="transition hover:text-[#101820]">
              For parents
            </a>
            <a href="#for-schools" className="transition hover:text-[#101820]">
              For schools
            </a>
            <a href="#pricing" className="transition hover:text-[#101820]">
              Pricing
            </a>
          </div>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-bold text-[#101820] transition hover:bg-[#a8d617] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101820] focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div
            className="absolute -right-28 top-16 h-80 w-80 rounded-full bg-[#B5E61D]/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-28">
            <div className="relative max-w-3xl">
              <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#526b00]">
                Digital learning for Kenyan schools and families
              </p>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-[-0.045em] text-[#101820] sm:text-5xl lg:text-[4.4rem]">
                {homeContent.heading}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                {homeContent.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/free-revision"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#101820] px-6 text-sm font-bold text-white transition hover:bg-[#1c2a38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B5E61D] focus-visible:ring-offset-2"
                >
                  Try Free CBC Practice
                </a>
                <a
                  href={WHATSAPP_CONTACT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-[#101820] transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Talk to us on WhatsApp
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#6f8c09]" /> No app to
                  install
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#6f8c09]" /> Instant
                  marking
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#6f8c09]" /> Works on
                  any phone
                </span>
              </div>
            </div>

            <HomeProductPreview />
          </div>
        </section>

        <section
          className="border-b border-slate-200 bg-white"
          aria-labelledby="ai-heading"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">
              The AI Advantage
            </p>
            <h2
              id="ai-heading"
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Smarter Studying, Powered by AI
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {aiFeatures.map(({ Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6"
                >
                  <Icon
                    size={24}
                    className="text-[#607b00]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="bg-[#101820] text-white"
          aria-labelledby="problem-heading"
        >
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B5E61D]">
                The problem
              </p>
              <h2
                id="problem-heading"
                className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
              >
                Give every study session a clear purpose.
              </h2>
              <p className="mt-5 max-w-lg leading-7 text-slate-300">
                Printing, distributing and recovering paper assignments costs
                time and money, while students still need timely feedback and a
                clear learning plan.
              </p>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {problems.map((problem, index) => (
                <li key={problem} className="bg-[#101820] p-5 sm:p-6">
                  <span className="text-xs font-bold text-[#B5E61D]">
                    0{index + 1}
                  </span>
                  <p className="mt-3 font-medium leading-7 text-slate-100">
                    {problem}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="all-grades"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
          aria-labelledby="how-heading"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">
              Every stage of learning
            </p>
            <h2
              id="how-heading"
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Built for Every Learner, from Grade 1 to Grade 12.
            </h2>
          </div>
          <div className="mt-10 grid border-y border-slate-200 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="border-b border-slate-200 py-7 last:border-b-0 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
              >
                <p className="text-sm font-extrabold text-[#6f8c09]">
                  {step.number}
                </p>
                <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="for-schools"
          className="scroll-mt-24 border-y border-slate-200 bg-white"
          aria-labelledby="audience-heading"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">
              One shared view of learning
            </p>
            <h2
              id="audience-heading"
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              A clear view for teachers, families and school leaders
            </h2>
            <p className="mt-5 max-w-3xl leading-7 text-slate-600">
              Track Grade 10 and Grade 11 SBA with 15% + 15% weighting in your
              KCBE planning dashboard. Teachers see only their assigned streams
              and subjects. Principals see school-wide projected grades.
              Projections are estimates, not official KNEC results.
            </p>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {audiences.map((audience, index) => (
                <article
                  id={audience.id}
                  key={audience.title}
                  className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(16,24,32,0.04)] sm:p-7"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101820] text-sm font-extrabold text-[#B5E61D]">
                    0{index + 1}
                  </div>
                  <h3 className="mt-6 text-xl font-bold">{audience.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {audience.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
          aria-labelledby="difference-heading"
        >
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">
                Beyond submission
              </p>
              <h2
                id="difference-heading"
                className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
              >
                A connected learning workspace
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="rounded-2xl bg-white p-6 ring-1 ring-slate-200"
                  >
                    <Icon
                      className="h-5 w-5 text-[#607b00]"
                      strokeWidth={1.9}
                    />
                    <h3 className="text-lg font-bold">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {feature.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
          aria-labelledby="revision-heading"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">
            Free CBC / CBE practice · Grade 7
          </p>
          <h2
            id="revision-heading"
            className="mt-4 text-3xl font-bold tracking-tight"
          >
            Try a topic before creating an account
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Five questions, worked answers and a fresh start whenever you need
            one. No registration or payment needed for these public practice
            quizzes.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["grade-7-mathematics-fractions", "Mathematics: Fractions"],
              ["grade-7-mathematics-algebra", "Mathematics: Algebra"],
              [
                "grade-7-integrated-science-laboratory-safety",
                "Integrated Science: Laboratory safety",
              ],
            ].map(([slug, title]) => (
              <a
                key={slug}
                href={`/revision/${slug}/`}
                className="rounded-2xl border border-slate-200 bg-white p-6 font-bold text-[#101820] hover:border-[#607b00]"
              >
                {title}
                <span className="mt-3 block text-sm font-semibold text-[#526b00]">
                  Try 5 free questions →
                </span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Supplementary practice to use alongside class notes and teacher
            guidance.
          </p>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 bg-[#eaf7bb]"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">
                Access
              </p>
              <h2
                id="pricing-heading"
                className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Flexible access for learners and schools
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-white p-6 sm:p-8">
                <p className="text-sm font-bold text-slate-500">
                  Individual learners
                </p>
                <h3 className="mt-3 text-2xl font-bold">KES 300 / month</h3>
                <p className="mt-4 leading-7 text-slate-600">
                  Create an independent learner account, then confirm your
                  M-Pesa payment. Topic practice, study plans, feedback and
                  practical skills stay together.
                </p>
                <Link
                  to="/register"
                  className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101820] px-5 text-sm font-bold text-white"
                >
                  Create learner account <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </article>
              <article className="rounded-2xl bg-[#101820] p-6 text-white sm:p-8">
                <p className="text-sm font-bold text-[#B5E61D]">Schools</p>
                <h3 className="mt-3 text-2xl font-bold">
                  KES 200 / learner / year
                </h3>
                <p className="mt-4 leading-7 text-slate-300">
                  School-wide SBA projections, stream-scoped teacher access,
                  learner reports and onboarding support. Contact us to arrange
                  your school account.
                </p>
                <a
                  href={WHATSAPP_DEMO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-bold text-[#101820]"
                >
                  Request a school demo{" "}
                  <MessageCircle className="ml-2 h-4 w-4" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section
          className="border-b border-slate-200 bg-white"
          aria-labelledby="trust-heading"
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#526b00]">
                Simple by design
              </p>
              <h2
                id="trust-heading"
                className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Learning support that fits real family routines
              </h2>
              <p className="mt-5 max-w-2xl leading-7 text-slate-600">
                Students do not need a new app or expensive device. They sign in
                through a browser, complete the work at their pace and return to
                one familiar workspace.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F8FAFC] p-5">
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Clock3 className="h-4 w-4" /> Flexible
                </dt>
                <dd className="mt-2 font-bold">Learn anywhere</dd>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] p-5">
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <GraduationCap className="h-4 w-4" /> Focused
                </dt>
                <dd className="mt-2 font-bold">Grade-aware work</dd>
              </div>
            </dl>
            {/* Add a verified school testimonial here once one is available. */}
          </div>
        </section>

        <section
          className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
          aria-labelledby="faq-heading"
        >
          <h2
            id="faq-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Frequently asked questions
          </h2>
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-bold marker:hidden">
                  {faq.question}
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-normal transition group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pt-4 leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section
          className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24"
          aria-labelledby="cta-heading"
        >
          <div className="overflow-hidden rounded-[2rem] bg-[#101820] px-6 py-12 text-white sm:px-10 lg:flex lg:items-end lg:justify-between lg:gap-10 lg:px-14 lg:py-14">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B5E61D]">
                Start a conversation
              </p>
              <h2
                id="cta-heading"
                className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Ready for a clearer way to learn?
              </h2>
              <p className="mt-4 leading-7 text-slate-300">
                See how assignments, feedback, resources and learner support
                work together in one school workspace.
              </p>
              <p className="mt-3 text-sm font-semibold text-white">
                WhatsApp: 0748 519 923
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <a
                href={WHATSAPP_DEMO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#B5E61D] px-6 text-sm font-bold text-[#101820]"
              >
                Book a demo on WhatsApp
              </a>
              <Link
                to="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-bold text-white"
              >
                Create student account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0a1117] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p className="font-bold text-white">Assignment Hub</p>
            <p className="mt-2 text-sm">
              CBC revision, topic-led assignments, AI study support and
              practical skills for Grades 1–12.
            </p>
            <a
              href={WHATSAPP_CONTACT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-lg font-bold text-[#B5E61D] hover:text-white"
            >
              WhatsApp 0748 519 923
            </a>
          </div>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-3 text-sm"
            aria-label="Footer navigation"
          >
            <a href="/about/" className="hover:text-white">
              About
            </a>
            <a href="/revision/" className="hover:text-white">
              Free revision
            </a>
            <a href="#for-parents" className="hover:text-white">
              For parents
            </a>
            <a href="#for-schools" className="hover:text-white">
              For schools
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <Link to="/login" className="hover:text-white">
              Login
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-slate-500">
          © 2026 Andolih EdTech Studios. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
