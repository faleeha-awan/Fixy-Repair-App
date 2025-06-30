import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  const { data, error } = await supabase
    .from('Repair_Guides') // ✅ renamed table
    .select('*')
    .limit(10)
    .throwOnError();

  if (error) {
    console.error('❌ Error fetching data:', error.message);
  } else {
    console.log('✅ Data fetched from Supabase:');
    console.log(data);
  }
}

testConnection().catch((err) => {
  console.error("❌ Unexpected error:", err);
});
