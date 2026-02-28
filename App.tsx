import React from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SendWhatsApp from './pages/SendWhatsApp';
import Templates from './pages/Templates';
import Calibration from './pages/Calibration';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <main className="ml-64 flex-1 p-0 overflow-x-hidden">
        {/* Top subtle fade for better scroll aesthetics */}
        <div className="h-4 w-full bg-gradient-to-b from-slate-50 to-transparent fixed top-0 z-10 pointer-events-none ml-64" />
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<SendWhatsApp />} />
          <Route path="templates" element={<Templates />} />
          <Route path="calibration" element={<Calibration />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;