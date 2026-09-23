import React from 'react';

export function ServiceCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs animate-pulse space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="w-10 h-6 bg-gray-100 rounded-md" />
      </div>

      <div className="space-y-1.5 py-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-9 bg-gray-200 rounded-lg w-28" />
      </div>
    </div>
  );
}

export function ServiceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
      <ServiceCardSkeleton />
    </div>
  );
}

export function TicketCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm max-w-lg mx-auto animate-pulse space-y-6">
      <div className="text-center space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
        <div className="h-16 bg-gray-200 rounded-xl w-48 mx-auto" />
        <div className="h-6 bg-gray-100 rounded-full w-24 mx-auto" />
      </div>

      <div className="grid grid-cols-2 gap-3 py-4 border-y border-gray-100">
        <div className="h-12 bg-gray-100 rounded-lg" />
        <div className="h-12 bg-gray-100 rounded-lg" />
      </div>

      <div className="h-10 bg-gray-200 rounded-xl w-full" />
    </div>
  );
}
