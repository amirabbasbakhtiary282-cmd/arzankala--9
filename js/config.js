// Frontend Configuration
// UPDATE THIS URL AFTER RAILWAY DEPLOY
const CONFIG = {
    // Backend API URL - SET THIS AFTER RAILWAY DEPLOY
    // Example: 'https://arzankala-backend.railway.app/api'
    API_URL: 'https://arzankala-backend.onrender.com/api',
    
    // Auto-detect environment
    isLocalhost: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
    
    // Fallback to local data if no backend configured
    useLocalData: function() {
        return !this.API_URL || this.isLocalhost;
    }
};

// Export for use in other scripts
window.CONFIG = CONFIG;