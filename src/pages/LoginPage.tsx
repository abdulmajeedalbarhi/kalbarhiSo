import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    // Support Username or Email
    let authEmail = username;
    if (!authEmail.includes('@')) {
      // Generalize any username to a dummy email for Supabase Auth
      authEmail = `${username.toLowerCase().replace(/\s+/g, '')}@albarhi.com`;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) {
      if (error.message.includes('Invalid login') && username.toLowerCase() === 'abdulmajeed') {
        // Auto-signup the ADMIN user on first run (bypass)
        const { error: signUpErr } = await supabase.auth.signUp({ email: authEmail, password });
        if (!signUpErr) {
           navigate('/dashboard');
           return;
        }
      }
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    let authEmail = username;
    if (username.toLowerCase() === 'abdulmajeed') authEmail = 'abdulmajeed@admin.com';
    
    if (!authEmail || !password) {
      setErrorMsg('Enter username/email and password above to register');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signUp({ email: authEmail, password });
    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg('Successfully registered! You can now sign in.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-background-light font-display text-slate-900 min-h-screen flex flex-col pt-12">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">diamond</span>
          <span className="font-bold text-lg tracking-tight uppercase text-primary">Albarhi Sohar</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-slate-600 text-sm">language</span>
          <span className="text-sm font-medium text-slate-700">العربية</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-xl z-10 relative">
          {/* Hero Image/Logo Section */}
          <div className="mb-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-primary/10 rounded-full"></div>
              <div className="relative w-full h-full bg-primary rounded-full flex items-center justify-center shadow-lg" data-alt="Blue circular logo">
                <span className="material-symbols-outlined text-3xl text-white">apparel</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-slate-500 text-sm">Access your premium traditional wardrobe</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center">
              {errorMsg}
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">Username or Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                <input 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                  placeholder="Enter your username or email" 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                <input 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                  placeholder="••••••••" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:bg-primary checked:border-primary transition-all" type="checkbox" />
                  <span className="material-symbols-outlined absolute left-0 text-white opacity-0 peer-checked:opacity-100 text-sm pointer-events-none w-5 text-center">check</span>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">Remember me</span>
              </label>
              <a className="text-sm text-primary hover:underline font-semibold" href="#">Forgot Password?</a>
            </div>

            <button disabled={loading} type="submit" className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2">
              {loading ? 'Processing...' : 'Sign In'}
              <span className="material-symbols-outlined text-xl">login</span>
            </button>
          </form>

          {/* Registration is now restricted to the Admin Dashboard */}
        </div>
      </main>

      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 bg-slate-50 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -ml-64 -mb-64"></div>
      </div>

      <footer className="p-6 text-center text-xs text-slate-400 font-medium uppercase tracking-widest bg-white border-t border-slate-100">
        © 2024 Albarhi Sohar. Traditional Elegance, Modern Sophistication.
      </footer>
    </div>
  );
}
