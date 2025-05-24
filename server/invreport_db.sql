
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
    progress_uuid UUID,
    report_files VARCHAR(255),
    report_url VARCHAR(255),
    ticket VARCHAR(50),
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
    documentation_url VARCHAR(255),
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

-- Hapus constraint CHECK dari tabel users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_division_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Buat ENUM untuk division
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_enum') THEN
    CREATE TYPE division_enum AS ENUM (
      'Fakultas', 
      'Gedung Arsitektur', 
      'Gedung Mesin', 
      'Gedung Sipil', 
      'Gedung Elektro', 
      'Gedung Geologi', 
      'Gedung Perkapalan',
      'Workshop'
    );
  END IF;
END$$;

-- Buat ENUM untuk role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE role_enum AS ENUM (
      'Admin', 
      'Sub-Admin', 
      'Workshop', 
      'Fakultas', 
      'Departemen', 
      'Teknisi', 
      'Kepala Workshop'
    );
  END IF;
END$$;

-- Ubah kolom di tabel users
ALTER TABLE users
ALTER COLUMN division TYPE division_enum USING division::division_enum,
ALTER COLUMN role TYPE role_enum USING role::role_enum;

-- =====================================================================

-- Untuk tabel reports
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_location_check;

-- Buat ENUM untuk lokasi
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_enum') THEN
    CREATE TYPE location_enum AS ENUM ('In Room', 'Out Room');
  END IF;
END$$;

-- Ubah kolom location dan tambah kolom baru
ALTER TABLE reports
ALTER COLUMN location TYPE location_enum USING location::location_enum,
ADD COLUMN latitude FLOAT NOT NULL,
ADD COLUMN longitude FLOAT NOT NULL;

-- Buat ENUM untuk prioritas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_enum') THEN
    CREATE TYPE priority_enum AS ENUM ('Prioritas Tinggi', 'Prioritas Sedang', 'Prioritas Rendah');
  END IF;
END$$;

ALTER TABLE reports
ADD COLUMN priority priority_enum NOT NULL;

-- =====================================================================

-- Untuk tabel progress_inventory_reports
ALTER TABLE progress_inventory_reports DROP CONSTRAINT IF EXISTS progress_inventory_reports_status_check;

-- Buat ENUM untuk status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
    CREATE TYPE status_enum AS ENUM (
      'Laporan Masuk',
      'Ditunda',
      'Ditunda - Menunggu Persediaan Alat',
      'Ditunda - Menunggu Persediaan Komponen',
      'Ditunda - Membutuhkan Teknisi Eksternal',
      'Pergantian Teknisi',
      'Alat Tidak Dapat Diperbaiki',
      'Menunggu Alat Baru',
      'Dalam Pengerjaan',
      'Selesai'
    );
  END IF;
END$$;

-- Ubah kolom status (perhatikan: sebelumnya tertulis location secara salah!)
ALTER TABLE progress_inventory_reports
ALTER COLUMN status TYPE status_enum USING status::status_enum;

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL 
);

ALTER TABLE technician_skill
ADD COLUMN skill_uuid UUID NOT NULL;

ALTER TABLE technician_skill
ADD CONSTRAINT fk_technician_skill_uuid
FOREIGN KEY (skill_uuid)
REFERENCES skills(uuid)
ON DELETE CASCADE;

ALTER TABLE technician_skill
DROP COLUMN skill_name;
