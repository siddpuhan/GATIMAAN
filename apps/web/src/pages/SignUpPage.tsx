import React from 'react';
import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <div className="flex justify-center items-center py-12">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
