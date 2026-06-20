import { getSupabaseClient } from './supabaseClient';

// Generate a random sync ID for partition key
const generateSyncId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SK-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Initialize local sync ID
export const getSyncId = () => {
  let syncId = localStorage.getItem('sakuku_sync_id');
  if (!syncId) {
    syncId = generateSyncId();
    localStorage.setItem('sakuku_sync_id', syncId);
  }
  return syncId;
};

export const setSyncId = (newSyncId) => {
  if (newSyncId && newSyncId.trim()) {
    localStorage.setItem('sakuku_sync_id', newSyncId.trim().toUpperCase());
  }
};

// Local storage helpers
const getLocalTransactions = () => {
  return JSON.parse(localStorage.getItem('sakuku_transactions') || '[]');
};

const saveLocalTransactions = (txs) => {
  localStorage.setItem('sakuku_transactions', JSON.stringify(txs));
};

// Sync queue for offline actions
const getSyncQueue = () => {
  return JSON.parse(localStorage.getItem('sakuku_sync_queue') || '[]');
};

const saveSyncQueue = (queue) => {
  localStorage.setItem('sakuku_sync_queue', JSON.stringify(queue));
};

// Merge function to combine local and remote data
const mergeTransactions = (local, remote) => {
  const mergedMap = new Map();
  
  // Add remote first
  remote.forEach(t => mergedMap.set(t.id, t));
  
  // Add local, keeping locally modified/unsynced changes if they are newer
  local.forEach(t => {
    if (!mergedMap.has(t.id) || t.pending_sync) {
      mergedMap.set(t.id, t);
    }
  });

  return Array.from(mergedMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
};

let realtimeSubscription = null;

// The main DB coordinator
export const db = {
  // Get all transactions (local first, then sync remote in background)
  async getTransactions(onUpdate) {
    // 1. Return local data instantly
    const local = getLocalTransactions();
    onUpdate(local);

    // 2. Try to sync remote if online and configured
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const syncId = getSyncId();

    try {
      // First, flush offline queue
      await this.flushSyncQueue();

      // Fetch from remote
      const { data: remote, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('sync_id', syncId)
        .order('date', { ascending: false });

      if (error) throw error;

      if (remote) {
        // Merge remote and local
        const merged = mergeTransactions(getLocalTransactions(), remote);
        saveLocalTransactions(merged);
        onUpdate(merged);
      }
    } catch (err) {
      console.warn('Sync failed, using offline cache:', err.message);
    }
  },

  // Save/Add a transaction
  async addTransaction(tx, onUpdate) {
    const localTxs = getLocalTransactions();
    const syncId = getSyncId();
    const newTx = {
      id: tx.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      sync_id: syncId,
      amount: parseFloat(tx.amount),
      type: tx.type, // 'income' or 'expense'
      category: tx.category,
      date: tx.date,
      description: tx.description || '',
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    // Update local immediately (optimistic UI)
    const updated = [newTx, ...localTxs].sort((a, b) => new Date(b.date) - new Date(a.date));
    saveLocalTransactions(updated);
    onUpdate(updated);

    // Push to sync queue
    const queue = getSyncQueue();
    queue.push({ action: 'UPSERT', data: newTx });
    saveSyncQueue(queue);

    // Attempt remote write
    await this.flushSyncQueue(onUpdate);
  },

  // Delete a transaction
  async deleteTransaction(id, onUpdate) {
    const localTxs = getLocalTransactions();
    
    // Remove locally
    const updated = localTxs.filter(t => t.id !== id);
    saveLocalTransactions(updated);
    onUpdate(updated);

    // Add deletion to sync queue
    const queue = getSyncQueue();
    queue.push({ action: 'DELETE', id });
    saveSyncQueue(queue);

    // Attempt remote delete
    await this.flushSyncQueue(onUpdate);
  },

  // Flush offline modifications to Supabase
  async flushSyncQueue(onUpdate) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let queue = getSyncQueue();
    if (queue.length === 0) return;

    const remainingQueue = [];

    for (const item of queue) {
      try {
        if (item.action === 'UPSERT') {
          // Clean the pending_sync property before sending to DB
          const { pending_sync, ...dbData } = item.data;
          
          const { error } = await supabase
            .from('transactions')
            .upsert([dbData]);

          if (error) throw error;
          
          // Mark local item as synced
          const local = getLocalTransactions();
          const updated = local.map(t => t.id === item.data.id ? { ...t, pending_sync: false } : t);
          saveLocalTransactions(updated);
          if (onUpdate) onUpdate(updated);
        } else if (item.action === 'DELETE') {
          const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', item.id);

          if (error) throw error;
        }
      } catch (err) {
        console.error('Failed to sync queue item:', item, err.message);
        remainingQueue.push(item); // Retain in queue for next retry
      }
    }

    saveSyncQueue(remainingQueue);
  },

  // Subscribe to real-time changes
  subscribeToChanges(onUpdate) {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    // Clear existing subscription if active
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
    }

    const syncId = getSyncId();

    realtimeSubscription = supabase
      .channel('public:transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `sync_id=eq.${syncId}`
        },
        async (payload) => {
          console.log('Realtime update received:', payload);
          const local = getLocalTransactions();
          
          let updated = [...local];
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newItem = payload.new;
            // Ensure no pending sync if it comes directly from DB
            newItem.pending_sync = false;
            
            const index = updated.findIndex(t => t.id === newItem.id);
            if (index !== -1) {
              updated[index] = newItem;
            } else {
              updated.push(newItem);
            }
          } else if (payload.eventType === 'DELETE') {
            updated = updated.filter(t => t.id !== payload.old.id);
          }

          updated.sort((a, b) => new Date(b.date) - new Date(a.date));
          saveLocalTransactions(updated);
          onUpdate(updated);
        }
      )
      .subscribe();

    return () => {
      if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
        realtimeSubscription = null;
      }
    };
  }
};
