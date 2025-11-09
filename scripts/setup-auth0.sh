#!/bin/bash

# Auth0 Setup Script for Re:UseNet
# This script helps configure Auth0 for your application

echo "🔐 Auth0 Setup for Re:UseNet"
echo "================================"
echo ""

# Check if Auth0 CLI is installed
if ! command -v auth0 &> /dev/null; then
    echo "📦 Auth0 CLI not found. Installing..."
    echo "Visit: https://github.com/auth0/auth0-cli#installation"
    echo ""
    read -p "Press enter to continue with manual setup..."
fi

echo "📋 Setup Checklist:"
echo ""
echo "1. Create Auth0 Account"
echo "   → Visit: https://auth0.com/signup"
echo "   → No credit card required"
echo "   → 7,000 free active users"
echo ""

echo "2. Create Application"
echo "   → Go to Applications → Create Application"
echo "   → Choose 'Regular Web Application'"
echo "   → Name it 'ReuseNet'"
echo ""

echo "3. Configure Application Settings"
echo "   Allowed Callback URLs:"
echo "   → http://localhost:3000/callback"
echo "   → http://localhost:5173/callback"
echo ""
echo "   Allowed Logout URLs:"
echo "   → http://localhost:3000"
echo "   → http://localhost:5173"
echo ""
echo "   Allowed Web Origins:"
echo "   → http://localhost:3000"
echo "   → http://localhost:5173"
echo ""

echo "4. Enable Social Connections"
echo "   → Go to Authentication → Social"
echo "   → Enable: Google, Facebook, GitHub"
echo "   → Configure each with their credentials"
echo ""

echo "5. Enable MFA (Optional but Recommended)"
echo "   → Go to Security → Multi-factor Auth"
echo "   → Enable SMS, Push, or Authenticator"
echo ""

echo "6. Enable Passwordless (Optional)"
echo "   → Go to Authentication → Passwordless"
echo "   → Enable Email or SMS"
echo ""

echo "7. Update Environment Variables"
echo "   Add to your .env file:"
echo ""
echo "   AUTH_PROVIDER=auth0"
echo "   AUTH0_DOMAIN=your-tenant.auth0.com"
echo "   AUTH0_CLIENT_ID=your_client_id"
echo "   AUTH0_CLIENT_SECRET=your_client_secret"
echo "   AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/"
echo ""

read -p "Have you completed the setup? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Great! Now update your .env file and restart the application:"
    echo ""
    echo "   npm run build"
    echo "   docker-compose down"
    echo "   docker-compose up --build -d"
    echo ""
    echo "🎉 Your application will now use Auth0 for authentication!"
else
    echo "📖 Take your time! Refer to docs/AUTH0_INTEGRATION.md for detailed instructions."
fi

echo ""
echo "🏆 Good luck with the MLH Auth0 challenge!"
echo "================================"
