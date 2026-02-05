import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Auth0LoginButtons from '../components/auth/Auth0LoginButtons';

export default function Login() {
  const { loginWithRedirect } = useAuth0();
  const [email, setEmail] = useState('');
  const location = useLocation();
  
  const message = location.state?.message;

  const handleEmailLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        connection: 'Username-Password-Authentication',
        login_hint: email || undefined,
        screen_hint: 'login'
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Login</h1>
        
        {message && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        <div className="card">
          {/* Auth0 Social Login Buttons */}
          <Auth0LoginButtons mode="login" />

          <div className="mt-6 space-y-3">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="you@example.com"
            />
            <button
              type="button"
              onClick={handleEmailLogin}
              className="w-full btn-primary"
            >
              Continue with Email
            </button>
            <p className="text-xs text-gray-500 text-center">
              You will be redirected to Auth0 to enter your password.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
