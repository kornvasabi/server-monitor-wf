const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'p@ssword',
    database: process.env.DB_NAME || 'server_monitor',
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections in the pool
    queueLimit: 0, // Unlimited queue for connection requests
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ Database connection established successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        throw error;
    }
}

// Execute a query with automatic connection handling
async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

// Get a connection from the pool for transactions
async function getConnection() {
    try {
        return await pool.getConnection();
    } catch (error) {
        console.error('Failed to get database connection:', error.message);
        throw error;
    }
}

// Close the connection pool (for graceful shutdown)
async function closePool() {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing connection pool:', error.message);
        throw error;
    }
}

// Export database utilities
module.exports = {
    pool,
    query,
    getConnection,
    testConnection,
    closePool
};
