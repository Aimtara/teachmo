export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// LTI configuration URLs
export const LTI_BASE_URL = import.meta.env.VITE_LTI_BASE_URL || 'https://api.teachmo.com';
export const LTI_LAUNCH_URL = `${LTI_BASE_URL}/lti/launch`;
export const LTI_JWKS_URL = `${LTI_BASE_URL}/.well-known/jwks.json`;

export const getApiBaseUrl = () => API_BASE_URL;
