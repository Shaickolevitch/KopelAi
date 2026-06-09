import { supabase } from './supabase';

export type AuthUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    isAnonymous: user.is_anonymous ?? false,
  };
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase().auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Signup failed: no user returned');
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: false,
  };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed: no user returned');
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: false,
  };
}

export async function sendPasswordResetEmail(email: string) {
  const redirectTo = `${window.location.origin}/auth/reset-password-confirm`;
  const { error } = await supabase().auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase().auth.signOut();
  if (error) throw error;
}

/**
 * Map a Supabase auth error to an i18n key for user-facing messages.
 */
export function authErrorToMessageKey(err: unknown): string {
  if (!err || typeof err !== 'object') return 'auth_error_generic';
  const message = (err as Error).message?.toLowerCase() ?? '';

  if (message.includes('already')) {
    return 'auth_error_email_in_use';
  }
  if (message.includes('rate limit') || message.includes('too many') || message.includes('exceeded')) {
    return 'auth_error_rate_limit';
  }
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'auth_error_wrong_credentials';
  }
  if (message.includes('signup') || message.includes('not allowed') || message.includes('disabled')) {
    return 'auth_error_signups_disabled';
  }
  if (message.includes('invalid') && message.includes('email')) {
    return 'auth_error_invalid_email';
  }
  if (message.includes('password')) {
    return 'auth_error_short_password';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'auth_error_network';
  }
  return 'auth_error_generic';
}