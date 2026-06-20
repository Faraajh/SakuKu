import { createClient } from '@supabase/supabase-js';

// Helper to parse transaction from raw notification text
function parseTransaction(text) {
  const textLower = text.toLowerCase();
  
  // 1. Amount detection
  let amount = 0;
  
  // Try k-abbreviation (e.g. 50k, 15.5k)
  const kMatch = textLower.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    amount = parseFloat(kMatch[1]) * 1000;
  } else {
    // Remove "Rp", dots, and clean text
    const cleanText = textLower.replace(/rp/g, "").replace(/\./g, "");
    const numbers = cleanText.match(/\d+/g);
    if (numbers) {
      const validNumbers = numbers
        .map(n => parseInt(n, 10))
        .filter(num => num.toString().length <= 9); // Ignore long numbers (like account/rekening numbers)
      if (validNumbers.length > 0) {
        amount = Math.max(...validNumbers);
      }
    }
  }

  if (amount === 0) return null;

  // 2. Type detection
  let type = "expense";
  const incomeKeywords = ["gaji", "pemasukan", "masuk", "terima", "diterima", "transfer dari", "side", "sampingan", "bonus", "angpao", "hibah"];
  if (incomeKeywords.some(k => textLower.includes(k))) {
    type = "income";
  }

  // 3. Category detection
  let category = "Lainnya";
  const categoryMap = {
    "Makanan": ["makan", "minum", "kopi", "resto", "warung", "bakso", "nasi", "burger", "pizza", "starbucks", "indomaret", "alfamart", "cemilan", "snack"],
    "Transportasi": ["gojek", "grab", "gocar", "grabbike", "ojek", "taxi", "taksi", "bensin", "parkir", "tol", "kereta", "krl", "mrt", "tiket", "travel"],
    "Belanja": ["belanja", "shopee", "tokopedia", "tokped", "lazada", "baju", "celana", "sepatu", "kaos", "beli", "mall", "checkout"],
    "Utilitas": ["listrik", "air", "wifi", "pulsa", "kuota", "internet", "pln", "pdam", "indihome"],
    "Hiburan": ["bioskop", "netflix", "nonton", "cinema", "game", "steam", "topup game", "roblox", "spotify", "karaoke"]
  };

  if (type === "income") {
    const incomeCategoryMap = {
      "Gaji": ["gaji", "salary", "payday"],
      "Investasi": ["dividen", "saham", "crypto", "reksadana", "investasi", "profit"],
      "Sampingan": ["sampingan", "freelance", "proyek", "jasa", "tips"],
      "Pemberian": ["hadiah", "pemberian", "angpao", "kasih", "ortu", "transfer dari mama", "transfer dari papa"]
    };
    for (const [cat, keywords] of Object.entries(incomeCategoryMap)) {
      if (keywords.some(k => textLower.includes(k))) {
        category = cat;
        break;
      }
    }
  } else {
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(k => textLower.includes(k))) {
        category = cat;
        break;
      }
    }
  }

  return { amount, type, category };
}

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sync_id, text, app_name } = req.body;

  if (!sync_id || !text) {
    return res.status(400).json({ error: 'Missing sync_id or text in request body' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase URL or Key not configured in Vercel Environment Variables' });
  }

  // Parse transaction data
  const parsed = parseTransaction(text);
  if (!parsed) {
    return res.status(422).json({ error: 'Could not extract valid transaction amount from text' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const tx_id = "auto_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const sourceLabel = app_name ? `(${app_name})` : "(Auto)";

  const newTx = {
    id: tx_id,
    sync_id: sync_id.trim().toUpperCase(),
    amount: parsed.amount,
    type: parsed.type,
    category: parsed.category,
    date: new Date().toISOString().split('T')[0],
    description: `🤖 ${sourceLabel}: ${text.substring(0, 100)}`,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([newTx])
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, transaction: data[0] });
  } catch (err) {
    console.error('Webhook error inserting to Supabase:', err);
    return res.status(500).json({ error: 'Failed to save transaction to database', details: err.message });
  }
}
