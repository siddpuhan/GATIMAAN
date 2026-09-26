import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || searchParams.get('redirect') || undefined;

  return (
    <div className="flex justify-center items-center py-12">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={`/sign-in${redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl || '/'}
      />
    </div>
  );
}
