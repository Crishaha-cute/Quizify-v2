import { createClient } from '@supabase/supabase-js';
import type { QuizHistory } from '../types.ts';

type VercelRequest = {
  method?: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

const getEnv = (name: string): string | undefined => {
  return process.env[name] || process.env[`VITE_${name}`];
};

const getSupabaseAdmin = () => {
  const url = getEnv('SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return null;
  }
  return createClient<any>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const getBearerToken = (req: VercelRequest): string | null => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  return value.slice(7).trim();
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Allow', ['GET']);
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Server misconfiguration: Supabase admin key is missing.' });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token.' });
    return;
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  const rawHistoryId = req.query?.historyId;
  const historyId = Array.isArray(rawHistoryId) ? rawHistoryId[0] : rawHistoryId;
  if (!historyId) {
    res.status(400).json({ error: 'Missing historyId.' });
    return;
  }

  const { data: historyRow, error: historyError } = await supabaseAdmin
    .from('quiz_history')
    .select('id,user_id')
    .eq('id', historyId)
    .maybeSingle();

  if (historyError) {
    res.status(500).json({ error: historyError.message || 'Failed to validate history.' });
    return;
  }

  if (!historyRow || historyRow.user_id !== userData.user.id) {
    res.status(403).json({ error: 'Access denied for this history entry.' });
    return;
  }

  const { data: attempts, error: attemptsError } = await supabaseAdmin
    .from('quiz_attempts')
    .select('question_number,question_text,selected_answer,correct_answer,is_correct')
    .eq('quiz_history_id', historyId)
    .order('question_number', { ascending: true });

  if (attemptsError) {
    res.status(500).json({ error: attemptsError.message || 'Failed to load attempts.' });
    return;
  }

  const mapped: QuizHistory['answers'] = (attempts ?? []).map((row: any) => ({
    question: row.question_text,
    selectedAnswer: row.selected_answer,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct,
  }));

  res.status(200).json({
    success: true,
    attempts: mapped,
  });
}
