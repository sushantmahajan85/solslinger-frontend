export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

// Exposes an in-browser test wallet so the full flow can be exercised without a wallet extension.
// Never enable this in production.
export const ENABLE_DEV_WALLET = process.env.NEXT_PUBLIC_ENABLE_DEV_WALLET === 'true';

export const MINIMUM_AGE = 18;
