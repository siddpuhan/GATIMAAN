import React from 'react';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { UserRole } from '@gatimaan/shared';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <div className="w-8 h-8 rounded-full border-3 border-slate-900 border-t-transparent animate-spin" />
        <div className="text-xs font-semibold text-slate-600">Verifying session security...</div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        {(() => {
          const rawRole = (user?.publicMetadata as { role?: string })?.role;
          const userRole =
            rawRole?.toUpperCase() === UserRole.ADMIN
              ? UserRole.ADMIN
              : rawRole?.toUpperCase() === UserRole.OPERATOR
              ? UserRole.OPERATOR
              : UserRole.CUSTOMER;

          if (allowedRoles && !allowedRoles.includes(userRole)) {
            return (
              <div className="max-w-md mx-auto mt-12">
                <Card>
                  <CardHeader className="text-center pb-2">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                      !
                    </div>
                    <CardTitle className="text-rose-900">Access Restricted</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4 pt-0">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Your authenticated account has role{' '}
                      <strong className="font-mono text-slate-900 font-bold">{userRole}</strong>.
                      This section requires authorized access privileges.
                    </p>
                    <div className="pt-2">
                      <Link
                        to="/"
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                      >
                        ← Return to Citizen Portal
                      </Link>
                    </div>
                  </CardContent>
                </Card>
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
