-- Server Monitor Database Schema
-- Optimized for time-series data with MariaDB

CREATE DATABASE IF NOT EXISTS server_monitor;
USE server_monitor;

-- Servers table: stores server metadata
CREATE TABLE IF NOT EXISTS servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostname (hostname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CPU metrics table: stores CPU usage over time
CREATE TABLE IF NOT EXISTS metrics_cpu (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id INT NOT NULL,
    usage_percent DECIMAL(5,2) NOT NULL,
    load_avg_1m DECIMAL(5,2),
    load_avg_5m DECIMAL(5,2),
    load_avg_15m DECIMAL(5,2),
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    INDEX idx_server_timestamp (server_id, timestamp DESC),
    INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RAM metrics table: stores memory usage over time
CREATE TABLE IF NOT EXISTS metrics_ram (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id INT NOT NULL,
    total_gb DECIMAL(10,2) NOT NULL,
    used_gb DECIMAL(10,2) NOT NULL,
    free_gb DECIMAL(10,2) NOT NULL,
    usage_percent DECIMAL(5,2) NOT NULL,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    INDEX idx_server_timestamp (server_id, timestamp DESC),
    INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Disk metrics table: stores disk usage per mount point
CREATE TABLE IF NOT EXISTS metrics_disk (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id INT NOT NULL,
    mount_point VARCHAR(255) NOT NULL,
    filesystem VARCHAR(255),
    total_gb DECIMAL(10,2) NOT NULL,
    used_gb DECIMAL(10,2) NOT NULL,
    free_gb DECIMAL(10,2) NOT NULL,
    usage_percent DECIMAL(5,2) NOT NULL,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    INDEX idx_server_timestamp (server_id, timestamp DESC),
    INDEX idx_mount_point (mount_point),
    INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Services status table: stores service status over time
CREATE TABLE IF NOT EXISTS metrics_services (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id INT NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    status ENUM('running', 'stopped', 'unknown') NOT NULL,
    pid INT,
    cpu_percent DECIMAL(5,2),
    memory_mb DECIMAL(10,2),
    uptime_seconds INT,
    timestamp DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    INDEX idx_server_timestamp (server_id, timestamp DESC),
    INDEX idx_service_name (service_name),
    INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Partitioning for large datasets (uncomment if needed)
-- ALTER TABLE metrics_cpu PARTITION BY RANGE (TO_DAYS(timestamp)) (
--     PARTITION p_old VALUES LESS THAN (TO_DAYS('2024-01-01')),
--     PARTITION p_current VALUES LESS THAN MAXVALUE
-- );
