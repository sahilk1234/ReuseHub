import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Auth0Callback() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, error: auth0Error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      if (isLoading) return;

      if (auth0Error) {
        console.error('Auth0 Error:', auth0Error);
        navigate('/login', { state: { error: 'Authentication failed. Please try again.' } });
        return;
      }

      if (isAuthenticated && user) {
        try {
          console.log('[Auth0Callback] User authenticated:', user.email);
          console.log('[Auth0Callback] Getting access token...');
          
          const auth0Token = await getAccessTokenSilently();
          console.log('[Auth0Callback] Token received, calling backend...');
          
          // Log full user to see what Facebook provides
          console.log('[Auth0Callback] Full user object:', user);
          
          // Generate email if not provided (Facebook might not give email)
          const email = user.email || `${user.sub?.replace(/[^a-zA-Z0-9]/g, '_')}@auth0.user`;
          
          const requestBody = {
            email: email,
            name: user.name || user.nickname || email.split('@')[0],
            auth0Id: user.sub,
            picture: user.picture
          };
          console.log('[Auth0Callback] Request body:', requestBody);
          
          const response = await fetch(`${API_URL}/auth/auth0-login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth0Token}`
            },
            body: JSON.stringify(requestBody)
          });

          console.log('[Auth0Callback] Backend response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Auth0Callback] Backend error response:', errorText);
            throw new Error(`Backend returned ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          console.log('[Auth0Callback] Backend response:', data);
          
          if (data.data?.accessToken) {
            localStorage.setItem('accessToken', data.data.accessToken);
          }
          if (data.data?.refreshToken) {
            localStorage.setItem('refreshToken', data.data.refreshToken);
          }
          
          window.location.href = '/dashboard';
          
        } catch (error) {
          console.error('Error handling Auth0 callback:', error);
          navigate('/login', { state: { error: 'Failed to complete authentication. Please try again.' } });
        }
      } else if (!isLoading) {
        navigate('/login', { state: { error: 'Authentication was not completed. Please try again.' } });
      }
    };

    handleCallback();
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently, navigate, auth0Error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
