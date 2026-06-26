const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dqhbbib7e',
  api_key: '195165416491488',
  api_secret: 'oq0FDfEpmjgS1omBYgYD-zlg8eA',
});

async function test() {
  const baseName = 'Alfa-Romeo-145_1999_Hecbeks_151211113110_12_m_c2f1a96d6a';
  
  console.log('--- Search by filename ---');
  try {
    const r = await cloudinary.search
      .expression(`filename:"${baseName}"`)
      .max_results(5)
      .execute();
    console.log('Results:', r.total_count, r.resources?.map(r => r.public_id));
  } catch(e) { console.error('Error:', e); }
}

test();
