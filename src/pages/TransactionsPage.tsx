import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Transaction = {
  id: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  type: string;
  status: string;
  created_at: string;
};

type ItemSummary = {
  name: string;
  totalQuantity: number;
  totalRevenue: number;
};

type TransactionItem = {
  id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  items: {
    name: string;
  };
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [itemSummaries, setItemSummaries] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'summary'>('history');

  // Filters State
  const [filterPeriod, setFilterPeriod] = useState<'Daily' | 'W' | 'M'>('Daily');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Modal State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txItems, setTxItems] = useState<TransactionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editType, setEditType] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [filterPeriod, filterDate]);

  const getDateRange = () => {
    const start = new Date(filterDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filterDate);
    end.setHours(23, 59, 59, 999);

    if (filterPeriod === 'W') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (filterPeriod === 'M') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    // Fetch Transactions
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (!txError && txData) {
      setTransactions(txData);
    } else {
      setTransactions([]);
    }

    // Fetch Item Aggregations for this specific period
    const { data: itemData, error: itemError } = await supabase
      .from('transaction_items')
      .select(`
        quantity, unit_price,
        created_at,
        items (name)
      `)
      .gte('created_at', start)
      .lte('created_at', end);

    if (!itemError && itemData) {
      const summaryMap: Record<string, ItemSummary> = {};
      
      itemData.forEach((row: any) => {
        const itemName = row.items?.name || 'Unknown Item';
        if (!summaryMap[itemName]) {
          summaryMap[itemName] = { name: itemName, totalQuantity: 0, totalRevenue: 0 };
        }
        summaryMap[itemName].totalQuantity += row.quantity;
        summaryMap[itemName].totalRevenue += row.quantity * row.unit_price;
      });

      setItemSummaries(Object.values(summaryMap).sort((a, b) => b.totalRevenue - a.totalRevenue));
    } else {
      setItemSummaries([]);
    }

    setLoading(false);
  };

  const openEditModal = async (tx: Transaction) => {
    setSelectedTx(tx);
    setEditStatus(tx.status);
    setEditType(tx.type);
    setEditDiscount(tx.discount.toString());
    setEditDate(new Date(tx.created_at).toISOString().split('T')[0]);
    setLoadingItems(true);

    const { data } = await supabase
      .from('transaction_items')
      .select(`
        id, quantity, unit_price,
        items (name)
      `)
      .eq('transaction_id', tx.id);
      
    if (data) setTxItems(data as unknown as TransactionItem[]);
    setLoadingItems(false);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const newDiscount = parseFloat(editDiscount || '0');
    const newTotal = selectedTx.subtotal - newDiscount;
    const newDate = new Date(editDate);
    // Keep the same time if possible, or just use midnight
    newDate.setHours(new Date(selectedTx.created_at).getHours());
    newDate.setMinutes(new Date(selectedTx.created_at).getMinutes());

    const { error } = await supabase
      .from('transactions')
      .update({ 
        status: editStatus, 
        type: editType,
        discount: newDiscount,
        total_amount: newTotal,
        created_at: newDate.toISOString()
      })
      .eq('id', selectedTx.id);

    if (!error) {
      // Re-fetch or update local state
      setTransactions(transactions.map(t => t.id === selectedTx.id ? { 
        ...t, 
        status: editStatus, 
        type: editType, 
        discount: newDiscount, 
        total_amount: newTotal,
        created_at: newDate.toISOString()
      } : t));
      setSelectedTx(null);
    } else {
      alert("Error updating transaction: " + error.message);
    }
  };

  return (
    <div className="bg-surface text-slate-900 min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 space-y-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">history</span>
            <h1 className="text-xl font-bold tracking-tight text-primary">Transactions</h1>
          </div>
          <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <p className="text-[10px] font-bold text-primary uppercase">Staff</p>
          </div>
        </div>

        {/* Date Filter Section */}
        <section className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
          <div className="flex p-1 bg-slate-200/50 rounded-lg">
            <button onClick={() => setFilterPeriod('Daily')} className={`flex-1 py-1 text-[10px] font-bold rounded-[6px] transition-all ${filterPeriod === 'Daily' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Daily</button>
            <button onClick={() => setFilterPeriod('W')} className={`flex-1 py-1 text-[10px] font-bold rounded-[6px] transition-all ${filterPeriod === 'W' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>W</button>
            <button onClick={() => setFilterPeriod('M')} className={`flex-1 py-1 text-[10px] font-bold rounded-[6px] transition-all ${filterPeriod === 'M' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>M</button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1.5 text-primary text-sm">calendar_today</span>
            <input 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="block w-full pl-7 pr-1 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold focus:ring-primary focus:border-primary text-slate-700 outline-none" 
              type="date" 
            />
          </div>
        </section>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm mx-auto">
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <span className="material-symbols-outlined text-lg">list_alt</span>
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('summary')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'summary' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <span className="material-symbols-outlined text-lg">analytics</span>
            Summary
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-28">
        {loading ? (
          <p className="text-center text-slate-500 py-8">Loading data...</p>
        ) : activeTab === 'history' ? (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">receipt_long</span>
                <p className="text-slate-500 font-bold">No transactions found.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  onClick={() => openEditModal(tx)}
                  className="bg-white border text-left w-full border-slate-200 p-4 rounded-xl shadow-sm hover:border-primary/40 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        tx.type === 'SALE' ? 'bg-green-100 text-green-700' : 
                        tx.type === 'RENT' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tx.type}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                        tx.status === 'COMPLETED' ? 'bg-blue-50 text-primary' : 
                        tx.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-bold">Order #{tx.id.substring(0,8).toUpperCase()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Amount</p>
                      <p className="text-lg font-bold text-slate-800">OMR {tx.total_amount.toFixed(2)}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
             {itemSummaries.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No item sales data yet.</p>
             ) : (
               itemSummaries.map((item, idx) => (
                 <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-lg">
                          {item.name.charAt(0)}
                       </div>
                       <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Sold: {item.totalQuantity}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-400 uppercase font-bold">Sales</p>
                       <p className="text-lg font-bold text-primary">OMR {item.totalRevenue.toFixed(2)}</p>
                    </div>
                 </div>
               ))
             )}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Edit Transaction</h3>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                <span className="material-symbols-outlined block">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="p-5">
              <div className="mb-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Order Items</p>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2 max-h-32 overflow-y-auto">
                  {loadingItems ? (
                    <p className="text-xs text-slate-400 text-center">Loading items...</p>
                  ) : txItems.length === 0 ? (
                     <p className="text-xs text-slate-400 text-center">No items found</p>
                  ) : (
                    txItems.map(item => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{item.quantity}x {item.items?.name || 'Unknown Item'}</span>
                        <span className="text-slate-500">OMR {item.unit_price}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-bold text-sm shadow-sm"
                  >
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                  <select 
                    value={editType} 
                    onChange={e => setEditType(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-bold text-sm shadow-sm"
                  >
                    <option value="SALE">SALE</option>
                    <option value="RENT">RENT</option>
                    <option value="RETURN">RETURN</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discount (OMR)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editDiscount}
                    onChange={e => setEditDiscount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-bold text-sm shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date of Purchase</label>
                  <input 
                    type="date" 
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-bold text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setSelectedTx(null)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-3 bg-primary text-white font-bold rounded-lg shadow-md shadow-primary/20 hover:bg-primary/90 transition-all">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
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
          <button onClick={() => navigate('/transactions')} className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-2xl fill-[1]">receipt_long</span>
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
