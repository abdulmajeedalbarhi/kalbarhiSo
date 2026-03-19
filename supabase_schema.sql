-- 1. Create Items Table (Inventory)
CREATE TABLE public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock_quantity INT NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Transactions Table (Cashier)
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('SALE', 'RENT', 'RETURN', 'CANCELLED')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_by UUID REFERENCES auth.users, -- The cashier who made this transaction
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Transaction Items Join Table
CREATE TABLE public.transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions ON DELETE CASCADE,
  item_id UUID REFERENCES public.items,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Setup Row Level Security (RLS) policies [Note: we can test by disabling RLS for now or enable for auth]
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Temporary public policies for quick testing (Only logged-in users can CRUD)
CREATE POLICY "Enable read access for authenticated users" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for authenticated users" ON public.items FOR DELETE TO authenticated USING (true);

-- Same for transactions
CREATE POLICY "Enable all for authenticated users" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.transaction_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Migration: Add cost_price to items if it doesn't already exist
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 3) DEFAULT 0.000;
