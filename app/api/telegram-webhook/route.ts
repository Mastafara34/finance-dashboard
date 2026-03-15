import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inisialisasi Supabase (Gunakan Service Role Key agar bisa menembus RLS untuk proses Insert)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Pastikan request datang dari pesan Telegram
    if (!body.message || !body.message.text) {
      return NextResponse.json({ status: 'ignored' });
    }

    const chatId = body.message.chat.id;
    const userText = body.message.text;

    // 1. Kirim teks ke Gemini untuk diekstrak menjadi JSON
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Anda adalah asisten pencatat keuangan. Ekstrak pesan berikut ke dalam format JSON.
      HANYA kembalikan JSON murni tanpa markdown, tanpa backticks, dan tanpa penjelasan lain.
      Format yang diharapkan:
      {
        "type": "income" | "expense",
        "amount": angka numerik (tanpa titik/koma ribuan),
        "category_name": "string singkat (misal: Makanan, Gaji, Transport)",
        "note": "string catatan tambahan"
      }
      Pesan: "${userText}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Bersihkan potensi markdown dari Gemini (jika ada)
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJsonString);

    // 2. Cek apakah kategori sudah ada di Supabase, jika belum buat baru
    let categoryId;
    let { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', data.category_name)
      .eq('type', data.type)
      .single();

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert([{ name: data.category_name, type: data.type }])
        .select()
        .single();
      
      if (catError) throw catError;
      categoryId = newCategory.id;
    }

    // 3. Simpan transaksi ke Supabase
    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        category_id: categoryId,
        amount: data.amount,
        note: data.note,
        date: new Date().toISOString()
      }]);

    if (txError) throw txError;

    // 4. Kirim balasan sukses ke Telegram
    const replyMessage = `✅ Berhasil dicatat!\nTipe: ${data.type}\nKategori: ${data.category_name}\nNominal: Rp ${data.amount.toLocaleString('id-ID')}\nCatatan: ${data.note}`;
    await sendTelegramMessage(chatId, replyMessage);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}

// Fungsi helper untuk hit API Telegram (Setara dengan cURL di PHP)
async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}