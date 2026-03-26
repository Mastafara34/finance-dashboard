// check_schema.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching users:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in users table:', Object.keys(data[0]));
  } else {
    // If table is empty, we can't get column names via select * without rows
    // but maybe another way? Not without DB-level access
    console.log('Table is empty');
  }
}

check();
