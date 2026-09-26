import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { Badge, BadgeVariant } from '../components/ui/Badge.js';

interface AdminPlaceholderPageProps {
  title: string;
  category: 'OPERATE' | 'CONFIGURE' | 'INSIGHT' | 'SYSTEM';
  description: string;
  upcomingPhase: string;
  icon: string;
}

export function AdminPlaceholderPage({
  title,
  category,
  description,
  upcomingPhase,
  icon,
}: AdminPlaceholderPageProps) {
  const getCategoryBadgeVariant = (cat: string): BadgeVariant => {
    switch (cat) {
      case 'OPERATE':
        return 'navy';
      case 'CONFIGURE':
        return 'warning';
      case 'INSIGHT':
        return 'success';
      case 'SYSTEM':
      default:
        return 'neutral';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-white border border-slate-300 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 bg-slate-100 rounded-2xl border border-slate-200" aria-hidden="true">
                {icon}
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getCategoryBadgeVariant(category)} size="sm">
                    {category}
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-500">
                    {upcomingPhase}
                  </span>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
                  {title}
                </CardTitle>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Telemetry Module</span>
            </span>
          </div>
          <CardDescription className="text-xs text-slate-600 mt-2">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Command Architecture Notice
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              This module provides administrative decision-support capabilities for <strong>{title}</strong>.
              Live telemetry is aggregated through background IoT and deterministic analytical engines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Access Level
              </span>
              <p className="text-xs font-semibold text-slate-800">
                ADMIN Authorized Personnel Only
              </p>
              <p className="text-[11px] text-slate-500">
                Restricted from citizen and operator roles.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Data Feeds & Stream
              </span>
              <p className="text-xs font-semibold text-slate-800">
                Real-time Socket.IO & REST Telemetry
              </p>
              <p className="text-[11px] text-slate-500">
                Encrypted government service bus connection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
