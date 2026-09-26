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
    <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 text-xs text-slate-600 mt-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 mb-1.5">Official Digital Service</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              This is the official digital citizen facilitation queue management service (GATIMAAN),
              operated under MP Online for transparent, real-time citizen service delivery.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1.5">Citizen Helpline & Support</h4>
            <ul className="text-slate-500 text-[11px] space-y-1">
              <li>Toll Free Citizen Helpline: 1800-233-0194</li>
              <li>Email Support: support.gatimaan@mponline.gov.in</li>
              <li>Operational Hours: Monday – Saturday (9:00 AM – 6:00 PM IST)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1.5">Department & Content Ownership</h4>
        <p className="text-slate-500 text-[11px] leading-relaxed">
              Content owned and maintained by Public Service Management Department, Government of
              Madhya Pradesh.
            </p>
            <p className="text-slate-400 text-[10px] mt-1.5">Last Updated: 25 September 2026</p>
          </div>
        </div>

        {/* Standard Government Policy Links Row */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-slate-500 pt-1">
          <span className="hover:text-slate-800 cursor-pointer">Terms of Use</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-slate-800 cursor-pointer">Hyperlinking Policy</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-slate-800 cursor-pointer">Accessibility Statement</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-slate-800 cursor-pointer">Sitemap</span>
          <span className="text-slate-300">•</span>
          <span className="hover:text-slate-800 cursor-pointer">Help & Grievances</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px] pt-2 border-t border-slate-100">
          <p>© {new Date().getFullYear()} Government of Madhya Pradesh. All rights reserved.</p>
          <p className="text-slate-400 font-mono text-[10px]">
            GATIMAAN MP Online Queue Management System
          </p>
        </div>
      </div>
    </footer>
  );
}
