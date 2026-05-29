const { query } = require('../database/db');

// Get historical CPU metrics
async function getCpuHistory(serverId, hours = 1) {
    try {
        const sql = `
            SELECT 
                timestamp,
                usage_percent,
                load_avg_1m,
                load_avg_5m,
                load_avg_15m
            FROM metrics_cpu
            WHERE server_id = ?
                AND timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY timestamp ASC
        `;
        return await query(sql, [serverId, hours]);
    } catch (error) {
        console.error('Error fetching CPU history:', error.message);
        throw error;
    }
}

// Get historical RAM metrics
async function getRamHistory(serverId, hours = 1) {
    try {
        const sql = `
            SELECT 
                timestamp,
                total_gb,
                used_gb,
                free_gb,
                usage_percent
            FROM metrics_ram
            WHERE server_id = ?
                AND timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY timestamp ASC
        `;
        return await query(sql, [serverId, hours]);
    } catch (error) {
        console.error('Error fetching RAM history:', error.message);
        throw error;
    }
}

// Get historical Disk metrics
async function getDiskHistory(serverId, hours = 1) {
    try {
        const sql = `
            SELECT 
                timestamp,
                mount_point,
                filesystem,
                total_gb,
                used_gb,
                free_gb,
                usage_percent
            FROM metrics_disk
            WHERE server_id = ?
                AND timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY timestamp ASC
        `;
        return await query(sql, [serverId, hours]);
    } catch (error) {
        console.error('Error fetching Disk history:', error.message);
        throw error;
    }
}

// Get historical Service metrics
async function getServiceHistory(serverId, hours = 1) {
    try {
        const sql = `
            SELECT 
                timestamp,
                service_name,
                status,
                pid,
                cpu_percent,
                memory_mb,
                uptime_seconds
            FROM metrics_services
            WHERE server_id = ?
                AND timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY timestamp DESC
        `;
        return await query(sql, [serverId, hours]);
    } catch (error) {
        console.error('Error fetching Service history:', error.message);
        throw error;
    }
}

// Get latest metrics for all types
async function getLatestMetrics(serverId) {
    try {
        const [cpu] = await query(
            'SELECT * FROM metrics_cpu WHERE server_id = ? ORDER BY timestamp DESC LIMIT 1',
            [serverId]
        );
        
        const [ram] = await query(
            'SELECT * FROM metrics_ram WHERE server_id = ? ORDER BY timestamp DESC LIMIT 1',
            [serverId]
        );
        
        const disk = await query(
            'SELECT * FROM metrics_disk WHERE server_id = ? ORDER BY timestamp DESC LIMIT 10',
            [serverId]
        );
        
        const services = await query(
            'SELECT * FROM metrics_services WHERE server_id = ? ORDER BY timestamp DESC LIMIT 20',
            [serverId]
        );
        
        return {
            cpu: cpu || null,
            ram: ram || null,
            disk: disk || [],
            services: services || []
        };
    } catch (error) {
        console.error('Error fetching latest metrics:', error.message);
        throw error;
    }
}

// Get all servers
async function getAllServers() {
    try {
        return await query('SELECT id, hostname, ip_address, description, created_at FROM servers ORDER BY hostname');
    } catch (error) {
        console.error('Error fetching servers:', error.message);
        throw error;
    }
}

// Get server by ID
async function getServerById(serverId) {
    try {
        const servers = await query('SELECT * FROM servers WHERE id = ?', [serverId]);
        return servers[0] || null;
    } catch (error) {
        console.error('Error fetching server:', error.message);
        throw error;
    }
}

module.exports = {
    getCpuHistory,
    getRamHistory,
    getDiskHistory,
    getServiceHistory,
    getLatestMetrics,
    getAllServers,
    getServerById
};
