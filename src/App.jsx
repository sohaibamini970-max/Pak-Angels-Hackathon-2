import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CreateCV from './pages/CreateCV';
import UpdateCV from './pages/UpdateCV';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<CreateCV />} />
          <Route path="/update" element={<UpdateCV />} />
        </Routes>
      </main>
    </div>
  );
}