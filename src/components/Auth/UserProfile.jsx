import { useAuth } from '../../contexts/AuthContext';
import './UserProfile.css';

export default function UserProfile() {
  const { user, logout } = useAuth();

  return (
    <div className="user-profile">
      {user ? (
        <>
          <img 
            src={user.photoURL} 
            alt={user.displayName} 
            className="user-avatar"
          />
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </>
      ) : null}
    </div>
  );
}