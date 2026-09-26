import React from 'react';

/**
 * GATIMAAN citizen footer (Phase U1).
 *
 * Content is carried over verbatim from the previous inline footer in App.tsx
 * (official service description, helpline, department ownership, policy links).
 * Per the U1 brief: no invented departments, helplines, or legal claims.
 */
export function CitizenFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 xl:px-10 text-xs text-slate-300 mt-auto">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-white mb-1.5">Official Digital Service</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              This is the official digital citizen facilitation queue management service (GATIMAAN),
              operated under MP Online for transparent, real-time citizen service delivery.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-1.5">Citizen Helpline & Support</h4>
            <ul className="text-slate-300 text-[11px] space-y-1">
              <li>Toll Free Citizen Helpline: 1800-233-0194</li>
              <li>Email Support: support.gatimaan@mponline.gov.in</li>
              <li>Operational Hours: Monday – Saturday (9:00 AM – 6:00 PM IST)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-1.5">Department & Content Ownership</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Content owned and maintained by Public Service Management Department, Government of
              Madhya Pradesh.
            </p>
            <p className="text-slate-400 text-[10px] mt-1.5 font-medium">Last Updated: 26 September 2026</p>
          </div>
        </div>

        {/* Standard Government Policy Links Row */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-slate-300 pt-1 font-medium">
          <span className="hover:text-white cursor-pointer transition-colors">Terms of Use</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-white cursor-pointer transition-colors">Hyperlinking Policy</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-white cursor-pointer transition-colors">Accessibility Statement</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-white cursor-pointer transition-colors">Sitemap</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-white cursor-pointer transition-colors">Help & Grievances</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-[11px] pt-2 border-t border-slate-800">
          <p>© {new Date().getFullYear()} Government of Madhya Pradesh. All rights reserved.</p>
          <p className="text-slate-400 font-mono text-[10px] font-semibold">
            GATIMAAN MP Online Queue Management System
          </p>
        </div>
      </div>
    </footer>
  );
}
