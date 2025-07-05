// frontend-examples/AuthenticationExample.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../path/to/your/firebase/config';
import { signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

const AuthenticationExample = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            if (user) {
                fetchUserProfile();
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch user profile from backend
    const fetchUserProfile = async () => {
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('http://localhost:5000/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                console.log('User profile:', data.data);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    // Sign up function
    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    role: 'learner'
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Sign in with custom token
                await signInWithCustomToken(auth, data.customToken);
                console.log('Sign up successful:', data.user);
            } else {
                setError(data.message || 'Sign up failed');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Sign in function
    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Sign in with custom token
                await signInWithCustomToken(auth, data.customToken);
                console.log('Sign in successful:', data.user);
            } else {
                setError(data.message || 'Sign in failed');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Sign out function
    const handleSignOut = async () => {
        try {
            const idToken = await auth.currentUser.getIdToken();

            // Sign out from backend
            await fetch('http://localhost:5000/api/auth/signout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Sign out from Firebase
            await auth.signOut();
            setUser(null);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    // Update profile function
    const handleUpdateProfile = async (newFirstName, newLastName) => {
        try {
            const idToken = await auth.currentUser.getIdToken();

            const response = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: newFirstName,
                    last_name: newLastName
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Profile updated:', data.data);
                // Refresh user profile
                await fetchUserProfile();
            }
        } catch (error) {
            console.error('Update profile error:', error);
        }
    };

    // Reset password function
    const handleResetPassword = async (email) => {
        try {
            const response = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                alert('Password reset link sent to your email');
                console.log('Reset link:', data.data.resetLink);
            }
        } catch (error) {
            console.error('Reset password error:', error);
        }
    };

    if (user) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
                <h2>Welcome, {user.email}!</h2>
                <p>UID: {user.uid}</p>

                <div style={{ marginTop: '20px' }}>
                    <h3>Profile Actions</h3>
                    <button
                        onClick={() => handleUpdateProfile('Jane', 'Smith')}
                        style={{ margin: '5px', padding: '10px' }}
                    >
                        Update Name to Jane Smith
                    </button>

                    <button
                        onClick={handleSignOut}
                        style={{ margin: '5px', padding: '10px', backgroundColor: '#ff4444', color: 'white' }}
                    >
                        Sign Out
                    </button>
                </div>

                <div style={{ marginTop: '20px' }}>
                    <h3>Admin Actions (if you're admin)</h3>
                    <button
                        onClick={async () => {
                            const idToken = await auth.currentUser.getIdToken();
                            const response = await fetch('http://localhost:5000/api/users', {
                                headers: { 'Authorization': `Bearer ${idToken}` }
                            });
                            const data = await response.json();
                            console.log('All users:', data);
                        }}
                        style={{ margin: '5px', padding: '10px' }}
                    >
                        Get All Users
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>

            {error && (
                <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red' }}>
                    {error}
                </div>
            )}

            <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
                <div style={{ marginBottom: '10px' }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                    />
                </div>

                {isSignUp && (
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <input
                                type="text"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                            />
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        marginBottom: '10px'
                    }}
                >
                    {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline' }}
                >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
            </div>

            {!isSignUp && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                        onClick={() => handleResetPassword(email)}
                        style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline' }}
                    >
                        Forgot Password?
                    </button>
                </div>
            )}
        </div>
    );
};

export default AuthenticationExample;
