CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY,
  business_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  message_sent TEXT,
  status TEXT
);
