import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Item = {
  id: string;
  name: string;
  category: string;
  stock_quantity: number | null;
  price: number | null;
  cost_price: number | null;
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Item State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Bisht');
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setItems(data);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setNewItemName(item.name || '');
    setNewItemCategory(item.category || 'Bisht');
    setNewItemStock(item.stock_quantity?.toString() || '0');
    setNewItemPrice(item.price?.toString() || '0');
    setNewItemCost(item.cost_price?.toString() || '0');
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setNewItemName('');
    setNewItemCategory('Bisht');
    setNewItemStock('');
    setNewItemPrice('');
    setNewItemCost('');
    setIsModalOpen(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemData = {
      name: newItemName,
      category: newItemCategory,
      stock_quantity: parseInt(newItemStock || '0'),
      price: parseFloat(newItemPrice || '0'),
      cost_price: parseFloat(newItemCost || '0')
    };

    if (editingItem) {
      const { error } = await supabase.from('items').update(itemData).eq('id', editingItem.id);
      if (!error) {
        resetForm();
        fetchItems();
      } else {
        alert("Error updating item: " + error.message);
      }
    } else {
      const { error } = await supabase.from('items').insert(itemData);
      if (!error) {
        resetForm();
        fetchItems();
      } else {
        alert("Error adding item: " + error.message);
      }
    }
  };

  const updateStock = async (id: string, currentStock: number, change: number) => {
    const newStock = Math.max(0, currentStock + change);
    const { error } = await supabase.from('items').update({ stock_quantity: newStock }).eq('id', id);
    if (!error) {
      setItems(items.map(item => item.id === id ? { ...item, stock_quantity: newStock } : item));
    }
  };

  const totalItems = items.reduce((sum, item) => sum + (item.stock_quantity ?? 0), 0);
  const lowStockCount = items.filter(item => (item.stock_quantity ?? 0) < 5).length;

  return (
    <div className="bg-surface text-slate-900 min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 space-y-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">inventory_2</span>
            <h1 className="text-xl font-bold tracking-tight text-primary">Stock</h1>
          </div>
          <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <p className="text-[10px] font-bold text-primary uppercase">Manager</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="flex w-full items-stretch rounded-lg h-10 overflow-hidden border border-slate-200 bg-white">
            <div className="text-slate-400 flex items-center justify-center pl-3">
              <span className="material-symbols-outlined text-lg">search</span>
            </div>
            <input 
              className="flex-1 border-none bg-transparent focus:ring-0 h-full text-sm placeholder:text-slate-400 px-3 outline-none" 
              placeholder="Search inventory..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
               <button onClick={() => setSearchQuery('')} className="pr-3 text-slate-400 flex items-center justify-center">
                 <span className="material-symbols-outlined text-lg">close</span>
               </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 pb-24">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-1 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Items</p>
            <p className="text-2xl font-bold text-primary">{totalItems}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col gap-1 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-red-600 font-bold">Low Stock</p>
            <p className="text-2xl font-bold text-red-700">{lowStockCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-1 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Unique</p>
            <p className="text-sm sm:text-2xl font-bold text-slate-700">{items.length} Products</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Current Stock</h2>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm hover:bg-primary/90 transition-all">
            <span className="material-symbols-outlined text-sm">add</span>
            Add New Item
          </button>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-500 py-8">Loading inventory...</p>
          ) : items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <p className="text-center text-slate-500 py-8">No items found.</p>
          ) : (
            items
              .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item) => (
              <div key={item.id} className={`flex items-center gap-4 border p-4 rounded-lg shadow-sm ${(item.stock_quantity ?? 0) < 5 ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <button onClick={() => openEditModal(item)} className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center p-1 rounded-full hover:bg-slate-100">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">{item.category} • OMR {(item.price ?? 0).toFixed(3)}</p>
                  <p className="text-[10px] text-primary/70 font-bold uppercase tracking-wider">Cost: OMR {(item.cost_price ?? 0).toFixed(3)}</p>
                  <p className={`text-[11px] font-medium mt-1 ${(item.stock_quantity ?? 0) < 5 ? 'text-red-600 font-bold' : 'text-primary'}`}>
                    {item.stock_quantity ?? 0} units remaining
                  </p>
                </div>
                <div className={`flex items-center gap-3 border rounded-full p-1 ${(item.stock_quantity ?? 0) < 5 ? 'bg-white border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <button onClick={() => updateStock(item.id, item.stock_quantity ?? 0, -1)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
                    <span className="material-symbols-outlined text-xl">remove</span>
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-slate-800">{item.stock_quantity ?? 0}</span>
                  <button onClick={() => updateStock(item.id, item.stock_quantity ?? 0, 1)} className="size-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-xl">add</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 shrink-0 bg-white border-t border-slate-100 px-6 pb-6 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-2xl">dashboard</span>
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>
          <button onClick={() => navigate('/inventory')} className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-2xl fill-[1]">inventory_2</span>
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

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Edit Item' : 'Register New Item'}</h3>
              <button onClick={() => resetForm()} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form className="p-6 space-y-4" onSubmit={handleAddItem}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Name</label>
                <input required value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all" placeholder="e.g. Royal Bisht" type="text" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all">
                    <option>Bisht</option>
                    <option>Khanjar</option>
                    <option>Massar</option>
                    <option>Accessory</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Initial Stock</label>
                  <input required value={newItemStock} onChange={e => setNewItemStock(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all" placeholder="0" type="number" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sell Price (OMR)</label>
                  <input required value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-bold" placeholder="0.00" type="number" step="0.001" />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost Price (OMR)</label>
                  <input required value={newItemCost} onChange={e => setNewItemCost(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-bold" placeholder="0.00" type="number" step="0.001" />
                </div>
              </div>
              
              <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-lg shadow-sm hover:bg-primary/90 transition-all mt-4">
                {editingItem ? 'Save Changes' : 'Complete Registration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
