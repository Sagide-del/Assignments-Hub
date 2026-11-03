import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "../../../components/ui/Saas";

export default function CmsAnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Global Analytics" />
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
        <BarChart3
          className="mx-auto h-8 w-8 text-slate-300"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          Reporting is not connected yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          The current CMS API does not provide global usage, delivery or
          generation-cost reports.
        </p>
        <Link
          to="/admin/cms"
          className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
        >
          Content Library
        </Link>
      </section>
    </div>
  );
}
