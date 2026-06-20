import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Fallback Regex parser just in case AI fails or is rate-limited
function fallbackParseTransaction(text) {
  const textLower = text.toLowerCase();
  let amount = 0;
  
  const kMatch = textLower.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    amount = parseFloat(kMatch[1]) * 1000;
  } else {
    const cleanText = textLower.replace(/rp/g, "").replace(/\./g, "");
    const numbers = cleanText.match(/\d+/g);
    if (numbers) {
      const validNumbers = numbers
        .map(n => parseInt(n, 10))
        .filter(num => num.toString().length <= 9);
      if (validNumbers.length > 0) {
        amount = Math.max(...validNumbers);
      }
    }
  }

  if (amount === 0) return null;

  let type = "expense";
  const incomeKeywords = ["gaji", "pemasukan", "masuk", "terima", "diterima", "transfer dari", "side", "sampingan", "bonus", "angpao", "hibah"];
  if (incomeKeywords.some(k => textLower.includes(k))) {
    type = "income";
  }

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

// Main AI Parser
async function parseTransactionAI(text) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
Anda adalah asisten pencatat keuangan cerdas. Analisis teks notifikasi berikut dan ekstrak data transaksinya.

Teks Notifikasi: "${text}"

Tugas:
1. amount: Nominal transaksi (dalam bentuk angka integer, misal: 75000). Jika tidak ada, kembalikan 0.
2. type: Tentukan apakah ini "expense" (pengeluaran) atau "income" (pemasukan).
3. category: Pilih SATU dari daftar berikut yang paling cocok berdasarkan nama merchant atau konteks:
   - Jika expense: "Makanan", "Transportasi", "Belanja", "Utilitas", "Hiburan", "Lainnya"
   - Jika income: "Gaji", "Investasi", "Sampingan", "Pemberian", "Lainnya"
   Jika ragu, ambigu, atau nama merchant tidak dikenali, WAJIB gunakan "Lainnya".

Berikan output HANYA dalam format JSON dengan struktur persis seperti ini:
{
  "amount": 75000,
  "type": "expense",
  "category": "Makanan"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.amount || parsed.amount === 0) return null;
    
    // Ensure safety bounds for fields
    const validExpense = ["Makanan", "Transportasi", "Belanja", "Utilitas", "Hiburan", "Lainnya"];
    const validIncome = ["Gaji", "Investasi", "Sampingan", "Pemberian", "Lainnya"];
    
    const finalType = parsed.type === 'income' ? 'income' : 'expense';
    let finalCategory = parsed.category || 'Lainnya';
    
    if (finalType === 'expense' && !validExpense.includes(finalCategory)) finalCategory = 'Lainnya';
    if (finalType === 'income' && !validIncome.includes(finalCategory)) finalCategory = 'Lainnya';

    return {
      amount: parseInt(parsed.amount, 10),
      type: finalType,
      category: finalCategory
    };
  } catch (error) {
    console.error("Gemini AI Parsing Error:", error);
    // Fallback securely to our old regex engine
    return fallbackParseTransaction(text);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sync_id, text, app_name } = req.body;

  if (!sync_id || !text) {
    return res.status(400).json({ error: 'Missing sync_id or text in request body' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vcoupegsuapuircfwrpe.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tUnOd-ikngepqoaWWZpc4A_bVWaQou1';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase URL or Key not configured' });
  }

  // Use AI to parse transaction data
  const parsed = await parseTransactionAI(text);
  
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
