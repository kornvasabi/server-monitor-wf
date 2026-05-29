const { testConnection } = require('../database/db');
const { getServerId, collectAllMetrics } = require('./metrics');

// Configuration
const COLLECTION_INTERVAL = 5000; // 5 seconds

// Main collector function
async function startCollector() {
    console.log('=== Server Monitor Data Collector ===');
    console.log(`Collection interval: ${COLLECTION_INTERVAL / 1000} seconds`);
    
    try {
        // Test database connection
        await testConnection();
        
        // Get or create server ID
        const serverId = await getServerId();
        console.log(`✓ Server ID: ${serverId}`);
        
        // Initial collection
        console.log('\nStarting initial metrics collection...');
        await collectAllMetrics(serverId);
        
        // Set up interval for continuous collection
        setInterval(async () => {
            try {
                console.log('\n--- Collecting metrics ---');
                await collectAllMetrics(serverId);
            } catch (error) {
                console.error('Error in collection interval:', error.message);
            }
        }, COLLECTION_INTERVAL);
        
        console.log('\n✓ Data collector started successfully');
        console.log('Press Ctrl+C to stop\n');
        
    } catch (error) {
        console.error('Failed to start collector:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down data collector...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\nShutting down data collector...');
    process.exit(0);
});

// Start the collector
startCollector();
