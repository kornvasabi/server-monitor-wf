require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { testConnection } = require('../database/db');
const {
    getCpuHistory,
    getRamHistory,
    getDiskHistory,
    getServiceHistory,
    getLatestMetrics,
    getAllServers,
    getServerById
} = require('./api');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuration
const PORT = parseInt(process.env.PORT) || 3000;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 5000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

// Get all servers
app.get('/api/servers', async (req, res) => {
    try {
        const servers = await getAllServers();
        res.json(servers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get server by ID
app.get('/api/servers/:id', async (req, res) => {
    try {
        const server = await getServerById(req.params.id);
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }
        res.json(server);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get latest metrics for a server
app.get('/api/metrics/latest/:serverId', async (req, res) => {
    try {
        const metrics = await getLatestMetrics(req.params.serverId);
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get CPU history
app.get('/api/metrics/cpu/:serverId', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 1;
        const data = await getCpuHistory(req.params.serverId, hours);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get RAM history
app.get('/api/metrics/ram/:serverId', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 1;
        const data = await getRamHistory(req.params.serverId, hours);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Disk history
app.get('/api/metrics/disk/:serverId', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 1;
        const data = await getDiskHistory(req.params.serverId, hours);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Service history
app.get('/api/metrics/services/:serverId', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 1;
        const data = await getServiceHistory(req.params.serverId, hours);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`✓ Client connected: ${socket.id}`);
    
    // Join a server-specific room
    socket.on('join-server', (serverId) => {
        socket.join(`server-${serverId}`);
        console.log(`✓ Socket ${socket.id} joined server-${serverId}`);
    });
    
    // Leave a server-specific room
    socket.on('leave-server', (serverId) => {
        socket.leave(`server-${serverId}`);
        console.log(`✓ Socket ${socket.id} left server-${serverId}`);
    });
    
    socket.on('disconnect', () => {
        console.log(`✗ Client disconnected: ${socket.id}`);
    });
});

// Broadcast latest metrics to connected clients
function broadcastMetrics(serverId, metrics) {
    io.to(`server-${serverId}`).emit('metrics-update', metrics);
}

// Poll database for latest metrics and broadcast
async function pollAndBroadcastMetrics() {
    try {
        const servers = await getAllServers();
        console.log(`[Poll] Found ${servers.length} servers`);
        
        for (const server of servers) {
            const metrics = await getLatestMetrics(server.id);
            if (metrics.cpu || metrics.ram || metrics.disk.length > 0) {
                console.log(`[Poll] Broadcasting metrics for server ${server.id}`);
                broadcastMetrics(server.id, metrics);
            } else {
                console.log(`[Poll] No metrics found for server ${server.id}`);
            }
        }
    } catch (error) {
        console.error('Error polling metrics:', error.message);
    }
}

// Start polling for metrics
setInterval(pollAndBroadcastMetrics, POLL_INTERVAL);

// Export broadcast function for use by collector
module.exports = { io, broadcastMetrics };

// Start server
async function startServer() {
    try {
        // Test database connection
        await testConnection();
        
        server.listen(PORT, () => {
            console.log('=== Server Monitor Web Server ===');
            console.log(`✓ Server running on http://localhost:${PORT}`);
            console.log(`✓ Socket.io ready for real-time updates`);
            console.log('\nPress Ctrl+C to stop\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down web server...');
    server.close(() => {
        console.log('✓ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n\nShutting down web server...');
    server.close(() => {
        console.log('✓ Server closed');
        process.exit(0);
    });
});

// Start the server
startServer();
