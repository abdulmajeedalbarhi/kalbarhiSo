import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Item = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
};

type CartItem = {
  item: Item;
  quantity: number;
  discountPct: number;
  type: 'SELL' | 'RENT';
};

export default function CashierPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('name');
    if (data) setItems(data);
  };

  const updateCart = (item: Item, change: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + change);
        if (newQty === 0) return prev.filter(c => c.item.id !== item.id);
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: newQty } : c);
      } else if (change > 0) {
        return [...prev, { item, quantity: 1, discountPct: 0, type: 'SELL' }];
      }
      return prev;
    });
  };

  const updateCartSetting = (itemId: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(c => c.item.id === itemId ? { ...c, ...updates } : c));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const completeTransaction = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    const subtotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    const discount = cart.reduce((sum, c) => sum + (c.item.price * c.quantity * (c.discountPct / 100)), 0);
    const total = subtotal - discount;

    // Determine overall type
    const hasSell = cart.some(c => c.type === 'SELL');
    const hasRent = cart.some(c => c.type === 'RENT');
    const txType = hasSell && hasRent ? 'SALE' : (hasSell ? 'SALE' : 'RENT'); // simplified

    const txDate = new Date(transactionDate);
    // Keep local time if they just picked a date today
    const now = new Date();
    if (transactionDate === now.toISOString().split('T')[0]) {
      txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    try {
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          type: txType,
          status: 'COMPLETED',
          subtotal,
          discount,
          total_amount: total,
          created_at: txDate.toISOString()
        })
        .select()
        .single();
      
      if (txError) throw txError;

      const txItems = cart.map(c => ({
        transaction_id: tx.id,
        item_id: c.item.id,
        quantity: c.quantity,
        unit_price: c.item.price,
        discount: c.item.price * c.quantity * (c.discountPct / 100),
        created_at: txDate.toISOString()
      }));

      const { error: txItemsError } = await supabase.from('transaction_items').insert(txItems);
      if (txItemsError) throw txItemsError;

      // Update Stock counts
      for (const c of cart) {
        if (c.type === 'SELL') {
          const newStock = Math.max(0, c.item.stock_quantity - c.quantity);
          await supabase.from('items').update({ stock_quantity: newStock }).eq('id', c.item.id);
        }
      }

      setCart([]);
      fetchItems();
      alert("Transaction Completed Successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const subtotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const totalDiscount = cart.reduce((sum, c) => sum + (c.item.price * c.quantity * (c.discountPct / 100)), 0);
  const finalTotal = subtotal - totalDiscount;

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-background-light text-slate-900 min-h-screen pb-32 font-display">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="flex items-center p-4 justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-primary">Albarhi Sohar</h1>
          </div>
          <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <p className="text-[10px] font-bold text-primary uppercase">New Order</p>
          </div>
        </div>
        
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-primary font-bold">
                <span className="material-symbols-outlined text-xl">calendar_month</span>
              </div>
              <input 
                className="bg-surface border border-slate-200 text-slate-900 text-sm rounded-lg block w-full pl-10 p-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold" 
                type="date" 
                value={transactionDate} 
                onChange={(e) => setTransactionDate(e.target.value)} 
              />
            </div>
          </div>
        </div>
      </header>
      
      <section className="p-4 space-y-4">
        <div className="relative">
          <div className="flex w-full items-stretch rounded-lg h-12 overflow-hidden border border-slate-200 bg-surface">
            <div className="text-slate-400 flex items-center justify-center pl-4">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input 
              className="flex-1 border-none bg-transparent focus:ring-0 h-full placeholder:text-slate-400 px-4 outline-none" 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>
      
      <main className="px-4 space-y-2">
        {filteredItems.map(item => {
          const cartData = cart.find(c => c.item.id === item.id);
          const qty = cartData?.quantity || 0;
          
          return (
            <div key={item.id} className={`bg-white rounded-xl border ${qty > 0 ? 'border-primary shadow-sm bg-primary/5' : 'border-slate-200 shadow-sm'} p-2.5 transition-all`}>
              <div className="flex items-center gap-3">
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 truncate">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-primary font-bold text-xs">OMR {item.price.toFixed(3)}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Stock: {item.stock_quantity}</p>
                  </div>
                </div>

                {/* Sell/Rent Toggle */}
                {qty > 0 && cartData && (
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                    <button onClick={() => updateCartSetting(item.id, { type: 'SELL' })} className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${cartData.type === 'SELL' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}>SELL</button>
                    <button onClick={() => updateCartSetting(item.id, { type: 'RENT' })} className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${cartData.type === 'RENT' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}>RENT</button>
                  </div>
                )}

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateCart(item, -1)} className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-primary bg-white hover:bg-slate-50">
                    <span className="material-symbols-outlined text-base">remove</span>
                  </button>
                  <span className="w-5 text-center font-bold text-sm text-slate-900">{qty}</span>
                  <button onClick={() => updateCart(item, 1)} className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-primary bg-white hover:bg-slate-50">
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                </div>
              </div>

              {/* Discount & Delete (Only when in cart) */}
              {qty > 0 && cartData && (
                <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-slate-100/50">
                  <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">Discount %</span>
                    <div className="relative flex-1">
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-md text-[10px] py-1 pl-1.5 pr-1 outline-none font-bold" 
                        type="number"
                        value={cartData.discountPct || ''}
                        onChange={(e) => updateCartSetting(item.id, { discountPct: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filteredItems.length === 0 && <p className="text-center text-slate-500 py-4 italic text-sm">No items found.</p>}
      </main>
      
      {/* Transaction Summary */}
      {cart.length > 0 && (
        <section className="p-4 mt-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="font-bold text-lg text-slate-900">Transaction Summary</h2>
              <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-1 rounded-md uppercase border border-blue-100">{cart.length} Items</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">OMR {subtotal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Discounts</span>
                <span className="font-semibold text-red-600">- OMR {totalDiscount.toFixed(3)}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-end">
                <p className="text-xl font-bold text-slate-900">Total Payable</p>
                <p className="text-3xl font-black text-primary">OMR {finalTotal.toFixed(3)}</p>
              </div>
            </div>
            
            <button disabled={loading} onClick={completeTransaction} className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-transform uppercase tracking-wide disabled:opacity-50">
              {loading ? 'Processing...' : 'Complete Transaction'}
            </button>
          </div>
        </section>
      )}
      
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 shrink-0 bg-white border-t border-slate-100 px-6 pb-6 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-2xl">dashboard</span>
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>
          <button onClick={() => navigate('/inventory')} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-2xl">inventory_2</span>
            <span className="text-[10px] font-bold">Inventory</span>
          </button>
          <div className="relative -top-6">
            <button className="bg-primary text-white w-14 h-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center border-4 border-background-light active:scale-95 transition-transform" onClick={() => navigate('/cashier')}>
              <span className="material-symbols-outlined font-bold text-2xl">add</span>
            </button>
          </div>
          <button onClick={() => navigate('/transactions')} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
            <span className="text-[10px] font-bold">Transactions</span>
          </button>
          <button onClick={() => { supabase.auth.signOut(); navigate('/login'); }} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-2xl">logout</span>
            <span className="text-[10px] font-bold">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
