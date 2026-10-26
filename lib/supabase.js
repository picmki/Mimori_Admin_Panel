import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('✅ [Supabase] Client initialized successfully for', supabaseUrl);
  } catch (err) {
    console.error('❌ [Supabase] Failed to initialize client:', err.message);
  }
} else {
  console.log('ℹ️  [Supabase] Credentials not set in .env. Running in local JSON fallback mode.');
}

export function isSupabaseConfigured() {
  return !!supabase;
}

export function getSupabaseClient() {
  return supabase;
}

// ------------------------------------------------------------------------------
// IN-MEMORY CACHE & TIMEOUT WRAPPER
// Keeps reads blazing fast (< 5ms) on reload, invalidates immediately on mutation
// ------------------------------------------------------------------------------
const memoryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60s TTL

function getFromCache(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setToCache(key, data) {
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function invalidateCache(prefix = null) {
  if (!prefix) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }
}

// Timeout helper: ensures Supabase network queries never hang the server or client
function withTimeout(promise, ms = 2500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase query timed out after ${ms}ms`)), ms)
    )
  ]);
}

// Helper: Local JSON Fallback Reader
async function readLocalJson(filename, fallback = []) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`[Local Storage] Error reading ${filename}:`, err.message);
    return fallback;
  }
}

// Helper: Local JSON Fallback Writer
async function writeLocalJson(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[Local Storage] Error writing ${filename}:`, err.message);
    return false;
  }
}

// ------------------------------------------------------------------------------
// 1. SERVICES
// ------------------------------------------------------------------------------
export async function getServices() {
  const cached = getFromCache('services');
  if (cached) return cached;

  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('services')
          .select('*')
          .order('sort_order', { ascending: true }),
        2500
      );

      if (!error && data && data.length > 0) {
        const localServices = await readLocalJson('services.json').catch(() => []);
        const mergedMap = new Map();
        // Insert local first
        (localServices || []).forEach(item => mergedMap.set(item.id, item));
        // Merge or overwrite with Supabase
        data.forEach(item => {
          const mapped = {
            id: item.id,
            title: item.title,
            tagline: item.tagline,
            badge: item.badge,
            category: item.category,
            suitableFor: item.suitable_for || item.suitableFor || [],
            description: item.description,
            features: item.features || [],
            startingPrice: item.starting_price || item.startingPrice,
            icon: item.icon
          };
          mergedMap.set(item.id, mapped);
        });
        const result = Array.from(mergedMap.values());
        setToCache('services', result);
        return result;
      }
      if (error) {
        console.warn('⚠️  [Supabase] Services query error, using local fallback:', error.message);
      }
    } catch (err) {
      console.warn('⚠️  [Supabase] Exception querying services:', err.message);
    }
  }
  const fallback = await readLocalJson('services.json');
  setToCache('services', fallback);
  return fallback;
}

export async function updateServicesList(servicesList) {
  if (!Array.isArray(servicesList)) {
    throw new Error('Services list must be an array');
  }

  // 1. Write to local services.json
  await writeLocalJson('services.json', servicesList);

  // Invalidate cache immediately so updates are reflected
  invalidateCache('services');
  invalidateCache('service_details');

  // 2. Sync to Supabase services table if connected
  let savedToSupabase = false;
  if (supabase) {
    try {
      const rows = servicesList.map((item, idx) => ({
        id: item.id,
        title: item.title,
        tagline: item.tagline || '',
        badge: item.badge || '',
        category: item.category || 'photobooth',
        suitable_for: item.suitableFor || [],
        description: item.description || '',
        features: item.features || [],
        starting_price: item.startingPrice || '',
        icon: item.icon || 'camera',
        sort_order: idx + 1,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('services').upsert(rows, { onConflict: 'id' });
      if (!error) savedToSupabase = true;
    } catch (err) {
      console.warn('Supabase updateServicesList error:', err.message);
    }
  }

  return { success: true, count: servicesList.length, savedToSupabase };
}

// ------------------------------------------------------------------------------
// 1b. CATEGORIES (DYNAMIC HEADER MEGAMENU & ADMIN ORGANIZER)
// ------------------------------------------------------------------------------
export async function getCategories() {
  const cached = getFromCache('categories');
  if (cached) return cached;

  const localCategories = await readLocalJson('categories.json', []);
  const map = new Map();
  (localCategories || []).forEach(c => map.set(c.id, c));

  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true }),
        2500
      );

      if (!error && data && data.length > 0) {
        data.forEach(item => {
          map.set(item.id, {
            id: item.id,
            name: item.name || item.title,
            description: item.description || '',
            image: item.image || item.cover_image || '/images/megamenu_photobooth_featured.jpg',
            sortOrder: item.sort_order || item.sortOrder || 99
          });
        });
      }
    } catch (err) {
      console.warn('⚠️  [Supabase] Exception querying categories:', err.message);
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
  setToCache('categories', result);
  return result;
}

export async function createCategory(catData) {
  if (!catData || !catData.name) {
    throw new Error('Category name is required');
  }

  const id = (catData.id || catData.name).toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
  const categories = await getCategories();
  const existingIdx = categories.findIndex(c => c.id === id);

  const newCat = {
    id: id,
    name: catData.name.trim(),
    description: catData.description ? catData.description.trim() : '',
    image: catData.image ? catData.image.trim() : '/images/megamenu_photobooth_featured.jpg',
    sortOrder: catData.sortOrder !== undefined ? parseInt(catData.sortOrder, 10) : categories.length + 1
  };

  if (existingIdx >= 0) {
    categories[existingIdx] = newCat;
  } else {
    categories.push(newCat);
  }

  await writeLocalJson('categories.json', categories);
  invalidateCache('categories');

  let savedToSupabase = false;
  if (supabase) {
    try {
      const row = {
        id: newCat.id,
        name: newCat.name,
        description: newCat.description,
        image: newCat.image,
        sort_order: newCat.sortOrder,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('categories').upsert([row], { onConflict: 'id' });
      if (!error) savedToSupabase = true;
    } catch (err) {
      console.warn('⚠️  [Supabase] Category upsert error:', err.message);
    }
  }

  return { success: true, category: newCat, savedToSupabase };
}

export async function updateCategoriesList(categoriesList) {
  if (!Array.isArray(categoriesList)) {
    throw new Error('Categories list must be an array');
  }

  await writeLocalJson('categories.json', categoriesList);
  invalidateCache('categories');

  let savedToSupabase = false;
  if (supabase) {
    try {
      const rows = categoriesList.map((item, idx) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        image: item.image || '/images/megamenu_photobooth_featured.jpg',
        sort_order: idx + 1,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'id' });
      if (!error) savedToSupabase = true;
    } catch (err) {
      console.warn('⚠️  [Supabase] updateCategoriesList error:', err.message);
    }
  }

  return { success: true, count: categoriesList.length, savedToSupabase };
}

export async function deleteCategory(id) {
  let categories = await readLocalJson('categories.json', []);
  categories = categories.filter(c => c.id !== id);
  await writeLocalJson('categories.json', categories);
  invalidateCache('categories');

  let deletedFromSupabase = false;
  if (supabase) {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) deletedFromSupabase = true;
    } catch (err) {
      console.warn('⚠️  [Supabase] Category delete error:', err.message);
    }
  }

  return { success: true, id, deletedFromSupabase };
}

// ------------------------------------------------------------------------------
// 2. PORTFOLIO
// ------------------------------------------------------------------------------
export async function getPortfolio(category = null) {
  const cacheKey = `portfolio_${category || 'all'}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  if (supabase) {
    try {
      let query = supabase.from('portfolio').select('*').order('sort_order', { ascending: true });
      if (category && category !== 'all') {
        query = query.ilike('category', category);
      }
      const { data, error } = await withTimeout(query, 2500);
      if (!error && data && data.length > 0) {
        const result = data.map(item => ({
          id: item.id,
          title: item.title,
          category: item.category,
          eventName: item.event_name || item.eventName,
          venue: item.venue,
          date: item.date_str || item.date,
          stats: item.stats,
          image: item.image,
          tags: item.tags || []
        }));
        setToCache(cacheKey, result);
        return result;
      }
      if (error) {
        console.warn('⚠️  [Supabase] Portfolio query error, using local fallback:', error.message);
      }
    } catch (err) {
      console.warn('⚠️  [Supabase] Exception querying portfolio:', err.message);
    }
  }

  const localItems = await readLocalJson('portfolio.json');
  let filtered = localItems;
  if (category && category !== 'all') {
    filtered = localItems.filter(item => item.category.toLowerCase() === category.toLowerCase());
  }
  setToCache(cacheKey, filtered);
  return filtered;
}

// ------------------------------------------------------------------------------
// 3. ENQUIRIES (Event Bookings & Proposals)
// ------------------------------------------------------------------------------
export async function createEnquiry(enquiry) {
  let savedToSupabase = false;

  if (supabase) {
    try {
      const dbRow = {
        reference_id: enquiry.referenceId,
        full_name: enquiry.fullName,
        email: enquiry.email,
        phone: enquiry.phone,
        event_type: enquiry.eventType,
        event_date: enquiry.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : null,
        event_location: enquiry.eventLocation,
        expected_guests: enquiry.expectedGuests,
        services: enquiry.services,
        budget_range: enquiry.budgetRange,
        message: enquiry.message,
        status: enquiry.status || 'Under Review',
        estimated_response: enquiry.estimatedResponse || 'Within 12-24 hours',
        raw_payload: enquiry
      };

      const { data, error } = await supabase.from('enquiries').insert([dbRow]).select();
      if (!error) {
        savedToSupabase = true;
        console.log(`✅ [Supabase] Enquiry saved: ${enquiry.referenceId}`);
      } else {
        console.error('❌ [Supabase] Enquiry insert error:', error.message);
      }
    } catch (err) {
      console.error('❌ [Supabase] Exception inserting enquiry:', err.message);
    }
  }

  // Always keep local JSON in sync as a dual backup
  try {
    const enquiries = await readLocalJson('enquiries.json');
    enquiries.unshift(enquiry);
    await writeLocalJson('enquiries.json', enquiries);
  } catch (err) {
    console.error('Dual backup write failed:', err.message);
  }

  invalidateCache('enquiries');

  return { success: true, savedToSupabase, referenceId: enquiry.referenceId };
}

export async function getEnquiryByReference(refCode) {
  const code = refCode.trim().toUpperCase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('reference_id', code)
        .maybeSingle();

      if (!error && data) {
        return {
          referenceId: data.reference_id,
          createdAt: data.created_at,
          eventType: data.event_type,
          eventDate: data.event_date,
          eventLocation: data.event_location,
          services: data.services,
          status: data.status,
          estimatedResponse: data.estimated_response
        };
      }
    } catch (err) {
      console.warn('⚠️  [Supabase] Exception checking reference:', err.message);
    }
  }

  // Fallback to local
  const enquiries = await readLocalJson('enquiries.json');
  return enquiries.find(e => e.referenceId.toUpperCase() === code) || null;
}

// ------------------------------------------------------------------------------
// 4. CONTACTS
// ------------------------------------------------------------------------------
export async function createContact(contact) {
  if (supabase) {
    try {
      const { error } = await supabase.from('contacts').insert([{
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        subject: contact.subject || null,
        message: contact.message
      }]);
      if (!error) {
        console.log(`✅ [Supabase] Contact message saved from: ${contact.email}`);
        return { success: true, savedToSupabase: true };
      }
      console.error('❌ [Supabase] Contact insert error:', error.message);
    } catch (err) {
      console.error('❌ [Supabase] Exception inserting contact:', err.message);
    }
  }
  return { success: true, savedToSupabase: false };
}

// ------------------------------------------------------------------------------
// 5. SUBSCRIBERS
// ------------------------------------------------------------------------------
export async function createSubscriber(email) {
  let savedToSupabase = false;

  if (supabase) {
    try {
      const { error } = await supabase.from('subscribers').insert([{ email }]);
      if (!error) {
        savedToSupabase = true;
        console.log(`✅ [Supabase] Subscriber added: ${email}`);
      } else if (error.code === '23505') {
        // Unique violation: already subscribed
        return { success: true, alreadySubscribed: true };
      } else {
        console.error('❌ [Supabase] Subscriber insert error:', error.message);
      }
    } catch (err) {
      console.error('❌ [Supabase] Exception subscribing:', err.message);
    }
  }

  // Local JSON sync
  const subscribers = await readLocalJson('subscribers.json');
  if (subscribers.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    return { success: true, alreadySubscribed: true };
  }
  subscribers.push({ email, subscribedAt: new Date().toISOString() });
  await writeLocalJson('subscribers.json', subscribers);

  return { success: true, savedToSupabase, alreadySubscribed: false };
}

// ------------------------------------------------------------------------------
// 6. DETAILED SERVICE / BOOTH CATALOG (ADMIN & WEBSITE DYNAMIC SYNC)
// ------------------------------------------------------------------------------
export async function getAllServiceDetails() {
  const cached = getFromCache('service_details');
  if (cached) return cached;

  let catalog = {};

  // 1. Read from local service-details.json first as baseline
  try {
    const filePath = path.join(DATA_DIR, 'service-details.json');
    const content = await fs.readFile(filePath, 'utf-8');
    catalog = JSON.parse(content);
  } catch (err) {
    catalog = {};
  }

  // 2. Merge with Supabase service_details table if accessible
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('service_details')
          .select('*'),
        2500
      );

      if (!error && data && data.length > 0) {
        data.forEach(row => {
          if (row.raw_data) {
            catalog[row.id] = { ...catalog[row.id], ...row.raw_data };
          } else {
            catalog[row.id] = {
              ...catalog[row.id],
              id: row.id,
              title: row.title,
              tagline: row.tagline,
              badge: row.badge,
              category: row.category,
              heroBg: row.hero_bg,
              mosaicPhotos: row.mosaic_photos || [],
              metrics: row.metrics || [],
              compareBefore: row.compare_before,
              compareAfter: row.compare_after,
              compareBeforeTitle: row.compare_before_title,
              compareAfterTitle: row.compare_after_title,
              journey: row.journey || [],
              lookbookPhotos: row.lookbook_photos || [],
              specsTable: row.specs_table || [],
              brochure: row.brochure || {},
              packages: row.packages || [],
              overviewChips: row.overview_chips || (row.raw_data && row.raw_data.overviewChips) || [],
              features: row.features || (row.raw_data && row.raw_data.features) || [],
              trustItems: row.trust_items || (row.raw_data && row.raw_data.trustItems) || []
            };
          }
        });
      }
    } catch (err) {
      console.warn('⚠️  [Supabase] service_details query fallback to local:', err.message);
    }
  }

  setToCache('service_details', catalog);
  return catalog;
}

export async function getServiceDetailById(id) {
  const all = await getAllServiceDetails();
  return all[id] || null;
}

export async function upsertServiceDetail(serviceData) {
  if (!serviceData || !serviceData.id) {
    throw new Error('Service ID is required');
  }

  const id = serviceData.id;
  let savedToSupabase = false;

  // 1. Sync to Supabase service_details table
  if (supabase) {
    try {
      const dbRow = {
        id: id,
        title: serviceData.title,
        tagline: serviceData.tagline || '',
        badge: serviceData.badge || '',
        category: serviceData.category || 'photobooth',
        hero_bg: serviceData.heroBg || '',
        mosaic_photos: serviceData.mosaicPhotos || [],
        metrics: serviceData.metrics || [],
        compare_before: serviceData.compareBefore || '',
        compare_after: serviceData.compareAfter || '',
        compare_before_title: serviceData.compareBeforeTitle || '',
        compare_after_title: serviceData.compareAfterTitle || '',
        journey: serviceData.journey || [],
        lookbook_photos: serviceData.lookbookPhotos || [],
        specs_table: serviceData.specsTable || [],
        brochure: serviceData.brochure || {},
        packages: serviceData.packages || [],
        overview_chips: serviceData.overviewChips || [],
        features: serviceData.features || [],
        trust_items: serviceData.trustItems || [],
        raw_data: serviceData,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('service_details')
        .upsert([dbRow], { onConflict: 'id' });

      if (!error) {
        savedToSupabase = true;
        console.log(`✅ [Supabase] service_details upserted: ${id}`);
      } else {
        console.warn('⚠️  [Supabase] service_details upsert error:', error.message);
      }
    } catch (err) {
      console.warn('⚠️  [Supabase] Exception upserting service_details:', err.message);
    }
  }

  // 2. Sync to local service-details.json
  try {
    const filePath = path.join(DATA_DIR, 'service-details.json');
    let catalog = {};
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      catalog = JSON.parse(content);
    } catch (e) {
      catalog = {};
    }

    catalog[id] = serviceData;
    await fs.writeFile(filePath, JSON.stringify(catalog, null, 2), 'utf-8');
  } catch (err) {
    console.error('Local service-details.json write failed:', err.message);
  }

  // 3. Keep services.json in sync
  try {
    const services = await readLocalJson('services.json');
    const existingIndex = services.findIndex(s => s.id === id);
    const serviceSummary = {
      id: id,
      title: serviceData.title,
      tagline: serviceData.tagline || '',
      badge: serviceData.badge || '',
      category: serviceData.category || 'photobooth',
      suitableFor: serviceData.suitableFor || ['VIP Events', 'Luxury Celebrations'],
      description: serviceData.tagline || serviceData.title,
      features: (serviceData.metrics ? serviceData.metrics.map(m => `${m.label}: ${m.val}`) : []),
      startingPrice: serviceData.packages && serviceData.packages[0] ? serviceData.packages[0].price : '£795',
      icon: serviceData.icon || 'camera'
    };

    if (existingIndex >= 0) {
      services[existingIndex] = { ...services[existingIndex], ...serviceSummary };
    } else {
      services.push(serviceSummary);
    }
    await writeLocalJson('services.json', services);

    // Also update Supabase services table if connected
    if (supabase) {
      try {
        await supabase.from('services').upsert([{
          id: id,
          title: serviceSummary.title,
          tagline: serviceSummary.tagline,
          badge: serviceSummary.badge,
          category: serviceSummary.category,
          suitable_for: serviceSummary.suitableFor,
          description: serviceSummary.description,
          features: serviceSummary.features,
          starting_price: serviceSummary.startingPrice,
          icon: serviceSummary.icon,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      } catch (e) {}
    }
  } catch (err) {
    console.warn('services.json sync warning:', err.message);
  }

  // Invalidate cache immediately so updates reflect instantly
  invalidateCache('service_details');
  invalidateCache('services');

  return { success: true, savedToSupabase, id };
}

export async function deleteServiceDetail(id) {
  let deletedFromSupabase = false;

  if (supabase) {
    try {
      await supabase.from('service_details').delete().eq('id', id);
      await supabase.from('services').delete().eq('id', id);
      deletedFromSupabase = true;
    } catch (err) {
      console.warn('Supabase delete error:', err.message);
    }
  }

  // Local sync
  try {
    const filePath = path.join(DATA_DIR, 'service-details.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const catalog = JSON.parse(content);
    delete catalog[id];
    await fs.writeFile(filePath, JSON.stringify(catalog, null, 2), 'utf-8');
  } catch (err) {}

  try {
    const services = await readLocalJson('services.json');
    const filtered = services.filter(s => s.id !== id);
    await writeLocalJson('services.json', filtered);
  } catch (err) {}

  invalidateCache('service_details');
  invalidateCache('services');

  return { success: true, deletedFromSupabase };
}

// ------------------------------------------------------------------------------
// 7. ALL ENQUIRIES FOR ADMIN LEDGER
// ------------------------------------------------------------------------------
export async function getAllEnquiries() {
  const cached = getFromCache('enquiries');
  if (cached) return cached;

  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('enquiries')
          .select('*')
          .order('created_at', { ascending: false }),
        2500
      );

      if (!error && data && data.length > 0) {
        const result = data.map(item => ({
          referenceId: item.reference_id,
          fullName: item.full_name,
          email: item.email,
          phone: item.phone,
          eventType: item.event_type,
          eventDate: item.event_date,
          eventLocation: item.event_location,
          services: item.services,
          message: item.message,
          status: item.status || 'Under Review',
          estimatedResponse: item.estimated_response,
          createdAt: item.created_at
        }));
        setToCache('enquiries', result);
        return result;
      }
    } catch (err) {
      console.warn('Supabase enquiries query fallback:', err.message);
    }
  }

  const fallback = await readLocalJson('enquiries.json');
  setToCache('enquiries', fallback);
  return fallback;
}

export async function updateEnquiryStatus(referenceId, status) {
  if (supabase) {
    try {
      await supabase
        .from('enquiries')
        .update({ status })
        .eq('reference_id', referenceId);
    } catch (err) {
      console.warn('Supabase update status error:', err.message);
    }
  }

  try {
    const enquiries = await readLocalJson('enquiries.json');
    const item = enquiries.find(e => e.referenceId === referenceId);
    if (item) {
      item.status = status;
      await writeLocalJson('enquiries.json', enquiries);
    }
  } catch (err) {}

  invalidateCache('enquiries');

  return { success: true, referenceId, status };
}
