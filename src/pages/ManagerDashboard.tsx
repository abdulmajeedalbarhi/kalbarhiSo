import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Transaction = {
  id: string;
  type: string;
  status: string;
  subtotal: number;
  total_amount: number;
  created_at: string;
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [costOfSales, setCostOfSales] = useState(0);
  const [profit, setProfit] = useState(0);
  const [chartData, setChartData] = useState<{label: string, value: number}[]>([]);

  // Filters State
  const [filterPeriod, setFilterPeriod] = useState<'Daily' | 'W' | 'M'>('Daily');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchMetrics();
  }, [filterPeriod, filterDate]);

  const fetchMetrics = async () => {
    setLoading(true);
    
    // Create local range for the selected date
    const start = new Date(filterDate + 'T00:00:00');
    const end = new Date(filterDate + 'T23:59:59');

    if (filterPeriod === 'Daily') {
      // Keep today
    } else if (filterPeriod === 'W') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Initialize labels and chartMap regardless of errors
    const labels = [];
    const chartMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(filterDate + 'T12:00:00');
      d.setDate(d.getDate() - i);
      const l = d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().trim();
      labels.push(l);
      chartMap[l] = 0;
    }

    // 1. Fetch filtered transactions
    const { data: txs, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false });
      
    if (!error && txs) {
      setTransactions(txs);
    }

    // 2. Fetch detailed transaction items for Profit
    const { data: details, error: detailsError } = await supabase
      .from('transaction_items')
      .select(`
        quantity, unit_price, created_at,
        items!item_id (cost_price)
      `)
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    if (!detailsError && details) {
      let totalCost = 0;
      let totalAmount = 0;

      details.forEach((row: any) => {
        const costPrice = row.items?.cost_price ?? 0;
        const cost = costPrice * row.quantity;
        const amount = row.unit_price * row.quantity;
        
        totalCost += cost;
        totalAmount += amount;

        const day = new Date(row.created_at).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().trim();
        if (chartMap[day] !== undefined) {
          chartMap[day] += (amount - cost);
        }
      });

      setCostOfSales(totalCost);
      setProfit(totalAmount - totalCost);
      setTotalRevenue(totalAmount);
      setChartData(labels.map(l => ({ label: l, value: chartMap[l] })));
    } else {
      // Fallback if details query fails or returns nothing
      const { data: fallbackDetails } = await supabase
        .from('transaction_items')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO);
      
      if (fallbackDetails) {
         let totalAmount = 0;
         fallbackDetails.forEach(row => {
           const amount = (row.unit_price * row.quantity);
           totalAmount += amount;
           const day = new Date(row.created_at).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().trim();
           if (chartMap[day] !== undefined) chartMap[day] += amount;
         });
         setTotalRevenue(totalAmount);
         setProfit(totalAmount); 
         setCostOfSales(0);
         setChartData(labels.map(l => ({ label: l, value: chartMap[l] })));
      } else {
         setTotalRevenue(0);
         setProfit(0);
         setCostOfSales(0);
         setChartData(labels.map(l => ({ label: l, value: 0 })));
      }
    }

    setLoading(false);
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.round(diffHrs / 24)}d ago`;
  };

  return (
    <div className="bg-background-light font-display text-slate-900 min-h-screen flex flex-col pb-24">
      {/* Header Section */}
      <header className="sticky top-0 z-10 flex items-center bg-white p-4 border-b border-slate-200 justify-between shrink-0 shadow-sm">
        <h1 className="text-lg font-bold tracking-tight text-primary">Albarhi Sohar</h1>
        <div className="flex items-center gap-3">
          <button className="bg-slate-100 p-2 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors" onClick={() => fetchMetrics()}>
            <span className="material-symbols-outlined text-sm text-slate-500">refresh</span>
          </button>
          <button onClick={() => navigate('/staff')} className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1.5 rounded-full border border-blue-100 group">
            <span className="material-symbols-outlined text-primary text-sm">group_add</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Staff</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-5 flex flex-col">
        {/* Filter Section */}
        <section className="grid grid-cols-2 gap-3 shrink-0">
          <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button onClick={() => setFilterPeriod('Daily')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[6px] transition-all ${filterPeriod === 'Daily' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Daily</button>
            <button onClick={() => setFilterPeriod('W')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[6px] transition-all ${filterPeriod === 'W' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>W</button>
            <button onClick={() => setFilterPeriod('M')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[6px] transition-all ${filterPeriod === 'M' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>M</button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-primary text-base">calendar_today</span>
            <input 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="block w-full pl-10 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700 outline-none transition-all shadow-sm" 
              type="date" 
            />
          </div>
        </section>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm text-center">
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Gross Sales</p>
            <p className="text-lg font-black text-slate-800">OMR {totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-red-50/50 rounded-xl p-3 border border-red-100 shadow-sm text-center">
            <p className="text-[9px] uppercase tracking-wider text-red-500 font-bold mb-1">Total Cost</p>
            <p className="text-lg font-black text-red-600">OMR {costOfSales.toFixed(2)}</p>
          </div>
          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 shadow-sm text-center">
            <p className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold mb-1">Net Profit</p>
            <p className="text-lg font-black text-emerald-600">OMR {profit.toFixed(2)}</p>
          </div>
        </div>

        {/* Analytics Interactive Overview */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Profit Overview</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Weekly Performance</p>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500">Live View</span>
            </div>
          </div>
          
          <div className="flex items-end justify-between h-40 gap-3 group">
            {chartData.length > 0 ? (
              chartData.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar cursor-pointer">
                  <div className="relative w-full flex-1 flex flex-col justify-end">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 font-bold shadow-xl">
                      Profit: OMR {data.value.toFixed(2)}
                    </div>
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 group-hover/bar:scale-x-105 group-hover/bar:shadow-lg ${data.value >= 0 ? 'bg-primary shadow-sm' : 'bg-red-400'}`}
                      style={{ height: `${Math.max(data.value > 0 ? 10 : 0, Math.min(100, (Math.abs(data.value) / (Math.max(1, ...chartData.map(d => Math.abs(d.value)))) * 100)))}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 group-hover/bar:text-primary transition-colors uppercase">{data.label}</span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center h-full text-slate-300 italic text-xs">No chart data</div>
            )}
          </div>
          
          <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-base">trending_up</span>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">Margin: {profit > 0 ? ((profit/totalRevenue)*100).toFixed(0) : 0}%</p>
            </div>
            <button onClick={() => navigate('/transactions')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Transaction Details</button>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="space-y-4 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between shrink-0 px-1">
            <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <span className="material-symbols-outlined text-primary text-lg">history</span> Recent Activity
            </h2>
            <button onClick={() => navigate('/transactions')} className="text-primary text-[10px] whitespace-nowrap font-bold uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1">
            {loading ? (
               <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                 <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                 Refreshing...
               </div>
            ) : transactions.length === 0 ? (
               <div className="p-12 text-center text-slate-500 text-sm italic">No recent transactions</div>
            ) : (
              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[400px] [&::-webkit-scrollbar]:hidden">
                {transactions.map(tx => (
                  <div key={tx.id} onClick={() => navigate('/transactions')} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-all cursor-pointer group active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${tx.status === 'COMPLETED' ? 'bg-blue-50 text-primary border border-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                        <span className="material-symbols-outlined text-2xl">
                          {tx.type === 'SALE' ? 'shopping_bag' : 'event_repeat'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-slate-800 truncate mb-0.5">Order #{tx.id.substring(0,6).toUpperCase()}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-400 font-bold">{getTimeAgo(tx.created_at)}</p>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-tighter ${tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-slate-900 mb-0.5">{tx.total_amount.toFixed(2)} OMR</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{tx.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 shrink-0 bg-white border-t border-slate-100 px-6 pb-6 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-2xl fill-[1]">dashboard</span>
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
