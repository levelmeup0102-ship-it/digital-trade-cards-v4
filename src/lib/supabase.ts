import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── 타입 정의 ──────────────────────────────────────────
export type Session = {
  id: string;
  team_id: string;
  player_name: string;
  role: 'leader' | 'member';
  level: string;
  item: string;
  session_token: string;
};

export type Team = {
  id: string;
  name: string;
  join_code: string;
  product_name: string | null;
};
