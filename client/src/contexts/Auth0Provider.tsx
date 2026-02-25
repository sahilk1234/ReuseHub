import { Auth0Provider as Auth0ProviderSDK } from '@auth0/auth0-react';
import type { ReactNode } from 'react';

interface Auth0ProviderProps {
  children: ReactNode;
}

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || 'your-tenant.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || 'your-client-id';
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE;
const REDIRECT_URI = window.location.origin + '/callback';

export function Auth0Provider({ children }: Auth0ProviderProps) {
  console.log('🎨 [Auth0Provider] Config:', {
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID?.substring(0, 10) + '...',
    redirectUri: REDIRECT_URI
  });
  
  const authorizationParams: Record<string, string> = {
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email'
  };

  if (AUTH0_AUDIENCE) {
    authorizationParams.audience = AUTH0_AUDIENCE;
  }

  return (
    <Auth0ProviderSDK
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={authorizationParams}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onRedirectCallback={(appState) => {
        console.log('🔄 [Auth0Provider] Redirect callback', appState);
      }}
    >
      {children}
    </Auth0ProviderSDK>
  );
}
