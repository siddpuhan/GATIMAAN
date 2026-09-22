export const GATIMAAN_VERSION = '0.1.0';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
}
