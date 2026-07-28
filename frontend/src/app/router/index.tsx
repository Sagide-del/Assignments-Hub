import { createBrowserRouter, Navigate } from 'react-router-dom';

import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

import Login from '../../pages/Login';
import IndependentRegister from '../../pages/IndependentRegister';
import { PlatformLogin } from '../../features/authentication/PlatformLogin';

import { StudentDashboard } from '../../features/student/Dashboard';
import { ExamPlayer } from '../../features/student/ExamPlayer';
import { StemLabsPage } from '../../features/student/StemLabs';
import { StemLabPlayerPage } from '../../features/student/StemLabPlayer';
import { MyAssignmentsPage } from '../../features/student/MyAssignments';
import { LearnSkillsPage } from '../../features/student/LearnSkills';
import { SkillDetailPage } from '../../features/student/SkillDetail';
import { MyPathwayPage } from '../../features/student/my-pathway/MyPathwayPage';
import { MessagesPage } from '../../features/student/Messages';
import { MnemonicCardsPage } from '../../features/student/MnemonicCards';
import { SupportNeedsPage } from '../../features/student/SupportNeeds';
import { StudentReports } from '../../features/student/Reports';

import { TeacherDashboard } from '../../features/teacher/Dashboard';
import { CreateAssignmentRich } from '../../features/teacher/CreateAssignmentRich';
import AiAssignmentGenerator from '../../features/teacher/AiAssignmentGenerator';
import { Marking } from '../../features/teacher/Marking';
import { CslReview } from '../../features/teacher/CslReview';
import { PathwaysStats } from '../../features/teacher/PathwaysStats';
import { MentorshipInboxPage } from '../../features/teacher/MentorshipInbox';
import { TeacherMessagesPage } from '../../features/teacher/Messages';

import { SchoolAdminDashboard } from '../../features/school-admin/Dashboard';
import { BrandingSettings } from '../../features/school-admin/Branding';
import { SchoolAdminBilling } from '../../features/school-admin/Billing';
import { SchoolAdminReports } from '../../features/school-admin/Reports';
import { AiUsage } from '../../features/school-admin/AiUsage';
import { MessagesOversight } from '../../features/school-admin/MessagesOversight';

import { PlatformOverview } from '../../features/platform-admin/Overview';
import { PlatformAdminDashboard } from '../../features/platform-admin/Dashboard';
import { AiAnalytics } from '../../features/platform-admin/AiAnalytics';
import { StemContentStudio } from '../../features/platform-admin/StemContentStudio';
import { PlatformBilling } from '../../features/platform-admin/Billing';
import { SkillStudio } from '../../features/platform-admin/SkillStudio';
import { IndependentStudentsPage } from '../../features/platform-admin/IndependentStudents';
import { MnemonicCardsStudio } from '../../features/platform-admin/MnemonicCardsStudio';
import { IndependentAssignmentsPage } from '../../features/platform-admin/IndependentAssignments';

import { ParentPortal } from '../../features/parent/ParentPortal';


const studentNav = [
  {
    to: '/student/my-assignments',
    label: 'My Assignments',
  },
  {
    to: '/student/mnemonic-cards',
    label: 'Mnemonic Cards',
  },
  {
    to: '/student/stem-labs',
    label: 'STEM Labs',
  },
  {
    to: '/student/learn-skills',
    label: 'Learn a Skill',
  },
  {
    to: '/student/my-pathway',
    label: 'My Pathway',
  },
  {
    to: '/student/messages',
    label: 'News/Messages',
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
  {
    to: '/teacher/mentorship',
    label: 'Mentorship',
  },
  {
    to: '/teacher/messages',
    label: 'Messages',
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
  {
    to: '/school-admin/messages',
    label: 'Messages',
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
    to: '/platform/independent-students',
    label: 'Independent Students',
  },
  {
    to: '/platform/independent-assignments',
    label: 'Independent Assignments',
  },
  {
    to: '/platform/stem-content',
    label: 'STEM Studio',
  },
  {
    to: '/platform/skill-studio',
    label: 'Skill Studio',
  },
  {
    to: '/platform/mnemonic-cards',
    label: 'Mnemonic Cards',
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
    path: '/register',
    element: <IndependentRegister />,
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
            path: '/student/mnemonic-cards',
            element: <MnemonicCardsPage />,
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
            element: <Navigate to="/student/learn-skills" replace />,
          },
          {
            path: '/student/learn-skills',
            element: <LearnSkillsPage />,
          },
          {
            path: '/student/learn-skills/:id',
            element: <SkillDetailPage />,
          },
          {
            // "My Future" was renamed to "My Pathway" — redirect old
            // bookmarks/links rather than break them.
            path: '/student/my-future',
            element: <Navigate to="/student/my-pathway" replace />,
          },
          {
            path: '/student/my-pathway',
            element: <MyPathwayPage />,
          },
          {
            // "My Activity" was retired in favor of News/Messages —
            // redirect old bookmarks/links rather than break them.
            path: '/student/my-activities',
            element: <Navigate to="/student/messages" replace />,
          },
          {
            path: '/student/messages',
            element: <MessagesPage />,
          },
          {
            // Career Pathways is now a tab inside My Pathway rather than its
            // own page — redirect old bookmarks/links.
            path: '/student/pathways',
            element: <Navigate to="/student/my-pathway" replace />,
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
            element: <CreateAssignmentRich />,
          },
          {
            path: '/teacher/assignments/new-rich',
            element: <Navigate to="/teacher/assignments/new" replace />,
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
          {
            path: '/teacher/mentorship',
            element: <MentorshipInboxPage />,
          },
          {
            path: '/teacher/messages',
            element: <TeacherMessagesPage />,
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
          {
            path: '/school-admin/messages',
            element: <MessagesOversight />,
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
            path: '/platform/independent-students',
            element: <IndependentStudentsPage />,
          },
          {
            path: '/platform/independent-assignments',
            element: <IndependentAssignmentsPage />,
          },
          {
            path: '/platform/independent-assignments/new',
            element: (
              <CreateAssignmentRich
                target="independent"
                returnTo="/platform/independent-assignments"
              />
            ),
          },
          {
            path: '/platform/stem-content',
            element: <StemContentStudio />,
          },
          {
            path: '/platform/skill-studio',
            element: <SkillStudio />,
          },
          {
            path: '/platform/mnemonic-cards',
            element: <MnemonicCardsStudio />,
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
