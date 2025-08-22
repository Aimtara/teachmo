import { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import CommandPalette from './components/CommandPalette.jsx';
import { UserContext } from './context/UserContext.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const About = lazy(() => import('./pages/About.jsx'));

export default function App() {
  const user = { role: 'admin' };
  return (
    <UserContext.Provider value={user}>
      <ErrorBoundary>
        <a href="#main" className="skip-link">Skip to content</a>
        <nav role="navigation">
          <Link to="/">Home</Link> | <Link to="/about">About</Link>
        </nav>
        <CommandPalette />
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </UserContext.Provider>
  );
}
