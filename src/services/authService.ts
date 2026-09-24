import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  AuthError
} from 'firebase/auth';
import { auth } from './firebase.js';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Maps Firebase Auth error codes into human-readable user-facing messages
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred. Please try again.';
  
  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Pop-up was blocked by your browser. Please allow pop-ups to continue with Google.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains).';
  }
  if (code === 'auth/network-request-failed') {
    return 'Unable to connect. Please try again.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account already exists with this email. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed login attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This user account has been disabled.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled in the Firebase Console. Please enable Email/Password or Google provider.';
  }

  if (message.includes('popup')) {
    return 'Google sign-in was cancelled.';
  }

  return 'Unable to sign in. Please try again.';
}

export const authService = {
  /**
   * Subscribe to global authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Sign in with Email and Password
   */
  async loginWithEmail(email: string, pass: string): Promise<User> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error('Please enter your email address.');
    }
    if (!pass) {
      throw new Error('Please enter your password.');
    }
    const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
    return userCredential.user;
  },

  /**
   * Create account / Register with Email and Password
   */
  async registerWithEmail(email: string, pass: string): Promise<User> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error('Please enter your email address.');
    }
    if (!pass || pass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
    return userCredential.user;
  },

  /**
   * Sign in using Google OAuth Popup
   */
  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  },

  /**
   * Log out currently signed-in user
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Get current auth instance and current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }
};
