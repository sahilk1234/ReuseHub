# Re:UseNet Deployment Script for Windows
# This script helps deploy Re:UseNet in different environments

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod', 'stop', 'logs', 'backup', 'health')]
    [string]$Command,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev'
)

# Function to print colored output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check if command exists
function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    if (-not (Test-CommandExists "docker")) {
        Write-Error-Custom "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }
    
    if (-not (Test-CommandExists "docker-compose")) {
        Write-Error-Custom "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
    
    Write-Info "Prerequisites check passed!"
}

# Function to check if .env file exists
function Test-EnvFile {
    param([string]$EnvFile)
    
    if (-not (Test-Path $EnvFile)) {
        Write-Error-Custom "$EnvFile not found!"
        Write-Info "Please copy .env.example to $EnvFile and configure it."
        exit 1
    }
    
    # Check for placeholder values in production
    if ($EnvFile -eq ".env.production") {
        $content = Get-Content $EnvFile -Raw
        if ($content -match "CHANGE_ME" -or $content -match "YOUR_") {
            Write-Error-Custom "Found placeholder values in $EnvFile"
            Write-Info "Please replace all CHANGE_ME and YOUR_ values with actual configuration."
            exit 1
        }
    }
}

# Function to deploy development environment
function Deploy-Dev {
    Write-Info "Deploying development environment..."
    
    Test-EnvFile ".env"
    
    Write-Info "Building and starting containers..."
    docker-compose -f docker-compose.dev.yml up --build -d
    
    Write-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    
    Write-Info "Running database migrations..."
    docker-compose -f docker-compose.dev.yml exec -T app npm run db:migrate
    
    Write-Info "Development environment deployed successfully!"
    Write-Info "Application is running at http://localhost:3000"
    Write-Info "View logs with: docker-compose -f docker-compose.dev.yml logs -f"
}

# Function to deploy production environment
function Deploy-Prod {
    Write-Info "Deploying production environment..."
    
    Test-EnvFile ".env.production"
    
    Write-Warning-Custom "This will deploy to production. Are you sure? (yes/no)"
    $confirmation = Read-Host
    
    if ($confirmation -ne "yes") {
        Write-Info "Deployment cancelled."
        exit 0
    }
    
    Write-Info "Building production images..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production build
    
    Write-Info "Starting production containers..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    Write-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 15
    
    Write-Info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T app npm run db:migrate
    
    Write-Info "Production environment deployed successfully!"
    Write-Info "Application is running on port 3000"
    Write-Info "View logs with: docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f"
}

# Function to stop environment
function Stop-Environment {
    param([string]$Env)
    
    Write-Info "Stopping $Env environment..."
    
    if ($Env -eq "dev") {
        docker-compose -f docker-compose.dev.yml down
    }
    elseif ($Env -eq "prod") {
        docker-compose -f docker-compose.prod.yml --env-file .env.production down
    }
    else {
        docker-compose down
    }
    
    Write-Info "$Env environment stopped."
}

# Function to view logs
function Show-Logs {
    param([string]$Env)
    
    if ($Env -eq "dev") {
        docker-compose -f docker-compose.dev.yml logs -f
    }
    elseif ($Env -eq "prod") {
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f
    }
    else {
        docker-compose logs -f
    }
}

# Function to run database backup
function Backup-Database {
    param([string]$Env)
    
    $backupDir = "backups"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$backupDir/reusenet_${Env}_${timestamp}.sql"
    
    Write-Info "Creating database backup..."
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    
    if ($Env -eq "dev") {
        docker-compose -f docker-compose.dev.yml exec -T database pg_dump -U postgres reusenet_dev | Out-File -FilePath $backupFile -Encoding utf8
    }
    elseif ($Env -eq "prod") {
        docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T database pg_dump -U postgres reusenet | Out-File -FilePath $backupFile -Encoding utf8
    }
    
    Write-Info "Database backup created: $backupFile"
}

# Function to show health status
function Test-Health {
    param([string]$Env)
    
    Write-Info "Checking health status..."
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
        $response | ConvertTo-Json -Depth 10
    }
    catch {
        Write-Error-Custom "Health check failed: $_"
    }
}

# Main script execution
Test-Prerequisites

switch ($Command) {
    'dev' {
        Deploy-Dev
    }
    'prod' {
        Deploy-Prod
    }
    'stop' {
        Stop-Environment $Environment
    }
    'logs' {
        Show-Logs $Environment
    }
    'backup' {
        Backup-Database $Environment
    }
    'health' {
        Test-Health $Environment
    }
}
