// Example React Integration
// Save this as: frontend-examples/AuthExample.jsx

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "stellarion-b76d6.firebaseapp.com",
  projectId: "stellarion-b76d6",
  // Add other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const API_BASE_URL = 'http://localhost:5432/api';

// Authentication Hook
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Get user profile from backend
        try {
          const token = await firebaseUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data.user);
          }
        } catch (error) {
          console.error('Failed to get user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Register with backend
      const token = await userCredential.user.getIdToken();
      await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUser: {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName
          }
        })
      });

      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return { user, userProfile, loading, signIn, signOut };
};

// Login Component
const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onLogin(email, password);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h4>Test Users:</h4>
        <p>Admin: admin@gmail.com / admin</p>
        <p>Manager: manager@gmail.com / manager</p>
        <p>User: user@gmail.com / user</p>
      </div>
    </form>
  );
};

// User Profile Component
const UserProfile = ({ user, userProfile, onSignOut }) => {
  if (!userProfile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div>
      <h2>Welcome, {userProfile.first_name || userProfile.email}!</h2>
      <div style={{ backgroundColor: '#f9f9f9', padding: '15px', margin: '10px 0' }}>
        <h3>Profile Information</h3>
        <p><strong>Email:</strong> {userProfile.email}</p>
        <p><strong>Role:</strong> {userProfile.role}</p>
        <p><strong>Status:</strong> {userProfile.is_active ? 'Active' : 'Inactive'}</p>
        <p><strong>Last Login:</strong> {new Date(userProfile.last_login).toLocaleString()}</p>
        <p><strong>Member Since:</strong> {new Date(userProfile.created_at).toLocaleDateString()}</p>
      </div>

      <RoleBasedContent userRole={userProfile.role} />

      <button onClick={onSignOut}>Sign Out</button>
    </div>
  );
};

// Role-based Content Component
const RoleBasedContent = ({ userRole }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    if (userRole === 'user') return; // Users can't access this

    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    if (userRole !== 'admin') return; // Only admins can update roles

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        loadUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {userRole === 'user' && (
        <div style={{ padding: '10px', backgroundColor: '#e3f2fd' }}>
          <h3>User Dashboard</h3>
          <p>Welcome! You have user-level access.</p>
        </div>
      )}

      {(userRole === 'manager' || userRole === 'admin') && (
        <div style={{ padding: '10px', backgroundColor: '#f3e5f5' }}>
          <h3>Management Dashboard</h3>
          <button onClick={loadUsers} disabled={loading}>
            {loading ? 'Loading...' : 'Load All Users'}
          </button>

          {users.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h4>All Users</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Role</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                    {userRole === 'admin' && (
                      <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.email}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {userRole === 'admin' ? (
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                          >
                            <option value="user">User</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          user.role
                        )}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </td>
                      {userRole === 'admin' && (
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <button style={{ fontSize: '12px' }}>
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {userRole === 'admin' && (
        <div style={{ padding: '10px', backgroundColor: '#ffebee', marginTop: '10px' }}>
          <h3>Admin Dashboard</h3>
          <p>You have full administrative access to manage users and roles.</p>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const { user, userProfile, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Enhanced Authentication Demo</h1>

      {!user ? (
        <LoginForm onLogin={signIn} />
      ) : (
        <UserProfile
          user={user}
          userProfile={userProfile}
          onSignOut={signOut}
        />
      )}
    </div>
  );
};

export default App;

/* 
Setup Instructions:

1. Install dependencies:
   npm install firebase

2. Update firebaseConfig with your project credentials

3. Create test users in Firebase Console:
   - admin@gmail.com (password: admin)
   - manager@gmail.com (password: manager)  
   - user@gmail.com (password: user)

4. Start your backend server:
   npm run dev

5. Use this component in your React app

Features demonstrated:
- Firebase authentication
- Automatic backend registration
- Role-based UI rendering
- Protected API calls
- User management (admin only)
- Real-time authentication state
*/
