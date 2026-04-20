import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing a token. Open the link from your email, or request a new message from support.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await axios.post(`${API_URL}/auth/verify-email`, { token });
        if (cancelled) return;
        setStatus('ok');
        setMessage(res.data?.message || 'Your email has been verified.');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5] px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm text-center">
        {status === 'loading' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Verifying your email…</h1>
            <p className="mt-2 text-sm text-gray-600">Please wait a moment.</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Email verified</h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-md bg-[#C4993E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#AE872E]"
            >
              Sign in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Could not verify</h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-[#C4993E] hover:underline">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
