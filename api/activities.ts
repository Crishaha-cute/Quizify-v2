import { getActivities, getActivityStats } from '../services/activityService.ts';

type VercelRequest = {
  method?: string;
  query?: Record<string, string | string[]>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Allow', ['GET']);
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    // Get the range parameter from query string, default to 7days
    const range = (req.query?.range as string) || '7days';
    
    // Validate range
    if (!['3days', '7days', '30days'].includes(range)) {
      res.status(400).json({ error: 'Invalid range. Use 3days, 7days, or 30days.' });
      return;
    }

    const activities = await getActivities(range as '3days' | '7days' | '30days');
    const stats = await getActivityStats(range as '3days' | '7days' | '30days');

    res.status(200).json({
      success: true,
      range,
      activities,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in activities API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
