// Shared SaaS footer. Rendered once, inside DashboardLayout (see
// layouts/DashboardLayout.tsx), so it automatically appears on every
// authenticated dashboard — Student, Teacher, School Admin, Platform Admin —
// without being duplicated per-page.
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-slate-200 px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-slate-500">Powered by Andolih EdTech Studios</p>
        <p className="text-xs text-slate-400">© {year} Andolih EdTech Studios. All rights reserved.</p>
      </div>
    </footer>
  );
}
