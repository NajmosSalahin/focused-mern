import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import useHotkeys from './hooks/useHotkeys';
import Header from './components/Header';
import TaskBar from './components/TaskBar';
import PomodoroPanel from './components/PomodoroPanel';
import GoalsPanel from './components/GoalsPanel';
import ProjectsPanel from './components/ProjectsPanel';
import EntryList from './components/EntryList';
import PomoLog from './components/PomoLog';
import PomoGoal from './components/PomoGoal';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import Terminal from './components/Terminal';
import ToastContainer from './components/ToastContainer';
import SavingIndicator from './components/SavingIndicator';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import FeaturePage from './components/FeaturePage';

const AlertModal = lazy(() => import('./components/modals/AlertModal'));
const PomoSettingsModal = lazy(() => import('./components/modals/PomoSettingsModal'));
const CreateGoalModal = lazy(() => import('./components/modals/CreateGoalModal'));
const EditGoalModal = lazy(() => import('./components/modals/EditGoalModal'));
const CreateProjectModal = lazy(() => import('./components/modals/CreateProjectModal'));
const EditProjectModal = lazy(() => import('./components/modals/EditProjectModal'));
const EditEntryModal = lazy(() => import('./components/modals/EditEntryModal'));
const ExportModal = lazy(() => import('./components/modals/ExportModal'));
const ImportModal = lazy(() => import('./components/modals/ImportModal'));
const StatsModal = lazy(() => import('./components/modals/StatsModal'));
const KeyboardShortcutsModal = lazy(() => import('./components/modals/KeyboardShortcutsModal'));
const SettingsModal = lazy(() => import('./components/modals/SettingsModal'));
const ProfileModal = lazy(() => import('./components/modals/ProfileModal'));

function getPathToken(pattern) {
  const m = window.location.pathname.match(pattern);
  return m ? m[1] : null;
}

function AppContent() {
  const { user, loading } = useAuth();
  const urlVerifyToken = getPathToken(/^\/verify-email\/(.+)$/);
  const urlResetToken = getPathToken(/^\/reset-password\/(.+)$/);
  const [showLanding, setShowLanding] = useState(!urlVerifyToken && !urlResetToken);
  const [authMode, setAuthMode] = useState('login');

  // Global Escape to close any modal overlay
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        const overlay = document.querySelector('.overlay.open:not([data-no-overlay-close])');
        if (overlay) {
          const btn = overlay.querySelector('.mcls');
          if (btn) btn.click();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useHotkeys();

  const publicSlugs = ['features', 'pomodoro-technique', 'task-tracking', 'goals', 'projects', 'statistics'];
  const currentSlug = publicSlugs.find(s => window.location.pathname === `/${s}`);

  if (currentSlug) {
    return <FeaturePage slug={currentSlug} onGetStarted={() => { setShowLanding(false); setAuthMode('register'); }} onSignIn={() => { setShowLanding(false); setAuthMode('login'); }} />;
  }

  if (loading) {
    return <div className="app-loading"><i className="fas fa-circle-notch fa-spin"></i></div>;
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onGetStarted={() => { setShowLanding(false); setAuthMode('register'); }} onSignIn={() => { setShowLanding(false); setAuthMode('login'); }} />;
    }
    return <AuthPage initialMode={authMode} onBackToLanding={() => setShowLanding(true)} verifyToken={urlVerifyToken} resetToken={urlResetToken} />;
  }

  return (
    <div className="app">
      <Header />
      <TaskBar />
      <div className="app-grid">
        <div className="col-left">
          <PomodoroPanel />
        </div>
        <div className="col-center">
          <PomoGoal />
          <EntryList />
          <PomoLog />
        </div>
        <div className="col-right">
          <GoalsPanel />
          <ProjectsPanel />
          <Sidebar />
        </div>
      </div>
      <CommandPalette />
      <Terminal />
      <ToastContainer />
      <SavingIndicator />
      <Suspense fallback={null}>
        <AlertModal />
        <PomoSettingsModal />
        <CreateGoalModal />
        <EditGoalModal />
        <CreateProjectModal />
        <EditProjectModal />
        <EditEntryModal />
        <ExportModal />
        <ImportModal />
        <StatsModal />
        <KeyboardShortcutsModal />
        <SettingsModal />
        <ProfileModal />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
