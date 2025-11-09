#!/bin/bash

# Re:UseNet Deployment Script
# This script helps deploy Re:UseNet in different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_info "Prerequisites check passed!"
}

# Function to check if .env file exists
check_env_file() {
    local env_file=$1
    
    if [ ! -f "$env_file" ]; then
        print_error "$env_file not found!"
        print_info "Please copy .env.example to $env_file and configure it."
        exit 1
    fi
    
    # Check for placeholder values in production
    if [ "$env_file" = ".env.production" ]; then
        if grep -q "CHANGE_ME" "$env_file" || grep -q "YOUR_" "$env_file"; then
            print_error "Found placeholder values in $env_file"
            print_info "Please replace all CHANGE_ME and YOUR_ values with actual configuration."
            exit 1
        fi
    fi
}

# Function to deploy development environment
deploy_dev() {
    print_info "Deploying development environment..."
    
    check_env_file ".env"
    
    print_info "Building and starting containers..."
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_info "Waiting for services to be ready..."
    sleep 10
    
    print_info "Running database migrations..."
    docker-compose -f docker-compose.dev.yml exec -T app npm run db:migrate || true
    
    print_info "Development environment deployed successfully!"
    print_info "Application is running at http://localhost:3000"
    print_info "View logs with: docker-compose -f docker-compose.dev.yml logs -f"
}

# Function to deploy production environment
deploy_prod() {
    print_info "Deploying production environment..."
    
    check_env_file ".env.production"
    
    print_warning "This will deploy to production. Are you sure? (yes/no)"
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Deployment cancelled."
        exit 0
    fi
    
    print_info "Building production images..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production build
    
    print_info "Starting production containers..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    print_info "Waiting for services to be ready..."
    sleep 15
    
    print_info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T app npm run db:migrate || true
    
    print_info "Production environment deployed successfully!"
    print_info "Application is running on port 3000"
    print_info "View logs with: docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f"
}

# Function to stop environment
stop_env() {
    local env=$1
    
    print_info "Stopping $env environment..."
    
    if [ "$env" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml down
    elif [ "$env" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.production down
    else
        docker-compose down
    fi
    
    print_info "$env environment stopped."
}

# Function to view logs
view_logs() {
    local env=$1
    
    if [ "$env" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    elif [ "$env" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f
    else
        docker-compose logs -f
    fi
}

# Function to run database backup
backup_db() {
    local env=$1
    local backup_dir="backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/reusenet_${env}_${timestamp}.sql"
    
    print_info "Creating database backup..."
    
    mkdir -p "$backup_dir"
    
    if [ "$env" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml exec -T database pg_dump -U postgres reusenet_dev > "$backup_file"
    elif [ "$env" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T database pg_dump -U postgres reusenet > "$backup_file"
    fi
    
    print_info "Database backup created: $backup_file"
}

# Function to show health status
health_check() {
    local env=$1
    
    print_info "Checking health status..."
    
    if [ "$env" = "dev" ]; then
        curl -s http://localhost:3000/health | jq . || print_error "Health check failed"
    elif [ "$env" = "prod" ]; then
        curl -s http://localhost:3000/health | jq . || print_error "Health check failed"
    fi
}

# Main script
main() {
    check_prerequisites
    
    case "$1" in
        dev)
            deploy_dev
            ;;
        prod)
            deploy_prod
            ;;
        stop)
            stop_env "$2"
            ;;
        logs)
            view_logs "$2"
            ;;
        backup)
            backup_db "$2"
            ;;
        health)
            health_check "$2"
            ;;
        *)
            echo "Re:UseNet Deployment Script"
            echo ""
            echo "Usage: $0 {dev|prod|stop|logs|backup|health} [environment]"
            echo ""
            echo "Commands:"
            echo "  dev              Deploy development environment"
            echo "  prod             Deploy production environment"
            echo "  stop <env>       Stop environment (dev|prod)"
            echo "  logs <env>       View logs (dev|prod)"
            echo "  backup <env>     Backup database (dev|prod)"
            echo "  health <env>     Check health status (dev|prod)"
            echo ""
            echo "Examples:"
            echo "  $0 dev           # Deploy development"
            echo "  $0 prod          # Deploy production"
            echo "  $0 stop dev      # Stop development"
            echo "  $0 logs prod     # View production logs"
            echo "  $0 backup prod   # Backup production database"
            exit 1
            ;;
    esac
}

main "$@"
