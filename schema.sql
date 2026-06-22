-- Drop existing tables (safe for re-init)
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS admin;

-- Products table (cakes, brownies, pastries, cupcakes)
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'Cake', 'Brownie', 'Pastry', 'Cupcake'
  description TEXT,
  price_1pound INTEGER,             -- price in PKR for 1 pound
  price_2pound INTEGER,             -- price in PKR for 2 pound (NULL if N/A)
  price_per_piece INTEGER,          -- for brownies/pastries/cupcakes
  image_url TEXT,
  available INTEGER DEFAULT 1,      -- 1 = available, 0 = hidden
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT UNIQUE NOT NULL,         -- e.g. CS-2025-0001
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  city TEXT NOT NULL,                       -- restricted to allowed cities
  items TEXT NOT NULL,                      -- JSON string of cart
  total_amount INTEGER NOT NULL,            -- in PKR
  delivery_date TEXT,
  notes TEXT,
  payment_method TEXT NOT NULL,             -- 'Bank', 'EasyPaisa', 'COD'
  sender_name TEXT,
  sender_number TEXT,
  payment_screenshot TEXT,                  -- Cloudinary URL
  status TEXT DEFAULT 'Pending',            -- Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled
  admin_message TEXT,                       -- message owner sends to customer
  estimated_time TEXT,                      -- e.g. "Today 6:00 PM"
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Admin credentials (single owner)
CREATE TABLE admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL                    -- store hashed in production
);

-- Default admin (CHANGE THESE AFTER LOGIN)
INSERT INTO admin (username, password) VALUES ('admin', 'cakestudio123');

-- Sample products from the menu
INSERT INTO products (name, category, description, price_1pound, price_2pound, image_url) VALUES
('Vanilla Cake', 'Cake', 'Soft vanilla sponge with cream', 1200, 2000, ''),
('Chocolate Cake', 'Cake', 'Rich chocolate flavour', 1200, 2000, ''),
('Strawberry Cake', 'Cake', 'Fresh strawberry delight', 1200, 2000, ''),
('Caramel Cake', 'Cake', 'Sweet caramel layers', 1200, 2000, ''),
('Pineapple Cake', 'Cake', 'Tropical pineapple cream', 1400, 2200, ''),
('Black Forest', 'Cake', 'Classic black forest cake', 1400, 2200, ''),
('Double Chocolate', 'Cake', 'Double layer chocolate', 1400, 2200, ''),
('Three Milk', 'Cake', 'Tres leches premium', NULL, 2300, ''),
('Red Velvet', 'Cake', 'Velvety red premium cake', NULL, 2500, '');

INSERT INTO products (name, category, description, price_per_piece, image_url) VALUES
('Brownies', 'Brownie', 'Fudgy chocolate brownies (min 4 pcs)', 180, ''),
('Pastries', 'Pastry', 'Assorted pastries (min 4 pcs)', 150, ''),
('Cupcakes', 'Cupcake', 'Decorated cupcakes (min 4 pcs)', 150, '');
