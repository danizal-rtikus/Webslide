import React, { useEffect, useState } from 'react';
import { databaseService } from '../lib/database.service';
import { 
  Users, 
  Search, 
  MoreVertical, 
  Shield, 
  Crown, 
  User, 
  Plus, 
  Minus,
  Save,
  X,
  CreditCard,
  TrendingUp,
  Activity,
  ArrowLeft
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
  isDark: boolean;
}

export default function AdminDashboard({ onClose, isDark }: AdminDashboardProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'analytics'>('users');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ credits: number, role: string }>({ credits: 0, role: 'user' });

  useEffect(() => {
    if (activeTab === 'users') fetchProfiles();
    if (activeTab === 'transactions') fetchTransactions();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await databaseService.adminGetAllProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await databaseService.adminFetchTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await databaseService.adminFetchGlobalStats();
      setGlobalStats(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (profile: any) => {
    setEditingId(profile.id);
    setEditValues({ credits: profile.credits || 0, role: profile.role || 'user' });
  };

  const handleUpdate = async (userId: string) => {
    try {
      await databaseService.adminUpdateProfile(userId, editValues);
      
      // Log manual adjustment
      const p = profiles.find(x => x.id === userId);
      const diff = editValues.credits - (p?.credits || 0);
      if (diff !== 0) {
        await databaseService.logTransaction({
          userId,
          type: 'manual',
          amount: diff,
          description: `Penyesuaian Admin (${diff > 0 ? '+' : ''}${diff} kredit)`
        });
      }

      setEditingId(null);
      fetchProfiles();
    } catch (err) {
      console.error('Update failed:', err);
      alert('Gagal mengupdate profil.');
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.email?.toLowerCase().includes(search.toLowerCase()) || 
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`fixed inset-0 z-[150] flex flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} animate-in fade-in duration-300`}>
      {/* Header */}
      <header className={`p-6 border-b flex justify-between items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-sm`}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Shield className="text-indigo-600" size={24} />
              Admin Control Center
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>SaaS Management Dashboard</p>
          </div>
        </div>

        <div className={`flex items-center p-1 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Users" icon={<Users size={16}/>} isDark={isDark} />
          <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} label="Transactions" icon={<Activity size={16}/>} isDark={isDark} />
          <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Analytics" icon={<TrendingUp size={16}/>} isDark={isDark} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-[1600px] w-full mx-auto space-y-8">
        
        {activeTab === 'analytics' && globalStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StatCard icon={<CreditCard className="text-emerald-500" />} label="Kredit Terjual (Topup)" value={globalStats.totalTopupCredits} isDark={isDark} />
            <StatCard icon={<TrendingUp className="text-red-500" />} label="Kredit Digunakan" value={globalStats.totalUsageCredits} isDark={isDark} />
            <StatCard icon={<Crown className="text-amber-500" />} label="Revenue Estimasi (IDR)" value={`Rp ${(globalStats.totalTopupCredits / 5000 * 49000).toLocaleString()}`} isDark={isDark} />
          </div>
        )}

        {/* User Management Table */}
        {activeTab === 'users' && (
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-[32px] overflow-hidden shadow-sm animate-in fade-in duration-500`}>
            <div className="p-6 border-b border-inherit bg-inherit flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-black tracking-tight">Daftar Pengguna Platform</h2>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari email atau nama..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'} border rounded-2xl pl-12 pr-4 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/20`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`${isDark ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-50 text-slate-400'} text-[10px] uppercase font-black tracking-widest`}>
                    <th className="px-6 py-4">User Info</th>
                    <th className="px-6 py-4">Status / Role</th>
                    <th className="px-6 py-4">Kredit</th>
                    <th className="px-6 py-4">Daftar Pada</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {loading ? (
                    [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-8 h-20"></td></tr>)
                  ) : filteredProfiles.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-500 font-bold">Tidak ada pengguna ditemukan.</td></tr>
                  ) : filteredProfiles.map((p) => (
                    <tr key={p.id} className={`${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="px-6 py-4 text-sm font-bold">{p.email}</td>
                      <td className="px-6 py-4">
                        {editingId === p.id ? (
                          <select value={editValues.role} onChange={(e) => setEditValues({...editValues, role: e.target.value})} className={`p-2 rounded-xl border outline-none text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                            <option value="user">USER</option>
                            <option value="pro">PRO</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${p.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' : p.role === 'pro' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 text-slate-500'}`}>{p.role || 'user'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-black">
                        {editingId === p.id ? (
                          <input
                            type="number"
                            value={editValues.credits}
                            onChange={(e) => setEditValues({...editValues, credits: parseInt(e.target.value) || 0})}
                            className={`w-24 p-2 rounded-xl border outline-none text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            min={0}
                          />
                        ) : (
                          <span className="text-indigo-500">{p.credits || 0}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {editingId === p.id ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleUpdate(p.id)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-colors"><Save size={16}/></button>
                            <button onClick={() => setEditingId(null)} className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><X size={16}/></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(p)} className={`p-2 rounded-xl text-slate-400 group transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-indigo-50'}`}><TrendingUp size={18} className="group-hover:text-indigo-600"/></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {activeTab === 'transactions' && (
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border rounded-[32px] overflow-hidden shadow-sm animate-in fade-in duration-500`}>
            <div className="p-6 border-b border-inherit bg-inherit flex justify-between items-center">
              <h2 className="text-lg font-black tracking-tight">Log Aktivitas Kredit</h2>
              <button onClick={fetchTransactions} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><Activity size={18} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`${isDark ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-50 text-slate-400'} text-[10px] uppercase font-black tracking-widest`}>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {loading ? (
                    [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-8 h-20"></td></tr>)
                  ) : transactions.map((t) => (
                    <tr key={t.id} className={`${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="px-6 py-4 text-xs font-bold">{t.profiles?.email || 'System'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${t.type === 'topup' ? 'bg-emerald-500/10 text-emerald-500' : t.type === 'usage' ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 text-slate-500'}`}>{t.type}</span>
                      </td>
                      <td className={`px-6 py-4 font-black ${t.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">{t.description}</td>
                      <td className="px-6 py-4 text-[10px] text-slate-400 font-medium">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon, isDark }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode, isDark: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${active ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-indigo-600 shadow-sm') : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ icon, label, value, isDark }: { icon: React.ReactNode, label: string, value: string | number, isDark: boolean }) {
  return (
    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'} p-8 rounded-[32px] border shadow-sm`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          {icon}
        </div>
        <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Live Data</div>
      </div>
      <div className="text-3xl font-black mb-1">{value.toLocaleString()}</div>
      <div className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{label}</div>
    </div>
  );
}
