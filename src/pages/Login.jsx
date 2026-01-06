import { useState } from 'react';
import { nhost } from '@/lib/nhostClient';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await nhost.auth.signIn({
        email,
        password,
      });
    } catch (err) {
      console.error('Email login failed', err);
      setError(err?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Sign in to Teachmo</h1>
          <p className="text-sm text-gray-600">Use your school account to continue</p>
        </div>
        {error && (
          <p role="alert" className="text-red-600 text-sm text-center">
            {error}
          </p>
        )}
        <SocialLoginButtons onError={(err) => setError(err?.message || 'Login failed')} />
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50 px-2 text-gray-500">or</span>
          </div>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleEmailLogin}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center rounded-md bg-emerald-600 py-2 px-4 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
