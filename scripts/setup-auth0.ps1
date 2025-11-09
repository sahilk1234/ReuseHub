# Auth0 Setup Script for Re:UseNet (PowerShell)
# This script helps configure Auth0 for your application

Write-Host "🔐 Auth0 Setup for Re:UseNet" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Setup Checklist:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Create Auth0 Account" -ForegroundColor Green
Write-Host "   → Visit: https://auth0.com/signup"
Write-Host "   → No credit card required"
Write-Host "   → 7,000 free active users"
Write-Host ""

Write-Host "2. Create Application" -ForegroundColor Green
Write-Host "   → Go to Applications → Create Application"
Write-Host "   → Choose 'Regular Web Application'"
Write-Host "   → Name it 'ReuseNet'"
Write-Host ""

Write-Host "3. Configure Application Settings" -ForegroundColor Green
Write-Host "   Allowed Callback URLs:"
Write-Host "   → http://localhost:3000/callback"
Write-Host "   → http://localhost:5173/callback"
Write-Host ""
Write-Host "   Allowed Logout URLs:"
Write-Host "   → http://localhost:3000"
Write-Host "   → http://localhost:5173"
Write-Host ""
Write-Host "   Allowed Web Origins:"
Write-Host "   → http://localhost:3000"
Write-Host "   → http://localhost:5173"
Write-Host ""

Write-Host "4. Enable Social Connections" -ForegroundColor Green
Write-Host "   → Go to Authentication → Social"
Write-Host "   → Enable: Google, Facebook, GitHub"
Write-Host "   → Configure each with their credentials"
Write-Host ""

Write-Host "5. Enable MFA (Optional but Recommended)" -ForegroundColor Green
Write-Host "   → Go to Security → Multi-factor Auth"
Write-Host "   → Enable SMS, Push, or Authenticator"
Write-Host ""

Write-Host "6. Enable Passwordless (Optional)" -ForegroundColor Green
Write-Host "   → Go to Authentication → Passwordless"
Write-Host "   → Enable Email or SMS"
Write-Host ""

Write-Host "7. Update Environment Variables" -ForegroundColor Green
Write-Host "   Add to your .env file:"
Write-Host ""
Write-Host "   AUTH_PROVIDER=auth0" -ForegroundColor White
Write-Host "   AUTH0_DOMAIN=your-tenant.auth0.com" -ForegroundColor White
Write-Host "   AUTH0_CLIENT_ID=your_client_id" -ForegroundColor White
Write-Host "   AUTH0_CLIENT_SECRET=your_client_secret" -ForegroundColor White
Write-Host "   AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/" -ForegroundColor White
Write-Host ""

$response = Read-Host "Have you completed the setup? (y/n)"

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "✅ Great! Now update your .env file and restart the application:" -ForegroundColor Green
    Write-Host ""
    Write-Host "   npm run build" -ForegroundColor Yellow
    Write-Host "   docker-compose down" -ForegroundColor Yellow
    Write-Host "   docker-compose up --build -d" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🎉 Your application will now use Auth0 for authentication!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "📖 Take your time! Refer to docs/AUTH0_INTEGRATION.md for detailed instructions." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🏆 Good luck with the MLH Auth0 challenge!" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Cyan
