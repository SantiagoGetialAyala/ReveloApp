const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

// Vercel serves the web and API services on one origin and rewrites /api/* to Nest.
// Keep localhost as the default for the existing local development setup.
export const API_URL =
  configuredApiUrl === '__SAME_ORIGIN__'
    ? ''
    : (configuredApiUrl ?? 'http://localhost:4000');
