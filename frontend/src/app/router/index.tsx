import { createBrowserRouter, Navigate } from 'react-router-dom';

import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

import Login from '../../pages/Login';
import { PlatformLogin } from '../../features/authentication/PlatformLogin';

import { StudentDashboard } from '../../features/student/Dashboard';
import { ExamPlayer } from '../../features/student/ExamPlayer';
import { StemLabsPage } from '../../features/student/StemLabs';
import { StemLabPlayerPage } from '../../features/student/StemLabPlayer';
import { MyAssignmentsPage } from '../../features/student/MyAssignments';
import { FutureSkillsPage } from '../../features/student/FutureSkills';
import { MyFuturePage } from '../../features/student/MyFuture';
import { MyActivitiesPage } from '../../features/student/MyActivities';
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
import { SchoolAdminBilling } from '../../features/school-admin/Billing';
import { SchoolAdminReports } from '../../features/school-admin/Reports';
import { AiUsage } from '../../features/school-admin/AiUsage';

import { PlatformOverview } from '../../features/platform-admin/Overview';
import { PlatformAdminDashboard } from '../../features/platform-admin/Dashboard';
import { AiAnalytics } from '../../features/platform-admin/AiAnalytics';
import { StemContentStudio } from '../../features/platform-admin/StemContentStudio';
import { PlatformBilling } from '../../features/platform-admin/Billing';

import { ParentPortal } from '../../features/parent/ParentPortal';


const studentNav = [
  {
    to: '/student/my-assignments',
    label: 'My Assignments',
  },
  {
    to: '/student/stem-labs',
    label: 'STEM Labs',
  },
  {
    to: '/student/future-skills',
    label: 'Future Skills',
  },
  {
    to: '/student/my-future',
    label: 'My Future',
  },
  {
    to: '/student/my-activities',
    label: 'My Activities',
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
    to: '/school-admin/billing',
    label: 'Subscription',
  },
  {
    to: '/school-admin/reports',
    label: 'Reports',
  },
  {
    to: '/school-admin/ai-usage',
    label: 'AI Usage',
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
  {
    to: '/platform/stem-content',
    label: 'STEM Studio',
  },
  {
    to: '/platform/billing',
    label: 'Billing',
  },
  {
    to: '/platform/ai-analytics',
    label: 'AI Analytics',
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
            path: '/student/my-assignments',
            element: <MyAssignmentsPage />,
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
            path: '/student/stem-labs/:id',
            element: <StemLabPlayerPage />,
          },
          {
            path: '/student/future-skills',
            element: <FutureSkillsPage />,
          },
          {
            path: '/student/my-future',
            element: <MyFuturePage />,
          },
          {
            path: '/student/my-activities',
            element: <MyActivitiesPage />,
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
            element: <Navigate to="/school-admin/billing" replace />,
          },
          {
            path: '/school-admin/billing',
            element: <SchoolAdminBilling />,
          },
          {
            path: '/school-admin/reports',
            element: <SchoolAdminReports />,
          },
          {
            path: '/school-admin/ai-usage',
            element: <AiUsage />,
          },
        ],
      },
    ],
  },


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
          {
            path: '/platform/stem-content',
            element: <StemContentStudio />,
          },
          {
            path: '/platform/billing',
            element: <PlatformBilling />,
          },
          {
            path: '/platform/ai-analytics',
            element: <AiAnalytics />,
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

    <div className="min-h-screen flex items-center justify-center">

      <div className="text-center">

        <h1 className="text-xl font-semibold">
          Not authorized
        </h1>


        <p className="text-sm text-gray-500 mt-1">
          Your account doesn't have access to this page.
        </p>


      </div>

    </div>

  );

}
