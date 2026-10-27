import { API_URL } from './config';
import type { Character, Faction, Profile } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...rest,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'The frontier is unreachable. Check your connection and try again.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'UNKNOWN_ERROR',
      body?.error?.message ?? 'Something went wrong. Please try again.',
    );
  }
  return body as T;
}

const post = <T>(path: string, body: unknown, token?: string | null) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body), token });

export const api = {
  requestNonce: (walletAddress: string) =>
    post<{ nonce: string; message: string; expiresAt: string; usernameRequired: boolean }>('/auth/nonce', {
      walletAddress,
    }),
  usernameAvailable: (username: string) =>
    request<{ available: boolean; reason?: string }>(`/auth/username-available?username=${encodeURIComponent(username)}`),
  verify: (payload: {
    walletAddress: string;
    nonce: string;
    signature: string;
    ageConfirmed: boolean;
    username?: string;
  }) => post<{ token: string; profile: Profile }>('/auth/verify', payload),
  me: (token: string) => request<{ profile: Profile }>('/me', { token }),
  completeOnboarding: (token: string) => post<{ profile: Profile }>('/me/onboarding/complete', {}, token),
  chooseFaction: (token: string, faction: string) =>
    post<{ profile: Profile }>('/me/faction', { faction, acknowledgePermanent: true }, token),
  chooseCharacter: (token: string, character: string) =>
    post<{ profile: Profile }>('/me/character', { character }, token),
  factions: () => request<{ factions: Faction[] }>('/factions'),
  factionCharacters: (slug: string) =>
    request<{ faction: Faction; characters: Character[] }>(`/factions/${encodeURIComponent(slug)}/characters`),
};
