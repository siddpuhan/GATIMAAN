import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';

interface AdminPlaceholderPageProps {
  title: string;
  category: string;
  description: string;
  upcomingPhase: string;
  icon?: string;
}

export function AdminPlaceholderPage({
  title,
  category,
  description,
  upcomingPhase,
  icon = '📊',
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/admin" className="hover:text-slate-800 transition">
          Admin Portal
        </Link>
        <span>/</span>
        <span className="text-slate-400">{category}</span>
        <span>/</span>
        <span className="font-semibold text-slate-900">{title}</span>
      </div>

      <Card className="p-4 sm:p-6">
        <CardHeader className="text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl">
                {icon}
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {category} · {upcomingPhase}
                </CardDescription>
              </div>
            </div>
            <Badge variant="navy" size="md">
              ROADMAP MODULE
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-6 text-xs text-slate-600">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">Module Purpose & Scope</h4>
            <p className="leading-relaxed">{description}</p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-1">
            <h5 className="font-bold">Phase 1 Navigation Integration</h5>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This module route is registered and safely integrated within the GATIMAAN Admin Sidebar
              navigation. Full analytical charts, predictive models, and notification engines will be
              implemented in subsequent project phases.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <span>← Back to Overview</span>
              </Button>
            </Link>
            <Link to="/admin/queue">
              <Button variant="primary" size="sm">
                <span>Open Queue Desk →</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
