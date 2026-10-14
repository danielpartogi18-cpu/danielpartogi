import { createAuthClient } from 'better-auth/react';

// Auth is proxied through this site's /api/auth route so session cookies remain first-party.
export const authClient = createAuthClient({ baseURL: window.location.origin });
