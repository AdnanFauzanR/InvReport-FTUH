
-- Progress Pengerjaan 
-- Laporan Masuk, Identifikasi, Penanganan, dan Selesai

-- Data Gedung: COT, CSA, Classroom, Gedung Mesin, Gedung Sipil, Arsitektur, Gedung Elektro, Gedung Geologi, Masjid, Gedung Workshop, Gedung Perkapalan, Cafe Insinyur, Gedung X Indah Karya, TPS 3R, Power House, Techno Mart, Kantor Satpam, Gedung IPAL, Asrama Teknik  

-- Ekstensi untuk UUID dan hashing password
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabel Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    changed_by VARCHAR(50),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    query_text TEXT NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    division VARCHAR(50) NOT NULL CHECK (division IN ('Fakultas', 'Gedung Arsitektur', 'Gedung Mesin', 'Gedung Sipil', 'Gedung Elektro', 'Gedung Geologi', 'Gedung Perkapalan')),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Sub-Admin', 'Workshop', 'Fakultas', 'Departemen', 'Teknisi')),
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Building
CREATE TABLE building (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    building_name VARCHAR(100) NOT NULL UNIQUE
);

-- Tabel Reports
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    location VARCHAR(50) NOT NULL CHECK (location IN ('In Room', 'Out Room')),
    in_room_uuid UUID,
    out_room TEXT,
    description TEXT,
    technician_uuid UUID,
    report_files VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_reports_in_room FOREIGN KEY (in_room_uuid) REFERENCES building(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_reports_technician FOREIGN KEY (technician_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Tabel Progress Inventory Reports
CREATE TABLE progress_inventory_reports (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    report_uuid UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Laporan Masuk', 'Identifikasi', 'Penanganan Internal', 'Penanganan Eksternal', 'Pending', 'Selesai')),
    technician_uuid UUID,
    external_technician VARCHAR(100),
    description TEXT,
    documentation VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_progress_report FOREIGN KEY (report_uuid) REFERENCES reports(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_progress_technician FOREIGN KEY (technician_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Indexing
CREATE INDEX idx_reports_id ON reports(id);
CREATE INDEX idx_progress_reports_id ON progress_inventory_reports(id);
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_building_id ON building(id);

-- Function to write audit logs
CREATE FUNCTION log_audit() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (changed_by, table_name, operation, query_text)
    VALUES (current_user, TG_TABLE_NAME, TG_OP, 'Modified Record: ' || current_user);
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger to write audit logs for table reports
CREATE TRIGGER after_insert_reports
AFTER INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION log_audit();

CREATE TRIGGER after_update_reports
AFTER UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION log_audit();

CREATE TRIGGER after_delete_reports
AFTER DELETE ON reports
FOR EACH ROW
EXECUTE FUNCTION log_audit();

-- Trigger to write audit logs for table progress
CREATE TRIGGER after_insert_progress
AFTER INSERT ON progress_inventory_reports
FOR EACH ROW
EXECUTE FUNCTION log_audit();

CREATE TRIGGER after_update_progress
AFTER UPDATE ON progress_inventory_reports
FOR EACH ROW
EXECUTE FUNCTION log_audit();

CREATE TRIGGER after_delete_progress
AFTER DELETE ON progress_inventory_reports
FOR EACH ROW
EXECUTE FUNCTION log_audit();