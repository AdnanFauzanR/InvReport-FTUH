-- Ekstensi untuk UUID dan hashing password
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM Types
DO $$ BEGIN
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
END $$;

DO $$ BEGIN
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_enum') THEN
    CREATE TYPE location_enum AS ENUM ('In Room', 'Out Room');
  END IF;
END $$;

DO $$ BEGIN
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_enum') THEN
    CREATE TYPE priority_enum AS ENUM ('Prioritas Tinggi', 'Prioritas Sedang', 'Prioritas Rendah');
  END IF;
END $$;

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
    username VARCHAR(100) NOT NULL UNIQUE, 
    email VARCHAR(100) NOT NULL UNIQUE,
    division division_enum NOT NULL,
    role role_enum NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Skills
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL 
);

-- Tabel Technician Skill (diperbaiki penulisan dan constraint)
CREATE TABLE technician_skill (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    technician_uuid UUID NOT NULL,
    skill_uuid UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_technician_skill_uuid FOREIGN KEY (skill_uuid) REFERENCES skills(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_technician_users FOREIGN KEY (technician_uuid) REFERENCES users(uuid) ON DELETE CASCADE
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
    location location_enum NOT NULL,
    in_room_uuid UUID,
    out_room TEXT,
    description TEXT,
    technician_uuid UUID,
    progress_uuid UUID,
    report_files TEXT NOT NULL,
    report_url TEXT NOT NULL,
    ticket VARCHAR(50),
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    priority priority_enum NOT NULL,
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
    status status_enum NOT NULL,
    technician_uuid UUID,
    external_technician VARCHAR(100),
    description TEXT,
    documentation TEXT NOT NULL,
    documentation_url TEXT NOT NULL,
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

-- Function & Trigger Audit Logs
CREATE FUNCTION log_audit() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (changed_by, table_name, operation, query_text)
    VALUES (current_user, TG_TABLE_NAME, TG_OP, 'Modified Record: ' || current_user);
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

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
