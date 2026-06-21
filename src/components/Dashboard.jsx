import React, { useState } from 'react';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Filter, RefreshCw } from 'lucide-react';

const CATEGORY_EMOJIS = {
  // Expenses
  'Makanan': '🍔',
  'Transportasi': '🚗',
  'Belanja': '🛍️',
  'Utilitas': '💡',
  'Hiburan': '🎬',
  // Incomes
  'Gaji': '💰',
  'Investasi': '📈',
  'Sampingan': '💼',
  'Pemberian': '🎁',
  // Shared
  'Lainnya': '📦'
};

export default function Dashboard({ transactions, onDelete, onAddClick }) {
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Calculations
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;

  // Filtered List
  const filteredTransactions = transactions.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType;
    const matchCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchType && matchCategory;
  });

  // Extract unique categories in current transaction list for filter dropdown
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category)));

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* SUMMARY BANNER */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, var(--glass-bg) 0%, rgba(6, 182, 212, 0.05) 100%)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'var(--teal)',
          filter: 'blur(70px)',
          opacity: 0.15,
          top: '-20px',
          right: '-20px'
        }}></div>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Total Saldo Anda
        </span>
        <h2 style={{ 
          fontSize: '2.2rem', 
          fontFamily: 'var(--font-title)', 
          margin: '8px 0',
          color: balance >= 0 ? 'var(--text-primary)' : 'var(--rose)'
        }}>
          {formatIDR(balance)}
        </h2>

        {/* QUICK STATS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginTop: '20px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '20px'
        }}>
          {/* Income block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald)'
            }}>
              <ArrowUpRight size={18} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', fontWeight: 600 }}>PEMASUKAN</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--emerald)' }}>{formatIDR(income)}</span>
            </div>
          </div>

          {/* Expense block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', borderLeft: '1px solid var(--border-color)' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--rose)'
            }}>
              <ArrowDownRight size={18} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', fontWeight: 600 }}>PENGELUARAN</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--rose)' }}>{formatIDR(expense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & HEADER BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Riwayat Transaksi</h3>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Type Filter */}
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="all">Semua Tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>

          {/* Category Filter */}
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="all">Semua Kategori</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* LIST OF TRANSACTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredTransactions.length === 0 ? (
          <div className="glass-panel" style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>📭</span>
            <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>Belum ada transaksi.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px' }}>Klik tombol '+' melayang untuk menambahkan transaksi.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div 
              key={tx.id} 
              className="glass-card animate-fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderLeft: tx.type === 'income' ? '4px solid var(--emerald)' : '4px solid var(--rose)'
              }}
            >
              {/* Left Side Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Emoji Avatar */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem'
                }}>
                  {CATEGORY_EMOJIS[tx.category] || '📦'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {tx.category}
                    </span>
                    {tx.pending_sync && (
                      <RefreshCw 
                        size={12} 
                        className="text-light" 
                        style={{ animation: 'spin 2s linear infinite' }}
                        title="Menunggu sinkronisasi"
                      />
                    )}
                  </div>
                  {tx.description && (
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {tx.description}
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
                    {(() => {
                      try {
                        const dateStr = tx.date || tx.created_at;
                        if (!dateStr) return '';
                        
                        // Parse the calendar date part (YYYY-MM-DD)
                        const rawDate = dateStr.split('T')[0];
                        // Get the time part from created_at in UTC, or default to 00:00
                        const timeStr = tx.created_at ? tx.created_at.split('T')[1].substring(0, 5) : '00:00';
                        
                        // Create a proper date object explicitly in UTC
                        const d = new Date(`${rawDate}T${timeStr}:00Z`);
                        
                        if (isNaN(d.getTime())) return dateStr;
                        return new Intl.DateTimeFormat('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Jakarta'
                        }).format(d) + ' WIB';
                      } catch (e) {
                        return tx.date;
                      }
                    })()}
                  </span>
                </div>
              </div>

              {/* Right Side Amount & Delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: tx.type === 'income' ? 'var(--emerald)' : 'var(--rose)',
                  whiteSpace: 'nowrap'
                }}>
                  {tx.type === 'income' ? '+' : '-'} {formatIDR(tx.amount).replace('Rp', '')}
                </span>

                <button 
                  onClick={() => onDelete(tx.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-light)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--rose)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SPIN ANIMATION STYLE */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
