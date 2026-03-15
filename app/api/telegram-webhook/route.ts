import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. Inisialisasi Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validasi dasar pesan Telegram
    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = body.message.chat.id;
    const userText = body.message.text;

    // --- TAHAP 1: EKSTRAK DATA DENGAN GEMINI 2.5 FLASH ---
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract financial data from this text: "${userText}". 
            Respond ONLY with pure JSON. No markdown, no backticks.
            JSON Format: {"type":"income"|"expense","amount":number,"category_name":"string","note":"string"}`
          }]
        }]
      })
    });

    const geminiData = await geminiResponse.json();

    // Cek jika API Gemini error
    if (geminiData.error) {
      throw new Error(`Gemini Error: ${geminiData.error.message}`);
    }

    const rawText = geminiData.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    // --- TAHAP 2: SIMPAN KE SUPABASE ---
    // A. Cari atau Buat Kategori (Mirip logic INSERT IGNORE di MySQL)
    let { data: cat } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', data.category_name)
      .eq('type', data.type)
      .single();

    if (!cat) {
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert([{ name: data.category_name, type: data.type }])
        .select()
        .single();
      
      if (catError) throw catError;
      cat = newCat;
    }

    // B. Simpan Transaksi
    const { error: txError } = await supabase.from('transactions').insert([{
      category_id: cat?.id,
      amount: data.amount,
      note: data.note,
      date: new Date().toISOString()
    }]);

    if (txError) throw txError;

    // --- TAHAP 3: BALAS KE TELEGRAM ---
    const successMsg = `✅ *Tercatat Otomatis!*\n\n💰 *Nominal:* Rp ${data.amount.toLocaleString('id-ID')}\n📂 *Kategori:* ${data.category_name}\n📝 *Catatan:* ${data.note || '-'}`;
    
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: successMsg,
        parse_mode: 'Markdown'
      })
    });

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error("CRITICAL ERROR:", err.message);
    // Kita tetap kirim respon ok ke Telegram supaya bot tidak kirim ulang (looping)
    return NextResponse.json({ ok: true, error: err.message });
  }
}