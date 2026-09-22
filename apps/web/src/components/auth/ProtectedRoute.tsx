import React from 'react';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { UserRole } from '@gatimaan/shared';
import { Link } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-500 font-medium animate-pulse">Loading session...</div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        {(() => {
          const rawRole = (user?.publicMetadata as { role?: string })?.role;
          const userRole =
            rawRole?.toUpperCase() === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;

          if (allowedRoles && !allowedRoles.includes(userRole)) {
            return (
              <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  !
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-1">Access Denied</h3>
                <p className="text-sm text-red-700 mb-4">
                  Your account ({userRole}) does not have permission to access this administrative
                  resource.
                </p>
                <Link
                  to="/"
                  className="inline-block px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition"
                >
                  Return to Home
                </Link>
              </div>
            );
          }

          return <>{children}</>;
        })()}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
