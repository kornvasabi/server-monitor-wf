# Server Monitor Dashboard

A comprehensive, production-ready real-time server monitoring dashboard built with Node.js, Express, Socket.io, MariaDB, TailwindCSS, and Chart.js.

## Features

- **Real-time Monitoring**: Tracks CPU, RAM, and Disk usage every 5 seconds
- **Historical Data**: Stores metrics in MariaDB with optimized time-series schema
- **Live Dashboard**: Modern dark mode UI with real-time updates via Socket.io
- **Interactive Charts**: Line charts for CPU and RAM usage history
- **Disk Alerts**: Visual progress bars that turn red when disk usage exceeds 80%
- **Multi-server Support**: Monitor multiple servers from a single dashboard
- **REST API**: Fetch historical data for custom time ranges (1h, 6h, 24h)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MariaDB with mysql2/promise
- **Real-time**: Socket.io
- **Frontend**: Vanilla HTML/JS, TailwindCSS, Chart.js
- **System Monitoring**: systeminformation package

## Project Structure

```
server-monitor-wf/
├── database/
│   ├── schema.sql          # MariaDB database schema
│   └── db.js               # Database connection utility
├── collector/
│   ├── metrics.js          # Metric collection functions
│   └── index.js            # Data collector entry point
├── server/
│   ├── api.js              # REST API functions
│   └── index.js            # Express server with Socket.io
├── public/
│   ├── index.html          # Dashboard UI
│   └── app.js              # Frontend JavaScript
├── package.json
└── README.md
```

## Setup Instructions

### 1. Database Setup

```bash
# Create MariaDB database and run schema
mysql -u root -p < database/schema.sql
```

Or manually execute the SQL in `database/schema.sql`.

### 2. Configure Database Connection

Edit `database/db.js` to set your database credentials:

```javascript
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'p@ssword',
    database: process.env.DB_NAME || 'server_monitor',
    // ...
};
```

Or use environment variables:

```bash
# Windows (PowerShell)
$env:DB_HOST="localhost"
$env:DB_PORT="3307"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
$env:DB_NAME="server_monitor"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

**Option 1: Run collector and server separately**

```bash
# Terminal 1 - Start data collector
npm run collector

# Terminal 2 - Start web server
npm run server
```

**Option 2: Run both concurrently**

```bash
npm run dev
```

### 5. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

## API Endpoints

- `GET /api/servers` - List all monitored servers
- `GET /api/servers/:id` - Get server details
- `GET /api/metrics/latest/:serverId` - Get latest metrics
- `GET /api/metrics/cpu/:serverId?hours=1` - Get CPU history
- `GET /api/metrics/ram/:serverId?hours=1` - Get RAM history
- `GET /api/metrics/disk/:serverId?hours=1` - Get Disk history

## Socket.io Events

- `join-server` - Join a server-specific room for real-time updates
- `leave-server` - Leave a server-specific room
- `metrics-update` - Receive real-time metric updates

## Configuration

### Collector Interval

Edit `collector/index.js` to change the collection interval:

```javascript
const COLLECTION_INTERVAL = 5000; // 5 seconds (in milliseconds)
```

### Server Port

Edit `server/index.js` or use the PORT environment variable:

```bash
$env:PORT="3000"
```

## Database Schema

The schema is optimized for time-series data with composite indexes on `(server_id, timestamp DESC)` for efficient historical queries.

Tables:
- `servers` - Server metadata
- `metrics_cpu` - CPU usage and load averages
- `metrics_ram` - Memory usage statistics
- `metrics_disk` - Disk usage per mount point

## Troubleshooting

### Database Connection Failed

- Verify MariaDB is running
- Check database credentials in `database/db.js`
- Ensure the database exists: `CREATE DATABASE server_monitor;`

### No Data in Dashboard

- Ensure the data collector is running
- Check the collector logs for errors
- Verify data is being inserted into the database

### Socket.io Not Connecting

- Ensure the web server is running
- Check browser console for errors
- Verify firewall settings allow WebSocket connections

## License

ISC
