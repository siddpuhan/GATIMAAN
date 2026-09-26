import React from 'react';
import { Navigate } from 'react-router-dom';
import { getActiveTicketId } from '../lib/ticketStorage.js';

/**
 * @deprecated Citizen Dashboard has been removed in favor of direct live token tracking.
 * Traffic is consolidated to the live queue pass (/ticket/:id) if active, or /services.
 */
export function CitizenDashboardPage() {
  const activeId = getActiveTicketId();
  if (activeId) {
    return <Navigate to={`/ticket/${activeId}`} replace />;
  }
  return <Navigate to="/services" replace />;
}

export default CitizenDashboardPage;
