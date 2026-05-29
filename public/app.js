// Global variables
let socket;
let currentServerId = null;
let currentTimeRange = 1;
let cpuChart, ramChart;

// Initialize Socket.io connection
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('metrics-update', (metrics) => {
        console.log('Received metrics-update:', metrics);
        updateDashboard(metrics);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Initialize charts
function initCharts() {
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    const ramCtx = document.getElementById('ramChart').getContext('2d');
    
    // CPU Chart
    cpuChart = new Chart(cpuCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CPU Usage (%)',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
    
    // RAM Chart
    ramChart = new Chart(ramCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'RAM Usage (%)',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Fetch servers
async function fetchServers() {
    try {
        const response = await fetch('/api/servers');
        const servers = await response.json();
        
        const select = document.getElementById('serverSelect');
        select.innerHTML = '';
        
        if (servers.length === 0) {
            select.innerHTML = '<option value="">No servers available</option>';
            return;
        }
        
        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.id;
            option.textContent = `${server.hostname} (${server.ip_address || 'N/A'})`;
            select.appendChild(option);
        });
        
        // Select first server
        if (servers.length > 0) {
            select.value = servers[0].id;
            currentServerId = servers[0].id;
            joinServerRoom(currentServerId);
            loadHistoricalData(currentServerId);
        }
        
        select.addEventListener('change', (e) => {
            currentServerId = parseInt(e.target.value);
            if (currentServerId) {
                joinServerRoom(currentServerId);
                loadHistoricalData(currentServerId);
            }
        });
    } catch (error) {
        console.error('Error fetching servers:', error);
    }
}

// Join server room for real-time updates
function joinServerRoom(serverId) {
    if (socket) {
        socket.emit('join-server', serverId);
    }
}

// Load historical data
async function loadHistoricalData(serverId) {
    if (!serverId) return;
    
    try {
        // Fetch CPU history
        const cpuResponse = await fetch(`/api/metrics/cpu/${serverId}?hours=${currentTimeRange}`);
        const cpuData = await cpuResponse.json();
        
        // Fetch RAM history
        const ramResponse = await fetch(`/api/metrics/ram/${serverId}?hours=${currentTimeRange}`);
        const ramData = await ramResponse.json();
        
        // Fetch disk history
        const diskResponse = await fetch(`/api/metrics/disk/${serverId}?hours=${currentTimeRange}`);
        const diskData = await diskResponse.json();
        
        // Fetch service history
        const serviceResponse = await fetch(`/api/metrics/services/${serverId}?hours=${currentTimeRange}`);
        const serviceData = await serviceResponse.json();
        
        // Update charts
        updateCharts(cpuData, ramData);
        
        // Update disk progress bars
        updateDiskProgressBars(diskData);
        
        // Update service status
        updateServiceStatus(serviceData);
        
        // Fetch latest metrics
        const latestResponse = await fetch(`/api/metrics/latest/${serverId}`);
        const latestMetrics = await latestResponse.json();
        
        // Update dashboard with latest metrics
        updateDashboard(latestMetrics);
        
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

// Update charts with historical data
function updateCharts(cpuData, ramData) {
    // Update CPU chart
    cpuChart.data.labels = cpuData.map(d => formatTime(d.timestamp));
    cpuChart.data.datasets[0].data = cpuData.map(d => d.usage_percent);
    cpuChart.update('none');
    
    // Update RAM chart
    ramChart.data.labels = ramData.map(d => formatTime(d.timestamp));
    ramChart.data.datasets[0].data = ramData.map(d => d.usage_percent);
    ramChart.update('none');
}

// Update dashboard with latest metrics
function updateDashboard(metrics) {
    console.log('updateDashboard called with:', metrics);
    
    if (!metrics || !metrics.cpu || !metrics.ram) {
        console.log('Metrics missing cpu or ram data');
        return;
    }
    
    // Update CPU
    const cpuPercent = parseFloat(metrics.cpu.usage_percent);
    document.getElementById('cpuValue').textContent = `${cpuPercent.toFixed(1)}%`;
    document.getElementById('loadAvg').textContent = 
        `${parseFloat(metrics.cpu.load_avg_1m || 0).toFixed(2)}, ${parseFloat(metrics.cpu.load_avg_5m || 0).toFixed(2)}, ${parseFloat(metrics.cpu.load_avg_15m || 0).toFixed(2)}`;
    updateStatus('cpuStatus', cpuPercent);
    
    // Update RAM
    const ramPercent = parseFloat(metrics.ram.usage_percent);
    document.getElementById('ramValue').textContent = `${ramPercent.toFixed(1)}%`;
    document.getElementById('ramUsed').textContent = parseFloat(metrics.ram.used_gb).toFixed(2);
    document.getElementById('ramTotal').textContent = parseFloat(metrics.ram.total_gb).toFixed(2);
    updateStatus('ramStatus', ramPercent);
    
    // Update Disk (primary mount)
    if (metrics.disk && metrics.disk.length > 0) {
        const primaryDisk = metrics.disk[0];
        const diskPercent = parseFloat(primaryDisk.usage_percent);
        document.getElementById('diskValue').textContent = `${diskPercent.toFixed(1)}%`;
        document.getElementById('diskMount').textContent = primaryDisk.mount_point;
        updateStatus('diskStatus', diskPercent);
        
        // Update disk progress bars
        updateDiskProgressBars(metrics.disk);
    }
    
    // Update Services
    if (metrics.services && metrics.services.length > 0) {
        updateServiceStatus(metrics.services);
    }
    
    // Update timestamp
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
}

// Update status indicator
function updateStatus(elementId, value) {
    const element = document.getElementById(elementId);
    element.className = 'px-3 py-1 rounded-full text-sm font-medium';
    
    if (value >= 90) {
        element.classList.add('bg-red-500/20', 'text-red-400');
        element.textContent = 'Critical';
    } else if (value >= 80) {
        element.classList.add('bg-yellow-500/20', 'text-yellow-400');
        element.textContent = 'Warning';
    } else {
        element.classList.add('bg-green-500/20', 'text-green-400');
        element.textContent = 'Normal';
    }
}

// Update service status cards
function updateServiceStatus(servicesData) {
    const container = document.getElementById('serviceStatus');
    
    if (!servicesData || servicesData.length === 0) {
        container.innerHTML = '<p class="text-slate-400">No service data available</p>';
        return;
    }
    
    // Get latest entry for each service
    const latestServices = {};
    servicesData.forEach(service => {
        if (!latestServices[service.service_name] || new Date(service.timestamp) > new Date(latestServices[service.service_name].timestamp)) {
            latestServices[service.service_name] = service;
        }
    });
    
    container.innerHTML = '';
    
    Object.values(latestServices).forEach(service => {
        const status = service.status;
        let statusColor = 'bg-gray-500';
        let statusText = 'Unknown';
        let borderColor = 'border-gray-500';
        
        if (status === 'running') {
            statusColor = 'bg-green-500';
            statusText = 'Running';
            borderColor = 'border-green-500';
        } else if (status === 'stopped') {
            statusColor = 'bg-red-500';
            statusText = 'Stopped';
            borderColor = 'border-red-500';
        }
        
        const cpu = service.cpu_percent ? parseFloat(service.cpu_percent).toFixed(1) : '--';
        const memory = service.memory_mb ? parseFloat(service.memory_mb).toFixed(1) : '--';
        const uptime = service.uptime_seconds ? formatUptime(service.uptime_seconds) : '--';
        
        const html = `
            <div class="card rounded-lg p-4 border-l-4 ${borderColor}">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-lg font-semibold text-white capitalize">${service.service_name}</h3>
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor} text-white">${statusText}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-400">CPU: <span class="text-white">${cpu}%</span></div>
                    <div class="text-slate-400">Memory: <span class="text-white">${memory} MB</span></div>
                    <div class="text-slate-400 col-span-2">Uptime: <span class="text-white">${uptime}</span></div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Format uptime in human-readable format
function formatUptime(seconds) {
    if (!seconds) return '--';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Update disk progress bars
function updateDiskProgressBars(diskData) {
    const container = document.getElementById('diskProgressBars');
    
    if (!diskData || diskData.length === 0) {
        container.innerHTML = '<p class="text-slate-400">No disk data available</p>';
        return;
    }
    
    // Get latest entry for each mount point
    const latestDisks = {};
    diskData.forEach(disk => {
        if (!latestDisks[disk.mount_point] || new Date(disk.timestamp) > new Date(latestDisks[disk.mount_point].timestamp)) {
            latestDisks[disk.mount_point] = disk;
        }
    });
    
    container.innerHTML = '';
    
    Object.values(latestDisks).forEach(disk => {
        const percent = parseFloat(disk.usage_percent);
        let barColor = 'bg-blue-500';
        let textColor = 'text-blue-400';
        
        if (percent >= 90) {
            barColor = 'bg-red-500';
            textColor = 'text-red-400';
        } else if (percent >= 80) {
            barColor = 'bg-yellow-500';
            textColor = 'text-yellow-400';
        }
        
        const html = `
            <div class="disk-item">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-white font-medium">${disk.mount_point}</span>
                    <span class="${textColor} font-semibold">${percent.toFixed(1)}%</span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-3">
                    <div class="progress-bar ${barColor} h-3 rounded-full" style="width: ${percent}%"></div>
                </div>
                <div class="flex justify-between items-center mt-1 text-xs text-slate-400">
                    <span>${parseFloat(disk.used_gb).toFixed(2)} GB used</span>
                    <span>${parseFloat(disk.free_gb).toFixed(2)} GB free of ${parseFloat(disk.total_gb).toFixed(2)} GB</span>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Format time for chart labels
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Change time range
function changeTimeRange(hours) {
    currentTimeRange = hours;
    
    // Update button styles
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        if (parseInt(btn.dataset.hours) === hours) {
            btn.classList.remove('bg-slate-700');
            btn.classList.add('bg-blue-600');
        } else {
            btn.classList.remove('bg-blue-600');
            btn.classList.add('bg-slate-700');
        }
    });
    
    // Reload data
    if (currentServerId) {
        loadHistoricalData(currentServerId);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    initCharts();
    fetchServers();
});
