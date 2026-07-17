import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-brand">Assignments Hub</h1>
          <p className="text-sm text-gray-500 mt-1">CBC learning &amp; assignments, for every school</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
