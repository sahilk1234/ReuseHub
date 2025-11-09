-- Initialize Re:UseNet database
-- This script sets up the basic database structure

-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create database if it doesn't exist (this will be handled by docker-compose)
-- The actual tables will be created by migration scripts in later tasks

-- Create a basic health check table
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    status VARCHAR(10) DEFAULT 'OK',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('OK') ON CONFLICT DO NOTHING;