// Quick script to check if Auth0 environment variables are loaded
// Run with: node check-env.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔍 Checking Auth0 Environment Configuration...\n');

try {
  const envPath = join(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  
  const lines = envContent.split('\n');
  const config = {};
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      config[key] = value;
    }
  });
  
  console.log('📄 Current .env configuration:\n');
  
  // Check VITE_AUTH0_DOMAIN
  const domain = config.VITE_AUTH0_DOMAIN;
  if (!domain || domain.trim() === '') {
    console.log('❌ VITE_AUTH0_DOMAIN: NOT SET (empty)');
  } else if (domain.includes('example') || domain.includes('your-tenant')) {
    console.log(`⚠️  VITE_AUTH0_DOMAIN: ${domain} (PLACEHOLDER - needs to be replaced)`);
  } else {
    console.log(`✅ VITE_AUTH0_DOMAIN: ${domain}`);
  }
  
  // Check VITE_AUTH0_CLIENT_ID
  const clientId = config.VITE_AUTH0_CLIENT_ID;
  if (!clientId || clientId.trim() === '') {
    console.log('❌ VITE_AUTH0_CLIENT_ID: NOT SET (empty)');
  } else if (clientId.includes('your_client_id') || clientId.includes('your-client-id')) {
    console.log(`⚠️  VITE_AUTH0_CLIENT_ID: ${clientId} (PLACEHOLDER - needs to be replaced)`);
  } else {
    console.log(`✅ VITE_AUTH0_CLIENT_ID: ${clientId.substring(0, 10)}...`);
  }
  
  console.log('\n');
  
  // Provide guidance
  if (!domain || domain.includes('example') || domain.includes('your-tenant') ||
      !clientId || clientId.includes('your_client_id') || clientId.includes('your-client-id')) {
    console.log('⚠️  ACTION REQUIRED:\n');
    console.log('1. Get your Auth0 credentials from: https://manage.auth0.com');
    console.log('2. Update client/.env with your actual values');
    console.log('3. Restart the dev server: npm run dev');
    console.log('\nSee AUTH0_SETUP_QUICK_FIX.md for detailed instructions.\n');
  } else {
    console.log('✅ Auth0 configuration looks good!\n');
    console.log('Make sure to restart your dev server if you just updated these values.\n');
  }
  
} catch (error) {
  console.log('❌ Error reading .env file:', error.message);
  console.log('\nMake sure client/.env exists. Copy from client/.env.example if needed.\n');
}
