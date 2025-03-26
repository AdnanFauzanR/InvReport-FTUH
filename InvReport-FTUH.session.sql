ALTER TABLE progress_inventory_reports
ADD COLUMN documentation_url VARCHAR(255);

ALTER TABLE reports
ADD COLUMN report_url VARCHAR(255);

