import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.message || !body.message.text) return NextResponse.json({ ok: true });

    const chatId = body.message.chat.id;
    const userText = body.message.text;

    // --- TEMBAK GEMINI MANUAL (Tanpa Library) ---
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Ekstrak JSON murni (tanpa markdown): {"type":"income"|"expense","amount":number,"category_name":"string","note":"string"} dari pesan: "${userText}"`
          }]
        }]
      })
    });

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates[0].content.parts[0].text;
    const data = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

    // --- SIMPAN KE SUPABASE ---
    let { data: cat } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', data.category_name)
      .eq('type', data.type)
      .single();

    if (!cat) {
      const { data: newCat } = await supabase
        .from('categories')
        .insert([{ name: data.category_name, type: data.type }])
        .select().single();
      cat = newCat;
    }

    await supabase.from('transactions').insert([{
      category_id: cat.id,
      amount: data.amount,
      note: data.note
    }]);

    // --- BALAS TELEGRAM ---
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ Berhasil dicatat!\nKategori: ${data.category_name}\nNominal: Rp ${data.amount.toLocaleString('id-ID')}`
      })
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("LOG ERROR:", err);
    return NextResponse.json({ ok: false });
  }
}