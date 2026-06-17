import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
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
import AlertModal from './components/modals/AlertModal';
import PomoSettingsModal from './components/modals/PomoSettingsModal';
import CreateGoalModal from './components/modals/CreateGoalModal';
import EditGoalModal from './components/modals/EditGoalModal';
import CreateProjectModal from './components/modals/CreateProjectModal';
import EditProjectModal from './components/modals/EditProjectModal';
import EditEntryModal from './components/modals/EditEntryModal';
import ExportModal from './components/modals/ExportModal';
import ImportModal from './components/modals/ImportModal';
import StatsModal from './components/modals/StatsModal';
import KeyboardShortcutsModal from './components/modals/KeyboardShortcutsModal';
import SettingsModal from './components/modals/SettingsModal';
import ProfileModal from './components/modals/ProfileModal';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState('login');

  if (loading) {
    return <div className="app-loading"><i className="fas fa-circle-notch fa-spin"></i></div>;
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onGetStarted={() => { setShowLanding(false); setAuthMode('register'); }} onSignIn={() => { setShowLanding(false); setAuthMode('login'); }} />;
    }
    return <AuthPage initialMode={authMode} />;
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
      {/* Modals */}
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
