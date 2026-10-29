import { lazy } from 'react';
import { createBrowserRouter, Link, Navigate, useLocation } from 'react-router-dom';

import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../../store/auth.store';
import { dashboardPathForRole } from '../../services/authService';

import Login from '../../pages/Login';
import Home from '../../pages/Home';
import IndependentRegister from '../../pages/IndependentRegister';

import { StemLabsPage } from '../../features/student/StemLabs';
import { MyAssignmentsPage } from '../../features/student/MyAssignments';
import { LearnSkillsPage } from '../../features/student/LearnSkills';
import { SkillDetailPage } from '../../features/student/SkillDetail';
import { MyPathwayPage } from '../../features/student/my-pathway/MyPathwayPage';
import { MessagesPage } from '../../features/student/Messages';
import { MnemonicCardsPage } from '../../features/student/MnemonicCards';
import { SupportNeedsPage } from '../../features/student/SupportNeeds';
import { StudentReports } from '../../features/student/Reports';
import { MyResourcesPage } from '../../features/student/MyResources';
import { TrialActivationPage } from '../../features/student/TrialActivation';
import { LearningCoachPage } from '../../features/student/LearningCoach';
import { StudentDashboard } from '../../features/student/Dashboard';

import { TeacherDashboard } from '../../features/teacher/Dashboard';
import QuestionBankBrowser from '../../features/teacher/QuestionBankBrowser';
import { AnalyticsDashboard } from '../../features/teacher/AnalyticsDashboard';
import { Marking } from '../../features/teacher/Marking';
import { CslReview } from '../../features/teacher/CslReview';
import { PathwaysStats } from '../../features/teacher/PathwaysStats';
import { MentorshipInboxPage } from '../../features/teacher/MentorshipInbox';
import { TeacherMessagesPage } from '../../features/teacher/Messages';
import { ResourceStudioPage } from '../../features/teacher/ResourceStudio';
import { AcademicReports } from '../../features/teacher/AcademicReports';

import { SchoolAdminDashboard } from '../../features/school-admin/Dashboard';
import { BrandingSettings } from '../../features/school-admin/Branding';
import { SchoolAdminBilling } from '../../features/school-admin/Billing';
import { SchoolAdminReports } from '../../features/school-admin/Reports';
import { AiUsage } from '../../features/school-admin/AiUsage';
import { MessagesOversight } from '../../features/school-admin/MessagesOversight';
import { AcademicResults } from '../../features/school-admin/AcademicResults';

import { PlatformOverview } from '../../features/platform-admin/Overview';
import { PlatformAdminDashboard } from '../../features/platform-admin/Dashboard';
import {CurriculumLibrary} from '../../features/platform-admin/CurriculumLibrary';
import { AiManagement } from '../../features/platform-admin/AiManagement';
import { SchoolActivation } from '../../features/platform-admin/SchoolActivation';
import { IndependentStudentsPage } from '../../features/platform-admin/IndependentStudents';
import { IndependentAssignmentsPage } from '../../features/platform-admin/IndependentAssignments';
import { PrivateTutorPage } from '../../features/platform-admin/PrivateTutor';
import { TutorMessagesPage } from '../../features/platform-admin/TutorMessages';
import { ResourceMarketplaceAdminPage } from '../../features/platform-admin/ResourceMarketplace';
import { LiveActivity } from '../../features/platform-admin/LiveActivity';

import { ParentPortal } from '../../features/parent/ParentPortal';

const ExamPlayer = lazy(() =>
  import('../../features/student/ExamPlayer').then((module) => ({ default: module.ExamPlayer })),
);
const KjseaMockTestPage = lazy(() => import('../../features/student/kjsea/KjseaMockTest').then(m=>({default:m.KjseaMockTestPage})));
const KjseaMockPlayerPage = lazy(() => import('../../features/student/kjsea/KjseaMockPlayer').then(m=>({default:m.KjseaMockPlayerPage})));
const StemLabPlayerPage = lazy(() =>
  import('../../features/student/StemLabPlayer').then((module) => ({ default: module.StemLabPlayerPage })),
);
const SkillWorkspacePage = lazy(() =>
  import('../../features/student/skill-workspace/SkillWorkspace').then((module) => ({ default: module.SkillWorkspacePage })),
);
const CreateAssignmentRich = lazy(() =>
  import('../../features/teacher/CreateAssignmentRich').then((module) => ({ default: module.CreateAssignmentRich })),
);
const EditAssignmentRich = lazy(() =>
  import('../../features/teacher/CreateAssignmentRich').then((module) => ({ default: module.EditAssignmentRich })),
);
const QuestionBankManagement = lazy(() =>
  import('../../features/platform-admin/QuestionBankManagement').then((module) => ({ default: module.QuestionBankManagement })),
);
const StemContentStudio = lazy(() =>
  import('../../features/platform-admin/StemContentStudio').then((module) => ({ default: module.StemContentStudio })),
);
const PlatformBilling = lazy(() =>
  import('../../features/platform-admin/Billing').then((module) => ({ default: module.PlatformBilling })),
);
const SkillStudio = lazy(() =>
  import('../../features/platform-admin/SkillStudio').then((module) => ({ default: module.SkillStudio })),
);
const MnemonicCardsStudio = lazy(() =>
  import('../../features/platform-admin/MnemonicCardsStudio').then((module) => ({ default: module.MnemonicCardsStudio })),
);


const studentNav = [
  {
    to: '/student',
    label: 'Dashboard',
  },
  {
    to: '/student/my-assignments',
    label: 'My Assignments',
  },
  {
    to: '/student/kjsea-mock-test',
    label: 'KJSEA Mock Test',
  },
  {
    to: '/student/mnemonic-cards',
    label: 'Mnemonic Cards',
  },
  {
    to: '/student/learning-coach',
    label: 'Learning Coach',
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
    to: '/student/resources',
    label: 'My Resources',
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
    to: '/teacher/question-bank',
    label: 'Question Bank',
  },
  {
    to: '/teacher/analytics',
    label: 'Analytics',
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
  {
    to: '/teacher/resources',
    label: 'Resource Studio',
  },
  {
    to: '/teacher/academic-reports',
    label: 'Academic Reports',
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
    to: '/school-admin/academic-results',
    label: 'Academic Results',
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
 {to:'/platform',label:'Dashboard'},
 {to:'/platform/question-bank',label:'Question Bank'},
 {to:'/platform/schools',label:'Schools'},
 {to:'/platform/independent-students',label:'Independent Students'},
 {to:'/platform/stem-content',label:'STEM Studio'},
 {to:'/platform/skill-studio',label:'Skill Studio'},
 {to:'/platform/resources',label:'Resources'},
 {to:'/platform/messages',label:'Messages'},
 {to:'/platform/billing',label:'Billing'},
 {to:'/platform/activity',label:'Live Activity'},
];


export const router = createBrowserRouter([

  {
    path: '/login',
    element: <Login />,
  },

  {
    path: '/school/:schoolCode/login',
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
    element: <Navigate to="/login?account=staff" replace />,
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
            path: '/student/kcse-papers',
            element: <Navigate to="/student/kjsea-mock-test" replace />,
          },
          {path:'/student/kjsea-mock-test',element:<KjseaMockTestPage/>},
          {path:'/student/kjsea-mock-test/:id',element:<KjseaMockPlayerPage/>},
          {
            path: '/student/mnemonic-cards',
            element: <MnemonicCardsPage />,
          },
          {
            path: '/student/learning-coach',
            element: <LearningCoachPage />,
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
            path: '/student/learn-skills/:id/workspace',
            element: <SkillWorkspacePage />,
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
            // Keep the retired activity URL working while the learner's
            // primary library now lives under My Resources.
            // redirect old bookmarks/links rather than break them.
            path: '/student/my-activities',
            element: <Navigate to="/student/resources" replace />,
          },
          {
            path: '/student/resources',
            element: <MyResourcesPage />,
          },
          {
            path: '/student/activate',
            element: <TrialActivationPage />,
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
            path: '/teacher/assignments/:id/edit',
            element: <EditAssignmentRich />,
          },
          {
            path: '/teacher/assignments/new-rich',
            element: <Navigate to="/teacher/assignments/new" replace />,
          },
          {
            path: '/teacher/question-bank',
            element: <QuestionBankBrowser />,
          },
          {
            path: '/teacher/analytics',
            element: <AnalyticsDashboard />,
          },
          {
            // AI generation moved to Platform Admin (Question Bank) —
            // redirect old bookmarks/links rather than break them.
            path: '/teacher/assignments/generate',
            element: <Navigate to="/teacher/question-bank" replace />,
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
          {
            path: '/teacher/resources',
            element: <ResourceStudioPage />,
          },
          {
            path: '/teacher/academic-reports',
            element: <AcademicReports />,
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
            path: '/school-admin/academic-results',
            element: <AcademicResults />,
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
            path: '/platform/activity',
            element: <LiveActivity />,
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
            path: '/platform/private-tutor',
            element: <PrivateTutorPage />,
          },
          {
            path: '/platform/messages',
            element: <TutorMessagesPage />,
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
            path: '/platform/independent-assignments/:id/edit',
            element: (
              <EditAssignmentRich
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
            path: '/platform/resources',
            element: <ResourceMarketplaceAdminPage />,
          },
          {
            path: '/platform/billing',
            element: <PlatformBilling />,
          },
          {
            path: '/platform/curriculum-library',
            element: <CurriculumLibrary />,
          },
          {
            path: '/platform/ai-management',
            element: <AiManagement />,
          },
          {
            path: '/platform/ai-analytics',
            element: <Navigate to="/platform/ai-management" replace />,
          },
          {
            path: '/platform/question-bank',
            element: <QuestionBankManagement />,
          },
          {
            path: '/platform/question-bank/schools',
            element: <SchoolActivation />,
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
    element: <Home />,
  },

  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },

]);


function UnauthorizedPage() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const requestedPath = (location.state as { from?: string } | null)?.from;
  const home = user ? dashboardPathForRole(user.role) : '/login';
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#607D00]">Assignments Hub</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#101820]">This page belongs to another workspace.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{requestedPath ? `“${requestedPath}”` : 'The page'} is not available for your current account. Your account is still active.</p>
        <Link to={home} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B5E61D] px-4 text-sm font-bold text-[#101820]">Go to my workspace</Link>
        <Link to="/login" className="mt-3 inline-flex min-h-10 items-center justify-center text-sm font-semibold text-slate-600 hover:text-[#101820]">Use a different account</Link>
      </div>
    </div>
  );
}
