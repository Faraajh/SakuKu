import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Copy, 
  Trash2, 
  Download, 
  Upload, 
  Check, 
  Key,
  Info,
  Code
} from 'lucide-react';
import { initSupabase, clearSupabaseCredentials, getCredentials } from '../supabaseClient';
import { getSyncId, setSyncId } from '../db';

export default function Settings({ syncId, onSyncIdChange, transactions, onImport, showToast }) {
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const [tempSyncId, setTempSyncId] = useState(syncId);
  const [isConfigured, setIsConfigured] = useState(false);
  const [copiedSyncId, setCopiedSyncId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Load current database configuration
  useEffect(() => {
    const creds = getCredentials();
    if (creds) {
      setDbUrl(creds.url);
      setDbKey(creds.key);
      setIsConfigured(true);
    } else {
      setIsConfigured(false);
    }
  }, []);

  const handleSaveCredentials = (e) => {
    e.preventDefault();
    if (!dbUrl || !dbKey) {
      showToast('Harap isi URL dan Anon Key Supabase!');
      return;
    }

    const success = initSupabase(dbUrl, dbKey);
    if (success) {
      setIsConfigured(true);
      showToast('Kredensial Supabase berhasil disimpan! Database terhubung. ⚡');
    } else {
      showToast('Gagal menghubungkan Supabase. Cek kembali URL dan Key.');
    }
  };

  const handleClearCredentials = () => {
    if (window.confirm('Hapus kredensial database dari perangkat ini? Data lokal Anda tidak akan hilang.')) {
      clearSupabaseCredentials();
      setDbUrl('');
      setDbKey('');
      setIsConfigured(false);
      showToast('Kredensial Supabase dihapus.');
    }
  };

  const handleUpdateSyncId = (e) => {
    e.preventDefault();
    if (!tempSyncId || tempSyncId.trim().length < 4) {
      showToast('Sync ID tidak valid! Minimal 4 karakter.');
      return;
    }
    const cleanId = tempSyncId.trim().toUpperCase();
    setSyncId(cleanId);
    onSyncIdChange(cleanId);
  };

  const handleCopySyncId = () => {
    navigator.clipboard.writeText(syncId);
    setCopiedSyncId(true);
    showToast('Sync ID berhasil disalin! Salin ke HP/Laptop Anda.');
    setTimeout(() => setCopiedSyncId(false), 2000);
  };

  // SQL Script setup for Supabase
  const sqlSnippet = `-- 1. Buat Tabel Transaksi di Supabase SQL Editor
create table transactions (
  id text primary key,
  sync_id text not null,
  amount numeric not null,
  type text not null,
  category text not null,
  date text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Aktifkan Fitur Realtime untuk Tabel Transaksi
alter publication supabase_realtime add table transactions;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    showToast('SQL Script disalin! Tempel di SQL Editor Supabase.');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExportData = () => {
    if (transactions.length === 0) {
      showToast('Tidak ada transaksi untuk diekspor!');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sakuku_backup_${syncId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup data berhasil diunduh!');
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          onImport(parsed);
        } else {
          showToast('Format JSON salah! Harus berupa Array.');
        }
      } catch (err) {
        showToast('Gagal membaca file JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Pengaturan</h2>

      {/* SYNC ROOM SETUP */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Key size={18} className="text-teal" />
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Sinkronisasi Antar Perangkat</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          Gunakan **Sync ID** yang sama di HP dan Laptop Anda untuk menyinkronkan data keuangan secara instan.
        </p>

        {/* Sync Room Display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-primary)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          border: '1px dashed var(--border-color)'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', fontWeight: 600 }}>SYNC ID SAAT INI</span>
            <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.05em' }}>
              {syncId}
            </span>
          </div>
          <button 
            onClick={handleCopySyncId} 
            className="btn btn-secondary btn-circle"
            style={{ width: '36px', height: '36px' }}
          >
            {copiedSyncId ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Join Room Form */}
        <form onSubmit={handleUpdateSyncId} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Masukkan Sync ID lain..." 
            value={tempSyncId} 
            onChange={(e) => setTempSyncId(e.target.value)}
            className="input-field"
            style={{ textTransform: 'uppercase', flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Gabung</button>
        </form>
      </div>

      {/* SUPABASE CONNECTION CONFIG */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Database size={18} className="text-teal" />
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Koneksi Database Supabase</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          Masukkan kredensial proyek Supabase Anda. Data disimpan aman di memori browser perangkat ini.
        </p>

        <form onSubmit={handleSaveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>SUPABASE PROJECT URL</label>
            <input 
              type="url" 
              placeholder="https://xxxx.supabase.co" 
              value={dbUrl} 
              onChange={(e) => setDbUrl(e.target.value)}
              className="input-field"
              disabled={isConfigured}
              required
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>SUPABASE ANON KEY</label>
            <input 
              type="password" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
              value={dbKey} 
              onChange={(e) => setDbKey(e.target.value)}
              className="input-field"
              disabled={isConfigured}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            {isConfigured ? (
              <button 
                type="button" 
                onClick={handleClearCredentials} 
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                <Trash2 size={16} /> Hapus Koneksi
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Check size={16} /> Simpan Kredensial
              </button>
            )}
          </div>
        </form>
      </div>

      {/* SQL SCHEMA COPY Snippet */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Code size={18} className="text-amber" />
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Langkah Setup Database Supabase</h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
          Salin dan jalankan skrip SQL di bawah ini di dalam **SQL Editor** pada dashboard Supabase Anda:
        </p>

        <div style={{ position: 'relative' }}>
          <pre style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '0.7rem',
            overflowX: 'auto',
            border: '1px solid var(--border-color)',
            maxHeight: '150px',
            fontFamily: 'monospace'
          }}>
            {sqlSnippet}
          </pre>
          <button 
            onClick={handleCopySql}
            className="btn btn-secondary btn-circle"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '32px',
              height: '32px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {copiedSql ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* DATA BACKUP MANAGEMENT */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Info size={18} className="text-indigo" />
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Manajemen Cadangan Data</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          Ekspor semua transaksi ke file JSON lokal atau import file cadangan Anda.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button onClick={handleExportData} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <Download size={16} /> Ekspor JSON
          </button>

          <label className="btn btn-secondary" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
            <Upload size={16} /> Impor JSON
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportData} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </div>

    </div>
  );
}
