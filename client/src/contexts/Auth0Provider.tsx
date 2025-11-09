import { Auth0Provider as Auth0ProviderSDK } from '@auth0/auth0-react';
import { ReactNode } from 'react';

interface Auth0ProviderProps {
  children: ReactNode;
}

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || 'your-tenant.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || 'your-client-id';
const REDIRECT_URI = window.location.origin + '/callback';

export function Auth0Provider({ children }: Auth0ProviderProps) {
  console.log('🎨 [Auth0Provider] Config:', {
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID?.substring(0, 10) + '...',
    redirectUri: REDIRECT_URI
  });
  
  return (
    <Auth0ProviderSDK
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: REDIRECT_URI,
        scope: 'openid profile email'
      }}
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
