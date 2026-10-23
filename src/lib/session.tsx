'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from './api';
import type { NextStep, Profile } from './types';

const TOKEN_KEY = 'solslinger.session';
const AGE_KEY = 'solslinger.age-confirmed';

export type SessionStatus = 'restoring' | 'signed-out' | 'signing-in' | 'signed-in';

interface SessionValue {
  status: SessionStatus;
  profile: Profile | null;
  token: string | null;
  error: string | null;
  ageConfirmed: boolean;
  confirmAge: () => void;
  /** Call after the user picks a wallet; signing starts as soon as it connects. */
  requestSignIn: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  clearError: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export const routeFor = (step: NextStep) => `/${step}` as const;

function readStorage(storage: 'local' | 'session', key: string) {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: 'local' | 'session', key: string, value: string | null) {
  try {
    const target = storage === 'local' ? localStorage : sessionStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the session simply won't persist.
  }
}

const friendlyWalletError = (err: unknown) => {
  const name = (err as { name?: string })?.name ?? '';
  const message = (err as { message?: string })?.message ?? '';
  if (/reject|denied|cancel/i.test(`${name} ${message}`)) return 'Signature request was declined in your wallet.';
  if (err instanceof ApiError) return err.message;
  return 'We could not verify your wallet. Please try again.';
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [status, setStatus] = useState<SessionStatus>('restoring');
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  // Mirrors ageConfirmed so a sign-in started in the same tick as confirmation sees it.
  const ageRef = useRef(false);
  const pendingSignIn = useRef(false);

  // Restore a persisted session once on mount.
  useEffect(() => {
    ageRef.current = readStorage('session', AGE_KEY) === 'true';
     
    setAgeConfirmed(ageRef.current);
    const stored = readStorage('local', TOKEN_KEY);
    if (!stored) {
      setStatus('signed-out');
      return;
    }
    let cancelled = false;
    api
      .me(stored)
      .then(({ profile: restored }) => {
        if (cancelled) return;
        setToken(stored);
        setProfileState(restored);
        setStatus('signed-in');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) writeStorage('local', TOKEN_KEY, null);
        if (err instanceof ApiError && err.code === 'NETWORK_ERROR') setError(err.message);
        setStatus('signed-out');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmAge = useCallback(() => {
    writeStorage('session', AGE_KEY, 'true');
    ageRef.current = true;
    setAgeConfirmed(true);
  }, []);

  const clearSession = useCallback(() => {
    writeStorage('local', TOKEN_KEY, null);
    setToken(null);
    setProfileState(null);
    setStatus('signed-out');
  }, []);

  const signOut = useCallback(async () => {
    pendingSignIn.current = false;
    clearSession();
    await wallet.disconnect().catch(() => undefined);
  }, [clearSession, wallet]);

  const signIn = useCallback(async () => {
    const { publicKey, signMessage } = wallet;
    if (!publicKey) return;
    if (!signMessage) {
      setError('This wallet cannot sign messages. Choose a different wallet.');
      return;
    }
    setError(null);
    setStatus('signing-in');
    try {
      const walletAddress = publicKey.toBase58();
      const challenge = await api.requestNonce(walletAddress);
      const signature = await signMessage(new TextEncoder().encode(challenge.message));
      const result = await api.verify({
        walletAddress,
        nonce: challenge.nonce,
        signature: bs58.encode(signature),
        ageConfirmed: ageRef.current,
      });
      writeStorage('local', TOKEN_KEY, result.token);
      setToken(result.token);
      setProfileState(result.profile);
      setStatus('signed-in');
    } catch (err) {
      setError(friendlyWalletError(err));
      setStatus('signed-out');
    }
  }, [wallet]);

  const requestSignIn = useCallback(() => {
    pendingSignIn.current = true;
  }, []);

  // Start signing as soon as a user-selected wallet finishes connecting.
  useEffect(() => {
    if (wallet.connected && pendingSignIn.current && status === 'signed-out') {
      pendingSignIn.current = false;
       
      void signIn();
    }
  }, [wallet.connected, status, signIn]);

  // If the wallet that owns this session disconnects or switches account, end the session.
  const previousKey = useRef<string | null>(null);
  const currentKey = wallet.publicKey?.toBase58() ?? null;
  useEffect(() => {
    const previous = previousKey.current;
    previousKey.current = currentKey;
    if (status !== 'signed-in' || !profile) return;
    if (previous === profile.walletAddress && currentKey !== profile.walletAddress) {
       
      clearSession();
    }
  }, [currentKey, status, profile, clearSession]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      profile,
      token,
      error,
      ageConfirmed: ageConfirmed || Boolean(profile?.ageConfirmedAt),
      confirmAge,
      requestSignIn,
      signIn,
      signOut,
      setProfile: setProfileState,
      clearError: () => setError(null),
    }),
    [status, profile, token, error, ageConfirmed, confirmAge, requestSignIn, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
}

/**
 * Keeps each screen reachable only at the right point of the journey.
 * Returns true once the visitor belongs on this screen.
 */
export function useJourneyGuard(step: NextStep) {
  const { status, profile } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signed-out') router.replace('/');
    else if (status === 'signed-in' && profile && profile.nextStep !== step) router.replace(routeFor(profile.nextStep));
  }, [status, profile, step, router]);

  return status === 'signed-in' && profile?.nextStep === step;
}
