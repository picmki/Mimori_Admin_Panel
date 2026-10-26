-- ==============================================================================
-- MIMORI DIGITAL - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. SERVICES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tagline TEXT,
    badge TEXT,
    category TEXT NOT NULL,
    suitable_for JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    starting_price TEXT,
    icon TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Allow public read access
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on services"
    ON public.services
    FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 3. PORTFOLIO TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    event_name TEXT,
    venue TEXT,
    date_str TEXT,
    stats TEXT,
    image TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Allow public read access
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on portfolio"
    ON public.portfolio
    FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 4. ENQUIRIES TABLE (Event Reservations & Booking Requests)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date DATE,
    event_location TEXT NOT NULL,
    expected_guests TEXT,
    services JSONB DEFAULT '[]'::jsonb,
    budget_range TEXT,
    message TEXT,
    status TEXT DEFAULT 'Under Review',
    estimated_response TEXT DEFAULT 'Within 12-24 hours',
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_reference_id ON public.enquiries (reference_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON public.enquiries (email);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries (created_at DESC);

-- Enable RLS
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Allow public to insert new enquiries
CREATE POLICY "Allow public to submit enquiries"
    ON public.enquiries
    FOR INSERT
    WITH CHECK (true);

-- Allow public to lookup enquiry by reference code
CREATE POLICY "Allow public to read enquiry by reference"
    ON public.enquiries
    FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 5. CONTACTS TABLE (Concierge Desk & General Inquiries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'New',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts (created_at DESC);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Allow public to submit contact messages
CREATE POLICY "Allow public to submit contact messages"
    ON public.contacts
    FOR INSERT
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. SUBSCRIBERS TABLE (Newsletter & VIP Lookbook Updates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public newsletter signups"
    ON public.subscribers
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow checking existing subscriber"
    ON public.subscribers
    FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 7. SERVICE DETAILS TABLE (Full Lookbook Pages & Visual Configuration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_details (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tagline TEXT,
    badge TEXT,
    category TEXT DEFAULT 'photobooth',
    hero_bg TEXT,
    mosaic_photos JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '[]'::jsonb,
    compare_before TEXT,
    compare_after TEXT,
    compare_before_title TEXT,
    compare_after_title TEXT,
    journey JSONB DEFAULT '[]'::jsonb,
    lookbook_photos JSONB DEFAULT '[]'::jsonb,
    specs_table JSONB DEFAULT '[]'::jsonb,
    brochure JSONB DEFAULT '{}'::jsonb,
    packages JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on service_details"
    ON public.service_details
    FOR SELECT
    USING (true);

CREATE POLICY "Allow admin full access on service_details"
    ON public.service_details
    FOR ALL
    USING (true)
    WITH CHECK (true);

