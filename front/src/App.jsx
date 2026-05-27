import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import { ToastProvider } from './components/Toast';

// Pages
import UploadPage from './pages/UploadPage';
import LoadingPage from './pages/LoadingPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import GraphPage from './pages/GraphPage';
import QueryPage from './pages/QueryPage';
import CalendarPage from './pages/CalendarPage';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          {/* Top Navigation */}
          <TopAppBar />

          {/* Main Content Area */}
          <div className="flex-grow pt-16 pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/loading/:id" element={<LoadingPage />} />
              <Route path="/result/:id" element={<ResultPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/graph/:id" element={<GraphPage />} />
              <Route path="/query/:id" element={<QueryPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
            </Routes>
          </div>

          {/* Mobile Bottom Navigation */}
          <BottomNavBar />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
