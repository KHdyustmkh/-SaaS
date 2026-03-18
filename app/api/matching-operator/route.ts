import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const getModelCandidates = () => {
  const envModel = process.env.GEMINI_MODEL
  const base = [
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.5-flash'
  ]
  return envModel ? [envModel, ...base.filter(m => m !== envModel)] : base
}

const isModelNotFoundError = (err: any) => {
  const msg = String(err?.message || err)
  return msg.includes('404') && msg.toLowerCase().includes('models/')
}

async function generateWithFallback (prompt: string) {
  let lastError: any
  for (const modelName of getModelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      return await model.generateContent(prompt)
    } catch (err: any) {
      lastError = err
      if (!isModelNotFoundError(err)) throw err
    }
  }
  throw lastError || new Error('利用可能なAIモデルが見つかりませんでした')
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );

    // 1. 検索条件の抽出
    const extractionPrompt = `
      あなたは遺失物管理センターの優秀なオペレーターです。
      ユーザーの問い合わせから検索条件を抽出し、以下のJSON形式でのみ回答してください。
      {"keyword": "品名", "location": "場所", "color": "色"}
      ユーザー入力: "${message}"
    `;

    const extractionResult = await generateWithFallback(extractionPrompt);
    const extractionText = extractionResult.response.text();
    const jsonMatch = extractionText.match(/\{.*\}/s);
    const filters = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // 2. DB検索（既存の lost_items テーブルを検索）
    let query = supabase
      .from('lost_items')
      .select('id, name, location, description, photo_url, status')
      .eq('status', '届出未完了');

    if (filters.keyword) query = query.ilike('name', `%${filters.keyword}%`);
    if (filters.location) query = query.ilike('location', `%${filters.location}%`);
    if (filters.color) query = query.ilike('description', `%${filters.color}%`);

    const { data: matchedItems, error: dbError } = await query.limit(5);
    if (dbError) throw dbError;

    // 3. 回答文の生成
    const replyPrompt = `
      あなたは遺失物管理センターのAIオペレーターです。
      検索結果: ${JSON.stringify(matchedItems)}
      ユーザーの問いかけ: "${message}"
      上記を元に、優しく丁寧な回答を作成してください。
    `;

    const replyResult = await generateWithFallback(replyPrompt);
    const replyText = replyResult.response.text();

    return NextResponse.json({
      reply: replyText,
      items: matchedItems
    });

  } catch (error: any) {
    console.error('Matching Error:', error);
    return NextResponse.json({ error: 'AI処理中にエラーが発生しました' }, { status: 500 });
  }
}