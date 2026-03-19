import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function StaffManagementPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('cashier');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Phone validation for Oman (+968 or just 8 digits starting with 7 or 9)
    const phoneClean = phone.replace(/\s+/g, '');
    if (!phoneClean.startsWith('+968') && phoneClean.length !== 8) {
       setErrorMsg('Please enter a valid Oman phone number (e.g. 9XXXXXXX or +9689XXXXXXX)');
       setLoading(false);
       return;
    }

    // Use provided email or fallback to generated hidden email
    const authEmail = email.trim() !== '' ? email.trim() : `${username.toLowerCase().replace(/\s+/g, '')}@albarhi.com`;
    
    // In Supabase, signing up a new user from the client logs out the current user.
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: password,
      phone: phoneClean.startsWith('+968') ? phoneClean : `+968${phoneClean}`,
      options: {
        data: {
          role: role,
        }
      }
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      alert(`Staff member ${username} created successfully! For security, you have been logged out. Please instruct the new staff to log in.`);
      navigate('/login');
    }
  };

  return (
    <div className="bg-surface text-slate-900 min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight text-primary">Manage Staff</h1>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-24">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Add New Member</h2>
              <p className="text-xs text-slate-500">Create login credentials for a new cashier or manager.</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staff Username</label>
              <input 
                required 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-medium" 
                placeholder="e.g. Ahmed99" 
                type="text" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address (Optional)</label>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-medium" 
                placeholder="staff@albarhi.com" 
                type="email" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number (Oman)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+968</span>
                <input 
                  required 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace('+968', ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-medium" 
                  placeholder="9XXXXXXX" 
                  type="tel" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staff Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-medium appearance-none"
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign Password</label>
              <input 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-slate-900 transition-all font-medium" 
                placeholder="At least 6 characters" 
                type="password" 
                minLength={6}
              />
            </div>

            <button disabled={loading} type="submit" className="w-full mt-6 py-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
              {loading ? 'Processing...' : 'Create Account'}
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-3">Note: Creating a new account will log you out of your current session.</p>
          </form>
        </div>
      </main>
    </div>
  );
}
