import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import EventTimeline from './pages/EventTimeline';
import AdminQueue from './admin/AdminQueue';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/timeline" element={<EventTimeline />} />
        <Route path="/admin/queue" element={<AdminQueue />} />
      </Routes>
    </Layout>
  );
}
