import React, { useState, useEffect } from 'react';
import { 
  Home, 
  BarChart3, 
  Settings as SettingsIcon, 
  Plus, 
  Wifi, 
  WifiOff, 
  Wallet,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { db, getSyncId } from './db';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('sakuku_theme') || 'dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncId, setSyncIdState] = useState(getSyncId());
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '' });

  // Add transaction form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Makanan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2500);
  };

  // Sync / Load logic
  useEffect(() => {
    // Theme setter
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sakuku_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Online/Offline status
    const handleOnline = () => {
      setIsOnline(true);
      db.flushSyncQueue(setTransactions);
      showToast('Koneksi terhubung. Sinkronisasi data...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Koneksi terputus. Mode offline aktif.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch data and register realtime subscription when syncId changes
  useEffect(() => {
    // Get initial data
    db.getTransactions((txs) => {
      setTransactions(txs);
    });

    // Subscribe to changes in real-time
    const unsubscribe = db.subscribeToChanges((txs) => {
      setTransactions(txs);
      showToast('Data diperbarui secara real-time! 🔄');
    });

    return () => {
      unsubscribe();
    };
  }, [syncId]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Masukkan nominal transaksi yang valid!');
      return;
    }

    const tx = { amount: parseFloat(amount), type, category, date, description };
    await db.addTransaction(tx, setTransactions);
    
    // Reset Form
    setAmount('');
    setDescription('');
    setShowAddModal(false);
    showToast('Transaksi berhasil dicatat!');
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm('Hapus transaksi ini?')) {
      await db.deleteTransaction(id, setTransactions);
      showToast('Transaksi dihapus.');
    }
  };

  const categories = type === 'expense' 
    ? ['Makanan', 'Transportasi', 'Belanja', 'Utilitas', 'Hiburan', 'Lainnya']
    : ['Gaji', 'Investasi', 'Sampingan', 'Pemberian', 'Lainnya'];

  return (
    <div className="app-container">
      {/* HEADER BANNER */}
      <header className="glass-panel" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        margin: '0 0 20px 0',
        borderRadius: '0 0 20px 20px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="grad-teal" style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Wallet size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)' }}>SakuKu</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>SYNC ID: {syncId}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection status indicator */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isOnline ? (
              <Wifi size={18} className="text-emerald" title="Online" />
            ) : (
              <WifiOff size={18} className="text-rose" title="Offline" />
            )}
          </div>

          {/* Theme toggler */}
          <button 
            className="btn btn-secondary btn-circle" 
            style={{ width: '36px', height: '36px' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* VIEWPORT CONTROLLER */}
      <main style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto' }}>
        {activeTab === 'home' && (
          <Dashboard 
            transactions={transactions} 
            onDelete={handleDeleteTransaction}
            onAddClick={() => {
              // Pre-select date
              setDate(new Date().toISOString().split('T')[0]);
              setShowAddModal(true);
            }} 
          />
        )}
        {activeTab === 'analytics' && (
          <Analytics transactions={transactions} />
        )}
        {activeTab === 'settings' && (
          <Settings 
            syncId={syncId} 
            onSyncIdChange={(id) => {
              setSyncIdState(id);
              showToast('Sync ID diubah!');
            }}
            transactions={transactions}
            onImport={(txs) => {
              // Overwrite local
              localStorage.setItem('sakuku_transactions', JSON.stringify(txs));
              setTransactions(txs);
              showToast('Data berhasil di-import!');
            }}
            showToast={showToast}
          />
        )}
      </main>

      {/* BOTTOM NAV BAR */}
      <nav className="glass-panel" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderRadius: '24px 24px 0 0',
        zIndex: 90,
        padding: '0 10px',
        borderBottom: 'none'
      }}>
        <button 
          onClick={() => setActiveTab('home')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'home' ? 'var(--teal)' : 'var(--text-light)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-title)',
            fontWeight: 600,
            transition: 'var(--transition)'
          }}
        >
          <Home size={22} style={{ transform: activeTab === 'home' ? 'scale(1.1)' : 'none' }} />
          <span>Beranda</span>
        </button>

        {/* Center Floating Plus Action */}
        <button 
          onClick={() => {
            setDate(new Date().toISOString().split('T')[0]);
            setShowAddModal(true);
          }}
          className="btn btn-primary btn-circle grad-teal animate-fade-in"
          style={{
            width: '56px',
            height: '56px',
            marginTop: '-30px',
            boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4)',
            border: '4px solid var(--bg-primary)'
          }}
        >
          <Plus size={26} />
        </button>

        <button 
          onClick={() => setActiveTab('analytics')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'analytics' ? 'var(--teal)' : 'var(--text-light)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-title)',
            fontWeight: 600,
            transition: 'var(--transition)'
          }}
        >
          <BarChart3 size={22} style={{ transform: activeTab === 'analytics' ? 'scale(1.1)' : 'none' }} />
          <span>Grafik</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'settings' ? 'var(--teal)' : 'var(--text-light)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-title)',
            fontWeight: 600,
            transition: 'var(--transition)'
          }}
        >
          <SettingsIcon size={22} style={{ transform: activeTab === 'settings' ? 'scale(1.1)' : 'none' }} />
          <span>Pengaturan</span>
        </button>
      </nav>

      {/* TRANSACTION MODAL OVERLAY */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel animate-slide-up" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowAddModal(false)}
              className="btn btn-secondary btn-circle"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px'
              }}
            >
              <X size={16} />
            </button>

            <h2 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Catat Transaksi</h2>

            <form onSubmit={handleAddTransaction}>
              {/* Type Switch */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-primary)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory('Makanan'); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: type === 'expense' ? 'var(--rose)' : 'transparent',
                    color: type === 'expense' ? 'white' : 'var(--text-secondary)',
                    transition: 'var(--transition)'
                  }}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory('Gaji'); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: type === 'income' ? 'var(--emerald)' : 'transparent',
                    color: type === 'income' ? 'white' : 'var(--text-secondary)',
                    transition: 'var(--transition)'
                  }}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Jumlah (Rupiah)
                </label>
                <input 
                  type="number"
                  placeholder="Contoh: 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              {/* Category & Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Kategori
                  </label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Tanggal
                  </label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Keterangan (Opsional)
                </label>
                <input 
                  type="text"
                  placeholder="Keterangan singkat..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)' }}
              >
                Simpan Transaksi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <div className={`toast-msg ${toast.show ? 'show' : ''}`}>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
