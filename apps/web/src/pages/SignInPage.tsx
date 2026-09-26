import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || searchParams.get('redirect') || undefined;

  return (
    <div className="flex justify-center items-center py-12">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={`/sign-up${redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl || '/'}
      />
    </div>
  );
}
