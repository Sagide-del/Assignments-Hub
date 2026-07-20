import { createBrowserRouter, Navigate } from 'react-router-dom';

import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

import Login from '../../pages/Login';
import { PlatformLogin } from '../../features/authentication/PlatformLogin';

import { StudentDashboard } from '../../features/student/Dashboard';
import { ExamPlayer } from '../../features/student/ExamPlayer';
import { StemLabsPage } from '../../features/student/StemLabs';
import { CareerPathwaysPage } from '../../features/student/CareerPathways';
import { SupportNeedsPage } from '../../features/student/SupportNeeds';
import { StudentReports } from '../../features/student/Reports';

import { TeacherDashboard } from '../../features/teacher/Dashboard';
import { CreateAssignment } from '../../features/teacher/CreateAssignment';
import AiAssignmentGenerator from '../../features/teacher/AiAssignmentGenerator';
import { Marking } from '../../features/teacher/Marking';
import { CslReview } from '../../features/teacher/CslReview';
import { PathwaysStats } from '../../features/teacher/PathwaysStats';

import { SchoolAdminDashboard } from '../../features/school-admin/Dashboard';
import { BrandingSettings } from '../../features/school-admin/Branding';
import { SchoolAdminReports } from '../../features/school-admin/Reports';
import { IntaSendCheckout } from '../../features/payments/IntaSendCheckout';

import { PlatformOverview } from '../../features/platform-admin/Overview';
import { PlatformAdminDashboard } from '../../features/platform-admin/Dashboard';

import { ParentPortal } from '../../features/parent/ParentPortal';


const studentNav = [
  {
    to: '/student',
    label: 'Dashboard',
  },
  {
    to: '/student/stem-labs',
    label: 'STEM Labs & CSL',
  },
  {
    to: '/student/pathways',
    label: 'Career Pathways',
  },
  {
    to: '/student/support-needs',
    label: 'Support Needs',
  },
  {
    to: '/student/reports',
    label: 'My Reports',
  },
];


const teacherNav = [
  {
    to: '/teacher',
    label: 'Dashboard',
  },
  {
    to: '/teacher/assignments/new',
    label: 'New Assignment',
  },
  {
    to: '/teacher/assignments/generate',
    label: 'AI Generator',
  },
  {
    to: '/teacher/marking',
    label: 'Marking',
  },
  {
    to: '/teacher/csl-review',
    label: 'CSL Review',
  },
  {
    to: '/teacher/pathways-stats',
    label: 'Career Pathways',
  },
];


const schoolAdminNav = [
  {
    to: '/school-admin',
    label: 'Dashboard',
  },
  {
    to: '/school-admin/branding',
    label: 'Branding',
  },
  {
    to: '/school-admin/subscription',
    label: 'Subscription',
  },
  {
    to: '/school-admin/reports',
    label: 'Reports',
  },
];


const platformAdminNav = [
  {
    to: '/platform',
    label: 'Dashboard',
  },
  {
    to: '/platform/schools',
    label: 'Schools',
  },
];


export const router = createBrowserRouter([

  {
    path: '/login',
    element: <Login />,
  },

  {
    path: '/login/staff',
    element: <Navigate to="/login" replace />,
  },

  {
    path: '/platform-console',
    element: <PlatformLogin />,
  },

  {
    path: '/parent',
    element: <ParentPortal />,
  },


  // STUDENT
  {
    element: <ProtectedRoute allow={['STUDENT']} />,
    children: [
      {
        element: <DashboardLayout nav={studentNav} />,
        children: [
          {
            path: '/student',
            element: <StudentDashboard />,
          },
          {
            path: '/student/assignments/:id',
            element: <ExamPlayer />,
          },
          {
            path: '/student/stem-labs',
            element: <StemLabsPage />,
          },
          {
            path: '/student/pathways',
            element: <CareerPathwaysPage />,
          },
          {
            path: '/student/support-needs',
            element: <SupportNeedsPage />,
          },
          {
            path: '/student/reports',
            element: <StudentReports />,
          },
        ],
      },
    ],
  },


  // TEACHER
  {
    element: <ProtectedRoute allow={['TEACHER']} />,
    children: [
      {
        element: <DashboardLayout nav={teacherNav} />,
        children: [
          {
            path: '/teacher',
            element: <TeacherDashboard />,
          },
          {
            path: '/teacher/assignments/new',
            element: <CreateAssignment />,
          },
          {
            path: '/teacher/assignments/generate',
            element: <AiAssignmentGenerator />,
          },
          {
            path: '/teacher/marking',
            element: <Marking />,
          },
          {
            path: '/teacher/csl-review',
            element: <CslReview />,
          },
          {
            path: '/teacher/pathways-stats',
            element: <PathwaysStats />,
          },
        ],
      },
    ],
  },


  // SCHOOL ADMIN
  {
    element: <ProtectedRoute allow={['SCHOOL_ADMIN']} />,
    children: [
      {
        element: <DashboardLayout nav={schoolAdminNav} />,
        children: [
          {
            path: '/school-admin',
            element: <SchoolAdminDashboard />,
          },
          {
            path: '/school-admin/branding',
            element: <BrandingSettings />,
          },
          {
            path: '/school-admin/subscription',
            element: <IntaSendCheckout />,
          },
          {
            path: '/school-admin/reports',
            element: <SchoolAdminReports />,
          },
        ],
      },
    ],
  },


  // PLATFORM ADMIN
  {
    element:
      <ProtectedRoute
        allow={['PLATFORM_ADMIN']}
        redirectTo="/platform-console"
      />,
    children: [
      {
        element: <DashboardLayout nav={platformAdminNav} />,
        children: [
          {
            path: '/platform',
            element: <PlatformOverview />,
          },
          {
            path: '/platform/schools',
            element: <PlatformAdminDashboard />,
          },
        ],
      },
    ],
  },


  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },

  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },

  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },

]);


function UnauthorizedPage() {
  return (
    <div className="
      min-h-screen
      flex
      items-center
      justify-center
    ">
      <div className="text-center">
        <h1 className="
          text-xl
          font-semibold
        ">
          Not authorized
        </h1>

        <p className="
          text-sm
          text-gray-500
          mt-1
        ">
          Your account doesn't have access to this page.
        </p>
      </div>
    </div>
  );
}