import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div className="flex justify-center items-center py-12">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
