import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const CATEGORY_COLORS = {
  'Makanan': '#38bdf8', // Light Blue
  'Transportasi': '#fb923c', // Orange
  'Belanja': '#ec4899', // Pink
  'Utilitas': '#a855f7', // Purple
  'Hiburan': '#eab308', // Yellow
  'Lainnya': '#94a3b8' // Grey
};

export default function Analytics({ transactions }) {
  const [activeRange, setActiveRange] = useState('all'); // 'all', 'month'

  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

  // Group expenses by category
  const categorySummaryMap = {};
  expenses.forEach(t => {
    categorySummaryMap[t.category] = (categorySummaryMap[t.category] || 0) + t.amount;
  });

  const categorySummary = Object.keys(categorySummaryMap).map(category => ({
    name: category,
    value: categorySummaryMap[category],
    percentage: totalExpenses > 0 ? (categorySummaryMap[category] / totalExpenses) * 100 : 0,
    color: CATEGORY_COLORS[category] || '#94a3b8'
  })).sort((a, b) => b.value - a.value);

  // Group income/expense by Month for the Trend Chart
  const trendDataMap = {};
  transactions.forEach(t => {
    // Get month name: e.g. "2026-06" -> "Jun 26"
    if (!t.date) return;
    const dateObj = new Date(t.date);
    const monthYear = dateObj.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    
    if (!trendDataMap[monthYear]) {
      trendDataMap[monthYear] = { month: monthYear, income: 0, expense: 0, sortKey: dateObj.getTime() };
    }
    
    if (t.type === 'income') {
      trendDataMap[monthYear].income += t.amount;
    } else {
      trendDataMap[monthYear].expense += t.amount;
    }
  });

  const trendData = Object.values(trendDataMap)
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-5); // Show last 5 months

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  // DONUT CHART CALCULATIONS
  let accumulatedPercentage = 0;
  const donutSlices = categorySummary.map((cat) => {
    const startAngle = (accumulatedPercentage / 100) * 360;
    accumulatedPercentage += cat.percentage;
    const endAngle = (accumulatedPercentage / 100) * 360;
    
    // Convert polar coordinates to Cartesian
    const radius = 70;
    const cx = 100;
    const cy = 100;

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };

    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = cat.percentage > 50 ? 1 : 0;

    // SVG path syntax
    const d = [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return { ...cat, d };
  });

  // BAR CHART MAXIMUM VALUE (to scale heights)
  const maxBarValue = Math.max(
    ...trendData.map(d => Math.max(d.income, d.expense)),
    100000 // Fallback min ceiling
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Analisis Keuangan</h2>

      {/* DONUT CHART BLOCK */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Proporsi Pengeluaran</h3>
        
        {totalExpenses === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-light)' }}>
            Belum ada data pengeluaran untuk dianalisis.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
            {/* SVG Donut */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <svg width="180" height="180" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="70" fill="none" stroke="var(--bg-tertiary)" strokeWidth="24" />
                {donutSlices.map((slice, i) => (
                  <path 
                    key={i}
                    d={slice.d} 
                    fill="none" 
                    stroke={slice.color} 
                    strokeWidth="24"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-width 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.setAttribute('stroke-width', '28')}
                    onMouseLeave={(e) => e.currentTarget.setAttribute('stroke-width', '24')}
                    title={`${slice.name}: ${slice.percentage.toFixed(1)}%`}
                  />
                ))}
                {/* Center Text inside Donut */}
                <text x="100" y="98" textAnchor="middle" fill="var(--text-primary)" style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '0.9rem' }}>
                  Total
                </text>
                <text x="100" y="118" textAnchor="middle" fill="var(--rose)" style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.75rem' }}>
                  {formatIDR(totalExpenses).replace('Rp', '').trim()}
                </text>
              </svg>
            </div>

            {/* Legends */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categorySummary.slice(0, 4).map((cat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color }}></div>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{cat.percentage.toFixed(0)}%</span>
                </div>
              ))}
              {categorySummary.length > 4 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'right', fontStyle: 'italic' }}>
                  + {categorySummary.length - 4} Kategori lainnya
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TREND CHART BLOCK */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Tren Bulanan</h3>

        {trendData.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-light)' }}>
            Belum ada transaksi yang tercatat.
          </div>
        ) : (
          <div>
            {/* Custom SVG Bar Chart */}
            <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '10px', position: 'relative' }}>
              {trendData.map((d, index) => {
                const incomeHeight = (d.income / maxBarValue) * 120;
                const expenseHeight = (d.expense / maxBarValue) * 120;

                return (
                  <div key={index} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1
                  }}>
                    {/* Double Bars Container */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '120px' }}>
                      {/* Income Bar (Emerald) */}
                      <div 
                        style={{
                          width: '12px',
                          height: `${Math.max(incomeHeight, 2)}px`,
                          background: 'linear-gradient(to top, var(--emerald), #34d399)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.5s ease-out'
                        }}
                        title={`Pemasukan: ${formatIDR(d.income)}`}
                      ></div>

                      {/* Expense Bar (Rose) */}
                      <div 
                        style={{
                          width: '12px',
                          height: `${Math.max(expenseHeight, 2)}px`,
                          background: 'linear-gradient(to top, var(--rose), #fb7185)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.5s ease-out'
                        }}
                        title={`Pengeluaran: ${formatIDR(d.expense)}`}
                      ></div>
                    </div>

                    {/* Month Label */}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 600, marginTop: '8px' }}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend Indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '12px',
              marginTop: '10px',
              fontSize: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--emerald)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Pemasukan</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--rose)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Pengeluaran</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LIST OF EXPENSES BY CATEGORY */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>Rincian Kategori Pengeluaran</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categorySummary.length === 0 ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center', display: 'block', padding: '10px 0' }}>
              Tidak ada pengeluaran.
            </span>
          ) : (
            categorySummary.map((cat, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatIDR(cat.value)}</span>
                </div>
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${cat.percentage}%`,
                    height: '100%',
                    backgroundColor: cat.color,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease-out'
                  }}></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
