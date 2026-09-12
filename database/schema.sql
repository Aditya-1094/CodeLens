-- CarbonLens SME - Supabase PostgreSQL Database Schema with RLS & Auth Integration
-- Phase-1 Focus: Plastic & Packaging Manufacturing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. FACILITIES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    facility_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    industry VARCHAR(255) NOT NULL DEFAULT 'Plastic & Packaging Manufacturing',
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    default_reporting_period VARCHAR(100) DEFAULT 'Monthly',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ASSESSMENTS TABLE (Linked to auth.users & facilities)
CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    facility_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255) NOT NULL DEFAULT 'Plastic & Packaging Manufacturing',
    reporting_period VARCHAR(100) NOT NULL DEFAULT 'Monthly',
    total_co2e NUMERIC(10, 3) NOT NULL DEFAULT 0.0,
    confidence_score INTEGER NOT NULL DEFAULT 0,
    is_partial BOOLEAN NOT NULL DEFAULT FALSE,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ACTIVITY_DATA TABLE
CREATE TABLE IF NOT EXISTS activity_data (
    id VARCHAR(64) PRIMARY KEY,
    assessment_id VARCHAR(64) REFERENCES assessments(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. EMISSION_FACTORS TABLE (Shared Reference Data)
CREATE TABLE IF NOT EXISTS emission_factors (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    sub_type VARCHAR(100),
    source_name VARCHAR(255) NOT NULL,
    factor_value NUMERIC(10, 4) NOT NULL,
    factor_unit VARCHAR(50) NOT NULL,
    source_organization VARCHAR(255) NOT NULL,
    document_reference TEXT NOT NULL,
    reference_year INTEGER NOT NULL,
    notes TEXT
);

-- 6. EMISSION_RESULTS TABLE
CREATE TABLE IF NOT EXISTS emission_results (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(64) REFERENCES assessments(id) ON DELETE CASCADE,
    activity_data_id VARCHAR(64),
    category VARCHAR(100) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    co2e NUMERIC(10, 3) NOT NULL,
    percentage_contribution NUMERIC(5, 2) NOT NULL
);

-- 7. RECOMMENDATION_RULES TABLE (Shared Reference Data)
CREATE TABLE IF NOT EXISTS recommendation_rules (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    description TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    addresses_hotspot VARCHAR(255) NOT NULL,
    implementation_difficulty VARCHAR(50) NOT NULL,
    example_technologies TEXT,
    default_sim_lever VARCHAR(100)
);

-- 8. RECYCLERS_VENDORS TABLE (Shared Reference Data)
CREATE TABLE IF NOT EXISTS recyclers_vendors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(100) NOT NULL,
    materials_supported TEXT[] NOT NULL,
    location VARCHAR(255) NOT NULL,
    distance_km NUMERIC(6, 2),
    contact_info TEXT NOT NULL,
    notes TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. SIMULATION_RESULTS TABLE
CREATE TABLE IF NOT EXISTS simulation_results (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(64) REFERENCES assessments(id) ON DELETE CASCADE,
    scenario_type VARCHAR(100) NOT NULL,
    scenario_parameters JSONB NOT NULL,
    baseline_co2e NUMERIC(10, 3) NOT NULL,
    projected_co2e NUMERIC(10, 3) NOT NULL,
    reduction_co2e NUMERIC(10, 3) NOT NULL,
    reduction_percentage NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;

-- Profiles Policy: User can only read/update their own profile
CREATE POLICY "Users can manage their own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Facilities Policy: User can only manage their own facilities
CREATE POLICY "Users can manage their own facilities" ON facilities
    FOR ALL USING (auth.uid() = user_id);

-- Assessments Policy: User can only manage their own assessments or demo
CREATE POLICY "Users can manage their own assessments" ON assessments
    FOR ALL USING (auth.uid() = user_id OR is_demo = TRUE);

-- Relational RLS Policies for Child Tables
CREATE POLICY "Users can access own activity data through assessment" ON activity_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assessments
            WHERE assessments.id = activity_data.assessment_id
            AND (assessments.user_id = auth.uid() OR assessments.is_demo = TRUE)
        )
    );

CREATE POLICY "Users can access own emission results through assessment" ON emission_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assessments
            WHERE assessments.id = emission_results.assessment_id
            AND (assessments.user_id = auth.uid() OR assessments.is_demo = TRUE)
        )
    );

CREATE POLICY "Users can access own simulation results through assessment" ON simulation_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assessments
            WHERE assessments.id = simulation_results.assessment_id
            AND (assessments.user_id = auth.uid() OR assessments.is_demo = TRUE)
        )
    );
