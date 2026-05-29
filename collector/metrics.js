const si = require('systeminformation');
const { query } = require('../database/db');

// Get or create server ID based on hostname
async function getServerId() {
    try {
        const hostname = await si.osInfo().then(info => info.hostname);
        
        // Check if server exists
        const existing = await query(
            'SELECT id FROM servers WHERE hostname = ?',
            [hostname]
        );
        
        if (existing.length > 0) {
            return existing[0].id;
        }
        
        // Create new server entry
        const result = await query(
            'INSERT INTO servers (hostname, ip_address, description) VALUES (?, ?, ?)',
            [hostname, 'localhost', 'Local monitoring server']
        );
        
        return result.insertId;
    } catch (error) {
        console.error('Error getting server ID:', error.message);
        throw error;
    }
}

// Fetch CPU metrics
async function getCpuMetrics() {
    try {
        const cpuLoad = await si.currentLoad();
        const cpu = await si.cpu();
        
        return {
            usage_percent: parseFloat(cpuLoad.currentLoad.toFixed(2)),
            load_avg_1m: parseFloat(cpuLoad.currentLoadUser.toFixed(2)),
            load_avg_5m: parseFloat(cpuLoad.currentLoadSystem.toFixed(2)),
            load_avg_15m: parseFloat(cpuLoad.currentLoadIdle.toFixed(2))
        };
    } catch (error) {
        console.error('Error fetching CPU metrics:', error.message);
        throw error;
    }
}

// Fetch RAM metrics
async function getRamMetrics() {
    try {
        const memory = await si.mem();
        
        return {
            total_gb: parseFloat((memory.total / 1073741824).toFixed(2)),
            used_gb: parseFloat((memory.used / 1073741824).toFixed(2)),
            free_gb: parseFloat((memory.free / 1073741824).toFixed(2)),
            usage_percent: parseFloat((memory.used / memory.total * 100).toFixed(2))
        };
    } catch (error) {
        console.error('Error fetching RAM metrics:', error.message);
        throw error;
    }
}

// Fetch Disk metrics
async function getDiskMetrics() {
    try {
        const fsSize = await si.fsSize();
        
        return fsSize.map(disk => ({
            mount_point: disk.mount,
            filesystem: disk.fs,
            total_gb: parseFloat((disk.size / 1073741824).toFixed(2)),
            used_gb: parseFloat((disk.used / 1073741824).toFixed(2)),
            free_gb: parseFloat((disk.available / 1073741824).toFixed(2)),
            usage_percent: parseFloat(disk.use.toFixed(2))
        }));
    } catch (error) {
        console.error('Error fetching Disk metrics:', error.message);
        throw error;
    }
}

// Insert CPU metrics into database
async function insertCpuMetrics(serverId, metrics) {
    try {
        const timestamp = new Date();
        await query(
            `INSERT INTO metrics_cpu 
             (server_id, usage_percent, load_avg_1m, load_avg_5m, load_avg_15m, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                serverId,
                metrics.usage_percent,
                metrics.load_avg_1m,
                metrics.load_avg_5m,
                metrics.load_avg_15m,
                timestamp
            ]
        );
        console.log(`✓ CPU metrics inserted: ${metrics.usage_percent}%`);
    } catch (error) {
        console.error('Error inserting CPU metrics:', error.message);
        throw error;
    }
}

// Insert RAM metrics into database
async function insertRamMetrics(serverId, metrics) {
    try {
        const timestamp = new Date();
        await query(
            `INSERT INTO metrics_ram 
             (server_id, total_gb, used_gb, free_gb, usage_percent, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                serverId,
                metrics.total_gb,
                metrics.used_gb,
                metrics.free_gb,
                metrics.usage_percent,
                timestamp
            ]
        );
        console.log(`✓ RAM metrics inserted: ${metrics.usage_percent}%`);
    } catch (error) {
        console.error('Error inserting RAM metrics:', error.message);
        throw error;
    }
}

// Insert Disk metrics into database
async function insertDiskMetrics(serverId, metricsArray) {
    try {
        const timestamp = new Date();
        
        for (const metrics of metricsArray) {
            await query(
                `INSERT INTO metrics_disk 
                 (server_id, mount_point, filesystem, total_gb, used_gb, free_gb, usage_percent, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    serverId,
                    metrics.mount_point,
                    metrics.filesystem,
                    metrics.total_gb,
                    metrics.used_gb,
                    metrics.free_gb,
                    metrics.usage_percent,
                    timestamp
                ]
            );
            console.log(`✓ Disk metrics inserted: ${metrics.mount_point} - ${metrics.usage_percent}%`);
        }
    } catch (error) {
        console.error('Error inserting Disk metrics:', error.message);
        throw error;
    }
}

// Fetch Service metrics
async function getServiceMetrics() {
    try {
        const services = await si.services('*');
        const targetServices = ['nginx', 'node', 'php', 'mysql', 'mariadb', 'apache', 'postgresql', 'redis', 'mongodb'];
        
        const serviceStatus = [];
        
        for (const target of targetServices) {
            const found = services.find(s => 
                s.name.toLowerCase().includes(target) || 
                s.name.toLowerCase().includes(target.replace('mysql', 'mysqld'))
            );
            
            if (found) {
                serviceStatus.push({
                    service_name: target,
                    status: found.running ? 'running' : 'stopped',
                    pid: found.pid || null,
                    cpu_percent: found.pcpu ? parseFloat(found.pcpu.toFixed(2)) : null,
                    memory_mb: found.pmem ? parseFloat(found.pmem.toFixed(2)) : null,
                    uptime_seconds: found.uptime || null
                });
            } else {
                // Service not found, mark as unknown
                serviceStatus.push({
                    service_name: target,
                    status: 'unknown',
                    pid: null,
                    cpu_percent: null,
                    memory_mb: null,
                    uptime_seconds: null
                });
            }
        }
        
        return serviceStatus;
    } catch (error) {
        console.error('Error fetching Service metrics:', error.message);
        // Return default unknown status for all services on error
        return ['nginx', 'node', 'php', 'mysql', 'mariadb', 'apache', 'postgresql', 'redis', 'mongodb'].map(s => ({
            service_name: s,
            status: 'unknown',
            pid: null,
            cpu_percent: null,
            memory_mb: null,
            uptime_seconds: null
        }));
    }
}

// Insert Service metrics into database
async function insertServiceMetrics(serverId, servicesArray) {
    try {
        const timestamp = new Date();
        
        for (const service of servicesArray) {
            await query(
                `INSERT INTO metrics_services 
                 (server_id, service_name, status, pid, cpu_percent, memory_mb, uptime_seconds, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    serverId,
                    service.service_name,
                    service.status,
                    service.pid,
                    service.cpu_percent,
                    service.memory_mb,
                    service.uptime_seconds,
                    timestamp
                ]
            );
            console.log(`✓ Service metrics inserted: ${service.service_name} - ${service.status}`);
        }
    } catch (error) {
        console.error('Error inserting Service metrics:', error.message);
        throw error;
    }
}

// Collect and insert all metrics
async function collectAllMetrics(serverId) {
    try {
        const cpuMetrics = await getCpuMetrics();
        await insertCpuMetrics(serverId, cpuMetrics);
        
        const ramMetrics = await getRamMetrics();
        await insertRamMetrics(serverId, ramMetrics);
        
        const diskMetrics = await getDiskMetrics();
        await insertDiskMetrics(serverId, diskMetrics);
        
        const serviceMetrics = await getServiceMetrics();
        await insertServiceMetrics(serverId, serviceMetrics);
        
        return {
            cpu: cpuMetrics,
            ram: ramMetrics,
            disk: diskMetrics,
            services: serviceMetrics
        };
    } catch (error) {
        console.error('Error collecting metrics:', error.message);
        throw error;
    }
}

module.exports = {
    getServerId,
    getCpuMetrics,
    getRamMetrics,
    getDiskMetrics,
    getServiceMetrics,
    insertCpuMetrics,
    insertRamMetrics,
    insertDiskMetrics,
    insertServiceMetrics,
    collectAllMetrics
};
