import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import UserProfile from './components/Auth/UserProfile';
import Dashboard from './components/Dashboard/dashboard';
import GameWindow from './components/GameWindow/GameWindow';
import LoadingSpinner from './components/Common/LoadingSpinner';
import Login from './components/Auth/Login'; // Import the new Login component
import './App.css';

// ProtectedRoute component remains the same
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Conditionally render header/profile based on auth state */}
        {user && (
          <header className="app-header">
          <h1>MathQuest</h1>
          <UserProfile />
          </header>
        )}

        <main className="app-content">
          <Routes>
            {/* Updated login route using the new component */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" replace /> : <Login />} 
            />

            {/* Protected routes remain the same */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/game" element={
              <ProtectedRoute>
                <GameWindow />
              </ProtectedRoute>
            } />

            {/* Fallback redirects */}
            <Route path="*" element={
              <Navigate to={user ? "/" : "/login"} replace />
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;