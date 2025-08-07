#!/bin/bash

# Knowledge Base App Deployment Script
# This script automates the deployment of the knowledge base application

set -e  # Exit on any error

echo "🚀 Knowledge Base App Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are available"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_status "Node.js $(node -v) is available"
}

# Check environment file
check_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f "env.example" ]; then
            cp env.example .env
            print_status "Created .env file from template"
            print_warning "Please edit .env file with your configuration before continuing"
            exit 1
        else
            print_error "env.example file not found. Please create .env file manually."
            exit 1
        fi
    fi
    
    # Check for required environment variables
    source .env
    if [ -z "$OPENAI_API_KEY" ]; then
        print_error "OPENAI_API_KEY is not set in .env file"
        exit 1
    fi
    
    print_status "Environment configuration is valid"
}

# Install dependencies
install_deps() {
    print_status "Installing Node.js dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Create required directories
create_dirs() {
    print_status "Creating required directories..."
    mkdir -p uploads logs
    print_status "Directories created"
}

# Start ChromaDB
start_database() {
    print_status "Starting ChromaDB database..."
    docker-compose -f docker-compose.db.yml up -d
    
    if [ $? -eq 0 ]; then
        print_status "ChromaDB started successfully"
        
        # Wait for ChromaDB to be ready
        print_status "Waiting for ChromaDB to be ready..."
        sleep 10
        
        # Test ChromaDB connection
        if curl -f http://localhost:8000/api/v1/heartbeat &> /dev/null; then
            print_status "ChromaDB is ready"
        else
            print_warning "ChromaDB might not be ready yet. Continuing anyway..."
        fi
    else
        print_error "Failed to start ChromaDB"
        exit 1
    fi
}

# Start application
start_app() {
    print_status "Starting Knowledge Base application..."
    
    # Check if running in development or production mode
    if [ "$1" = "dev" ]; then
        print_status "Starting in development mode..."
        npm run dev
    else
        print_status "Starting in production mode..."
        npm start
    fi
}

# Deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."
    
    # Build and start the application
    docker-compose -f docker-compose.app.yml up -d --build
    
    if [ $? -eq 0 ]; then
        print_status "Application deployed successfully with Docker"
        
        # Wait for application to be ready
        print_status "Waiting for application to be ready..."
        sleep 15
        
        # Test application health
        if curl -f http://localhost:3000/health &> /dev/null; then
            print_status "Application is ready"
        else
            print_warning "Application might not be ready yet. Check logs with: docker-compose -f docker-compose.app.yml logs"
        fi
    else
        print_error "Failed to deploy application with Docker"
        exit 1
    fi
}

# Test the setup
test_setup() {
    print_status "Running setup tests..."
    node test-setup.js
}

# Show status
show_status() {
    echo ""
    echo "📊 Deployment Status:"
    echo "===================="
    
    # Check ChromaDB
    if curl -f http://localhost:8000/api/v1/heartbeat &> /dev/null; then
        echo "✅ ChromaDB: Running"
    else
        echo "❌ ChromaDB: Not running"
    fi
    
    # Check Application
    if curl -f http://localhost:3000/health &> /dev/null; then
        echo "✅ Application: Running"
    else
        echo "❌ Application: Not running"
    fi
    
    echo ""
    echo "🔗 URLs:"
    echo "  - Application: http://localhost:3000"
    echo "  - Health Check: http://localhost:3000/health"
    echo "  - ChromaDB: http://localhost:8000"
    echo ""
    echo "📚 API Endpoints:"
    echo "  - Upload: POST http://localhost:3000/api/ingestion/upload"
    echo "  - Batch Upload: POST http://localhost:3000/api/ingestion/batch"
    echo "  - Status: GET http://localhost:3000/api/ingestion/status"
    echo ""
}

# Main deployment function
deploy() {
    local mode=$1
    
    print_status "Starting deployment process..."
    
    # Pre-deployment checks
    check_docker
    check_node
    check_env
    install_deps
    create_dirs
    test_setup
    
    # Start database
    start_database
    
    # Start application based on mode
    if [ "$mode" = "docker" ]; then
        deploy_docker
    else
        start_app $mode
    fi
    
    # Show final status
    show_status
    
    print_status "Deployment completed successfully!"
}

# Show usage
usage() {
    echo "Usage: $0 [dev|prod|docker]"
    echo ""
    echo "Options:"
    echo "  dev     - Start in development mode (npm run dev)"
    echo "  prod    - Start in production mode (npm start)"
    echo "  docker  - Deploy with Docker Compose"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # Start in development mode"
    echo "  $0 docker   # Deploy with Docker"
    echo ""
}

# Main script logic
case "$1" in
    "dev"|"prod"|"docker")
        deploy $1
        ;;
    "test")
        test_setup
        ;;
    "status")
        show_status
        ;;
    *)
        usage
        exit 1
        ;;
esac 