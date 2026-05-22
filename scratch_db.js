import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eeazlbumifooexrikrhh.supabase.co';
const supabaseAnonKey = 'sb_publishable_bhzSfuPBJm-J4D9g7hidaA_4AB5Bvi-';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fetching teacher_follows...');
  const { data, error } = await supabase.from('teacher_follows').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}

run();
