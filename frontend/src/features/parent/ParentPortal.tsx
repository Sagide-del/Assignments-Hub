// The backend has no PARENT role, no parent login endpoint, and no
// parent-scoped data (see backend/prisma/schema.prisma's Role enum). This
// screen is a real, routed page — not a silent dead end — but it's honest
// about not being wired to anything yet, per the "don't fake backend logic"
// rule. Once a backend parent-auth story exists (see ROADMAP.md), swap this
// for a real login form calling the new endpoint.
export function ParentPortal() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold">Parent Portal — Coming Soon</h1>
        <p className="text-sm text-gray-600">
          Parent accounts aren't supported by the backend yet, so there's nothing real to log
          into here. This page is a placeholder rather than a form that would quietly fail.
        </p>
        <p className="text-xs text-gray-400">
          Building this requires backend work first: a PARENT role, a parent login/linking
          endpoint, and parent-scoped read access to a student's assignments/reports.
        </p>
      </div>
    </div>
  );
}
