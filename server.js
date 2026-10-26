import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isSupabaseConfigured,
  getServices,
  getPortfolio,
  createEnquiry,
  getEnquiryByReference,
  createContact,
  createSubscriber,
  getAllServiceDetails,
  getServiceDetailById,
  upsertServiceDetail,
  deleteServiceDetail,
  getAllEnquiries,
  updateEnquiryStatus,
  updateServicesList,
  getCategories,
  createCategory,
  updateCategoriesList,
  deleteCategory
} from './lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf'
};

// Helper: Read JSON file safely
async function readJsonFile(filename, fallback = []) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return fallback;
  }
}

// Helper: Write JSON file safely
async function writeJsonFile(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
    return false;
  }
}

// Helper: Parse request JSON body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB limit (supports PDF manuals)

    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_SIZE) {
        reject(new Error('Request payload too large'));
      }
    });

    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });

    req.on('error', err => reject(err));
  });
}

// ----------------------------------------------------
// ADMIN AUTHENTICATION
// User ID: Mimori | Password: Demo123
// ----------------------------------------------------
const ADMIN_CREDENTIALS = {
  username: 'Mimori',
  password: 'Demo123'
};
const activeAdminTokens = new Set();

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
      }
    });
  }
  return list;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const tokenFromCookie = cookies['mimori_admin_token'];
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromCookie || tokenFromHeader;
  return Boolean(token && activeAdminTokens.has(token));
}

// Helper: Send JSON Response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

// Main HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // POST /api/admin/login
  if (req.method === 'POST' && pathname === '/api/admin/login') {
    try {
      const body = await parseRequestBody(req);
      const username = (body.username || body.userId || '').trim();
      const password = (body.password || '').trim();

      if (username.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
        const token = 'mimori_adm_' + Date.now() + '_' + Math.random().toString(36).substring(2);
        activeAdminTokens.add(token);

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=UTF-8',
          'Set-Cookie': `mimori_admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end(JSON.stringify({
          success: true,
          message: 'Authentication successful',
          token,
          user: { id: ADMIN_CREDENTIALS.username, role: 'Super Admin' }
        }));
      }

      return sendJson(res, 401, {
        success: false,
        message: 'Invalid User ID or Password. Please check credentials.'
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // POST /api/admin/logout
  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    const cookies = parseCookies(req);
    const token = cookies['mimori_admin_token'];
    if (token) {
      activeAdminTokens.delete(token);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Set-Cookie': `mimori_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
  }

  // GET /api/admin/auth-check
  if (req.method === 'GET' && pathname === '/api/admin/auth-check') {
    const authed = isAuthenticated(req);
    return sendJson(res, 200, {
      authenticated: authed,
      user: authed ? { id: ADMIN_CREDENTIALS.username, role: 'Super Admin' } : null
    });
  }

  // GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'healthy',
      brand: 'Mimori Digital',
      version: '1.0.0',
      database: isSupabaseConfigured() ? 'supabase' : 'local_fallback',
      timestamp: new Date().toISOString()
    });
  }

  // GET /api/services
  if (req.method === 'GET' && pathname === '/api/services') {
    const services = await getServices();
    return sendJson(res, 200, {
      success: true,
      count: services.length,
      source: isSupabaseConfigured() ? 'supabase' : 'local_fallback',
      data: services
    });
  }

  // PUT or POST /api/services (Bulk update services list / megamenu hierarchy)
  if ((req.method === 'PUT' || req.method === 'POST') && pathname === '/api/services') {
    try {
      const payload = await parseRequestBody(req);
      const list = Array.isArray(payload) ? payload : (payload.services || []);
      const result = await updateServicesList(list);
      return sendJson(res, 200, {
        success: true,
        message: 'Services menu and catalog updated successfully',
        data: result
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // GET /api/categories (All megamenu categories)
  if (req.method === 'GET' && pathname === '/api/categories') {
    const categories = await getCategories();
    return sendJson(res, 200, {
      success: true,
      count: categories.length,
      source: isSupabaseConfigured() ? 'supabase' : 'local_fallback',
      data: categories
    });
  }

  // POST /api/categories (Create or update category)
  if (req.method === 'POST' && pathname === '/api/categories') {
    try {
      const payload = await parseRequestBody(req);
      if (!payload.name) {
        return sendJson(res, 400, { success: false, message: 'Category name is required' });
      }
      const result = await createCategory(payload);
      return sendJson(res, 200, {
        success: true,
        message: 'Category created successfully',
        data: result.category
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // PUT /api/categories (Bulk update or reorder categories)
  if (req.method === 'PUT' && pathname === '/api/categories') {
    try {
      const payload = await parseRequestBody(req);
      const list = Array.isArray(payload) ? payload : (payload.categories || []);
      const result = await updateCategoriesList(list);
      return sendJson(res, 200, {
        success: true,
        message: 'Categories updated successfully',
        data: result
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // DELETE /api/categories/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/categories/')) {
    const id = pathname.replace('/api/categories/', '').trim();
    const result = await deleteCategory(id);
    return sendJson(res, 200, {
      success: true,
      message: `Category ${id} deleted successfully`,
      data: result
    });
  }

  // POST /api/upload (Base64 file upload for images, lookbook photos, brochure PDFs)
  if (req.method === 'POST' && pathname === '/api/upload') {
    try {
      const payload = await parseRequestBody(req);
      if (!payload.data) {
        return sendJson(res, 400, { success: false, message: 'File data is required' });
      }

      let base64Data = payload.data;
      let ext = '.jpg';
      let subDir = 'images/uploads';

      if (payload.data.includes(';base64,')) {
        const parts = payload.data.split(';base64,');
        const mimePart = parts[0];
        base64Data = parts[1];
        if (mimePart.includes('application/pdf')) {
          ext = '.pdf';
          subDir = 'downloads/uploads';
        } else {
          const match = mimePart.match(/data:image\/([a-zA-Z0-9+]+)/);
          if (match) {
            ext = '.' + (match[1] === 'svg+xml' ? 'svg' : match[1]);
          }
        }
      }

      if (payload.filename) {
        const parsedExt = path.extname(payload.filename).toLowerCase();
        if (parsedExt) {
          ext = parsedExt;
          if (ext === '.pdf') {
            subDir = 'downloads/uploads';
          }
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const cleanName = (payload.filename ? path.basename(payload.filename, path.extname(payload.filename)) : 'upload')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
      const uniqueFilename = `${cleanName}_${Date.now()}${ext}`;
      const uploadDir = path.join(PUBLIC_DIR, subDir);
      await fs.mkdir(uploadDir, { recursive: true });
      const targetPath = path.join(uploadDir, uniqueFilename);
      await fs.writeFile(targetPath, buffer);

      return sendJson(res, 200, {
        success: true,
        url: `/${subDir}/${uniqueFilename}`,
        filename: uniqueFilename
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // ----------------------------------------------------
  // ADMIN & DYNAMIC SERVICE DETAILS APIs
  // ----------------------------------------------------

  // GET /api/service-details (Get all full service detail pages)
  if (req.method === 'GET' && pathname === '/api/service-details') {
    const catalog = await getAllServiceDetails();
    return sendJson(res, 200, {
      success: true,
      count: Object.keys(catalog).length,
      source: isSupabaseConfigured() ? 'supabase' : 'local_fallback',
      data: catalog
    });
  }

  // GET /api/service-details/:id
  if (req.method === 'GET' && pathname.startsWith('/api/service-details/')) {
    const id = pathname.replace('/api/service-details/', '').trim();
    const service = await getServiceDetailById(id);
    if (!service) {
      return sendJson(res, 404, { success: false, message: `Service ${id} not found` });
    }
    return sendJson(res, 200, {
      success: true,
      source: isSupabaseConfigured() ? 'supabase' : 'local_fallback',
      data: service
    });
  }

  // POST or PUT /api/service-details (Create or update service detail)
  if ((req.method === 'POST' || req.method === 'PUT') && (pathname === '/api/service-details' || pathname.startsWith('/api/service-details/'))) {
    try {
      const payload = await parseRequestBody(req);
      if (pathname.startsWith('/api/service-details/')) {
        const idFromUrl = pathname.replace('/api/service-details/', '').trim();
        if (idFromUrl && !payload.id) payload.id = idFromUrl;
      }
      if (!payload.id || !payload.title) {
        return sendJson(res, 400, { success: false, message: 'Both ID and Title are required' });
      }
      const result = await upsertServiceDetail(payload);
      return sendJson(res, 200, {
        success: true,
        message: 'Service details saved and synced successfully',
        data: result
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: err.message });
    }
  }

  // DELETE /api/service-details/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/service-details/')) {
    const id = pathname.replace('/api/service-details/', '').trim();
    const result = await deleteServiceDetail(id);
    return sendJson(res, 200, {
      success: true,
      message: `Service ${id} deleted successfully`,
      data: result
    });
  }

  // GET /api/admin/enquiries (All leads and date holds)
  if (req.method === 'GET' && pathname === '/api/admin/enquiries') {
    const enquiries = await getAllEnquiries();
    return sendJson(res, 200, {
      success: true,
      count: enquiries.length,
      source: isSupabaseConfigured() ? 'supabase' : 'local_fallback',
      data: enquiries
    });
  }

  // PATCH /api/admin/enquiries/:referenceId (Update status)
  if (req.method === 'PATCH' && pathname.startsWith('/api/admin/enquiries/')) {
    const refCode = pathname.replace('/api/admin/enquiries/', '').trim().toUpperCase();
    const payload = await parseRequestBody(req);
    const result = await updateEnquiryStatus(refCode, payload.status || 'Under Review');
    return sendJson(res, 200, { success: true, data: result });
  }

  // GET /api/portfolio
  if (req.method === 'GET' && pathname === '/api/portfolio') {
    const category = searchParams.get('category');
    const filtered = await getPortfolio(category);

    return sendJson(res, 200, {
      success: true,
      count: filtered.length,
      category: category || 'all',
      source: isSupabaseConfigured() ? 'supabase' : 'local_fallback',
      data: filtered
    });
  }

  // GET /api/testimonials
  if (req.method === 'GET' && pathname === '/api/testimonials') {
    const testimonials = await readJsonFile('testimonials.json');
    return sendJson(res, 200, {
      success: true,
      count: testimonials.length,
      data: testimonials
    });
  }

  // POST /api/enquiries (Main conversion endpoint)
  if (req.method === 'POST' && pathname === '/api/enquiries') {
    try {
      const payload = await parseRequestBody(req);

      // Validation
      const errors = {};
      if (!payload.fullName || typeof payload.fullName !== 'string' || payload.fullName.trim().length < 2) {
        errors.fullName = 'Full Name is required (minimum 2 characters)';
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!payload.email || !emailRegex.test(payload.email.trim())) {
        errors.email = 'A valid email address is required';
      }

      if (!payload.phone || typeof payload.phone !== 'string' || payload.phone.replace(/\D/g, '').length < 6) {
        errors.phone = 'Valid phone number with country code is required';
      }

      if (!payload.eventType || typeof payload.eventType !== 'string' || !payload.eventType.trim()) {
        errors.eventType = 'Please select an event type';
      }

      if (!payload.eventDate) {
        errors.eventDate = 'Event date is required';
      } else {
        const eventDateObj = new Date(payload.eventDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(eventDateObj.getTime()) || eventDateObj < today) {
          errors.eventDate = 'Please select a valid upcoming event date';
        }
      }

      if (!payload.eventLocation || typeof payload.eventLocation !== 'string' || payload.eventLocation.trim().length < 2) {
        errors.eventLocation = 'Event location or venue is required';
      }

      const servicesArray = Array.isArray(payload.services) 
        ? payload.services 
        : (payload.services ? [payload.services] : []);

      if (servicesArray.length === 0) {
        errors.services = 'Please select at least one photobooth or event experience';
      }

      if (!payload.consent) {
        errors.consent = 'You must agree to the privacy policy and terms to proceed';
      }

      // Check if validation errors exist
      if (Object.keys(errors).length > 0) {
        return sendJson(res, 400, {
          success: false,
          message: 'Please resolve the highlighted form fields',
          errors
        });
      }

      // Generate unique booking reference: MIM-XXXXX
      const randomCode = Math.floor(10000 + Math.random() * 90000);
      const referenceId = `MIM-${randomCode}`;

      const newEnquiry = {
        referenceId,
        createdAt: new Date().toISOString(),
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
        eventType: payload.eventType.trim(),
        eventDate: payload.eventDate,
        eventLocation: payload.eventLocation.trim(),
        expectedGuests: payload.expectedGuests || 'Not specified',
        services: servicesArray,
        budgetRange: payload.budgetRange || 'Flexible',
        message: payload.message ? payload.message.trim() : '',
        inspirationReference: payload.inspirationName ? {
          fileName: payload.inspirationName,
          hasAttachment: true
        } : null,
        status: 'Under Review',
        estimatedResponse: 'Within 12-24 hours'
      };

      // Save enquiry via Supabase layer (with automatic dual local backup)
      await createEnquiry(newEnquiry);

      return sendJson(res, 201, {
        success: true,
        referenceId,
        message: 'Thanks! Your event enquiry has been received. Our team will review your requirements and get back to you shortly.',
        enquiry: {
          referenceId: newEnquiry.referenceId,
          fullName: newEnquiry.fullName,
          eventType: newEnquiry.eventType,
          eventDate: newEnquiry.eventDate,
          eventLocation: newEnquiry.eventLocation,
          services: newEnquiry.services,
          status: newEnquiry.status,
          estimatedResponse: newEnquiry.estimatedResponse
        }
      });
    } catch (err) {
      console.error('Enquiry processing error:', err);
      return sendJson(res, 500, {
        success: false,
        message: 'Internal server error while processing your enquiry. Please try again.'
      });
    }
  }

  // GET /api/enquiries/:referenceId (Client enquiry status lookup)
  if (req.method === 'GET' && pathname.startsWith('/api/enquiries/')) {
    const refCode = pathname.replace('/api/enquiries/', '').trim().toUpperCase();
    const found = await getEnquiryByReference(refCode);

    if (!found) {
      return sendJson(res, 404, {
        success: false,
        message: `No enquiry found for reference ${refCode}. Please verify the code or contact our team.`
      });
    }

    // Client-safe sanitized enquiry details
    return sendJson(res, 200, {
      success: true,
      enquiry: {
        referenceId: found.referenceId,
        createdAt: found.createdAt,
        eventType: found.eventType,
        eventDate: found.eventDate,
        eventLocation: found.eventLocation,
        services: found.services,
        status: found.status,
        estimatedResponse: found.estimatedResponse || 'Within 24 hours'
      }
    });
  }

  // POST /api/newsletter (VIP Event trends & guides)
  if (req.method === 'POST' && pathname === '/api/newsletter') {
    try {
      const payload = await parseRequestBody(req);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!payload.email || !emailRegex.test(payload.email.trim())) {
        return sendJson(res, 400, {
          success: false,
          message: 'Please provide a valid email address.'
        });
      }

      const email = payload.email.trim().toLowerCase();
      const subResult = await createSubscriber(email);

      if (subResult.alreadySubscribed) {
        return sendJson(res, 200, {
          success: true,
          message: 'You are already subscribed to Mimori Digital VIP updates!'
        });
      }

      return sendJson(res, 201, {
        success: true,
        message: 'Welcome to the Mimori VIP list! Check your inbox for our 2026 Event Inspiration Guide.'
      });
    } catch (err) {
      return sendJson(res, 500, {
        success: false,
        message: 'Error processing newsletter subscription.'
      });
    }
  }

  // POST /api/contact (General enquiry / concierge contact)
  if (req.method === 'POST' && pathname === '/api/contact') {
    try {
      const payload = await parseRequestBody(req);
      if (!payload.name || !payload.email || !payload.message) {
        return sendJson(res, 400, {
          success: false,
          message: 'Name, email, and message are required.'
        });
      }

      await createContact(payload);

      return sendJson(res, 200, {
        success: true,
        message: 'Thank you for contacting Mimori Digital. Our concierge team has received your message.'
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, message: 'Server error' });
    }
  }

  // ----------------------------------------------------
  // STATIC FILE SERVING
  // ----------------------------------------------------
  let decodedPath = pathname;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (err) {
    decodedPath = pathname;
  }

  let safePath = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '');

  if (safePath === '/admin-login' || safePath === '/admin/login' || safePath === '/login') {
    safePath = '/admin-login.html';
  }
  if (safePath === '/admin-login.html') {
    if (isAuthenticated(req)) {
      res.writeHead(302, { Location: '/' });
      res.end();
      return;
    }
    safePath = '/admin-login.html';
  }
  if (safePath === '/' || safePath === '' || safePath === '/index.html' || safePath === '/admin' || safePath === '/admin/' || safePath === '/admin/index.html' || safePath === '/admin.html') {
    if (!isAuthenticated(req)) {
      res.writeHead(302, { Location: '/admin-login.html' });
      res.end();
      return;
    }
    safePath = '/admin.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security: prevent directory traversal outside public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  let resolvedFilePath = filePath;
  if (!existsSync(resolvedFilePath) && existsSync(filePath + '.html')) {
    resolvedFilePath = filePath + '.html';
  }

  // Fallback 1: handle /image/ -> /images/ if needed
  if (!existsSync(resolvedFilePath) && safePath.startsWith('/image/')) {
    const imagesAlt = path.join(PUBLIC_DIR, safePath.replace('/image/', '/images/'));
    if (existsSync(imagesAlt)) {
      resolvedFilePath = imagesAlt;
    }
  }

  // Fallback 2: handle lowercase hyphenated or space variants
  if (!existsSync(resolvedFilePath)) {
    const dir = path.dirname(safePath);
    const base = path.basename(safePath);
    // Try hyphenated version (e.g. Header Logo.svg -> header-logo.svg)
    const hyphenated = path.join(PUBLIC_DIR, dir, base.toLowerCase().replace(/\s+/g, '-'));
    if (existsSync(hyphenated)) {
      resolvedFilePath = hyphenated;
    } else {
      // Try unencoded / literal space version if base had %20
      const unencoded = path.join(PUBLIC_DIR, dir, base.replace(/%20/g, ' '));
      if (existsSync(unencoded)) {
        resolvedFilePath = unencoded;
      }
    }
  }

  if (existsSync(resolvedFilePath)) {
    try {
      const stat = await fs.stat(resolvedFilePath);
      if (stat.isDirectory()) {
        const indexHtml = path.join(resolvedFilePath, 'index.html');
        if (existsSync(indexHtml)) {
          res.writeHead(200, { 
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          createReadStream(indexHtml).pipe(res);
          return;
        }
      } else {
        const ext = path.extname(resolvedFilePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff'
        });
        createReadStream(resolvedFilePath).pipe(res);
        return;
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
  }

  // If not found, serve 404
  res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>404 - Page Not Found | Mimori Digital</title>
      <style>
        body { font-family: 'Avenir', sans-serif; background: #0B0B0E; color: #FFF; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .box { max-width: 480px; padding: 40px; }
        h1 { font-size: 3rem; color: #E31D1C; margin-bottom: 8px; }
        p { color: #A0A0AB; font-size: 1.1rem; line-height: 1.6; }
        a { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #E31D1C; color: #FFF; text-decoration: none; border-radius: 9999px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>404</h1>
        <h2>Moment Not Found</h2>
        <p>The page you are looking for does not exist or has been relocated.</p>
        <a href="/">Return to Mimori Home</a>
      </div>
    </body>
    </html>
  `);
});

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`✨ Mimori Digital Server running at http://localhost:${PORT}`);
    console.log(`✨ Mimori Admin Panel running at http://localhost:${PORT}/admin`);
  });
}

export default server;
