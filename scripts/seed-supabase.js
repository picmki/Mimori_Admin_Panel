import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function seed() {
  console.log('🚀 Starting Supabase Data Migration for Mimori Digital...\n');

  // 1. Seed Services
  try {
    const services = await readJson('services.json');
    console.log(`📦 Seeding ${services.length} services...`);
    const serviceRows = services.map((s, idx) => ({
      id: s.id,
      title: s.title,
      tagline: s.tagline,
      badge: s.badge,
      category: s.category,
      suitable_for: s.suitableFor,
      description: s.description,
      features: s.features,
      starting_price: s.startingPrice,
      icon: s.icon,
      sort_order: idx + 1
    }));

    const { error: srvErr } = await supabase.from('services').upsert(serviceRows, { onConflict: 'id' });
    if (srvErr) throw srvErr;
    console.log('✅ Services seeded successfully!');
  } catch (err) {
    console.error('❌ Failed seeding services:', err.message);
  }

  // 2. Seed Portfolio
  try {
    const portfolio = await readJson('portfolio.json');
    console.log(`\n📸 Seeding ${portfolio.length} portfolio items...`);
    const portfolioRows = portfolio.map((p, idx) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      event_name: p.eventName,
      venue: p.venue,
      date_str: p.date,
      stats: p.stats,
      image: p.image,
      tags: p.tags,
      sort_order: idx + 1
    }));

    const { error: portErr } = await supabase.from('portfolio').upsert(portfolioRows, { onConflict: 'id' });
    if (portErr) throw portErr;
    console.log('✅ Portfolio items seeded successfully!');
  } catch (err) {
    console.error('❌ Failed seeding portfolio:', err.message);
  }

  console.log('\n🎉 Supabase seeding completed! Your database is now live with Mimori Digital catalog.');
}

seed();
