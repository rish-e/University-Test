import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Database helper functions ---

export async function registerStudent(fullName: string, email: string) {
  // Check if student already exists
  const { data: existing } = await supabase
    .from('students')
    .select('id, candidate_id')
    .eq('email', email)
    .single();

  if (existing) {
    return { student: existing, isReturning: true };
  }

  // Generate candidate ID
  const candidateId = `#${Math.floor(10000 + Math.random() * 90000)}`;

  const { data, error } = await supabase
    .from('students')
    .insert({ full_name: fullName, email, candidate_id: candidateId })
    .select('id, candidate_id')
    .single();

  if (error) throw error;
  return { student: data, isReturning: false };
}

export async function createTestSession(studentId: string) {
  const { data, error } = await supabase
    .from('test_sessions')
    .insert({ student_id: studentId })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function getExistingSession(studentId: string) {
  const { data } = await supabase
    .from('test_sessions')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

export async function submitSectionResult(params: {
  sessionId: string;
  sectionId: string;
  sectionTitle: string;
  score: number;
  timeSpent: number;
  resultType: 'hard_skill' | 'soft_skill';
  rawScore?: number;
  profile?: any;
  metrics?: any;
  rawData?: any;
}) {
  const { error } = await supabase
    .from('section_results')
    .insert({
      session_id: params.sessionId,
      section_id: params.sectionId,
      section_title: params.sectionTitle,
      score: params.score,
      time_spent: params.timeSpent,
      result_type: params.resultType,
      raw_score: params.rawScore,
      profile: params.profile,
      metrics: params.metrics,
      raw_data: params.rawData,
    });

  if (error) throw error;
}

export async function updateSessionStatus(
  sessionId: string,
  status: 'completed' | 'abandoned',
  xp?: number,
  level?: number,
  levelTitle?: string
) {
  const update: any = {
    status,
    completed_at: new Date().toISOString(),
  };
  if (xp !== undefined) update.overall_xp = xp;
  if (level !== undefined) update.level = level;
  if (levelTitle) update.level_title = levelTitle;

  const { error } = await supabase
    .from('test_sessions')
    .update(update)
    .eq('id', sessionId);

  if (error) throw error;
}
