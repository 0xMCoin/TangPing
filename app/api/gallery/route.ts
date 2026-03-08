import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Desabilita cache completamente
export const fetchCache = 'force-no-store'; // Força não usar cache

export async function GET() {
  try {
    // Verifica se o Supabase está configurado
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[gallery] Supabase not configured, returning empty array');
      return NextResponse.json({
        ok: true,
        images: [],
        warning: 'Supabase not configured. Please check SUPABASE_SETUP.md',
      });
    }

    // Busca as últimas 5 imagens geradas (apenas com public_url válido)
    // Sem cache - sempre busca dados frescos do banco
    const { data, error, count } = await supabaseAdmin
      .from('generated_images')
      .select('id, public_url, style, created_at, image_number', { count: 'exact' })
      .not('public_url', 'is', null) // Garante que public_url não é NULL
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[gallery] Database error:', error);
      // Se a tabela não existe, retorna array vazio em vez de erro
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          ok: true,
          images: [],
          warning: 'Table not found. Please run the SQL from SUPABASE_SETUP.md',
        });
      }
      return NextResponse.json({ ok: false, error: 'Failed to fetch images.' }, { status: 500 });
    }

    // Retorna com headers agressivos para evitar cache (especialmente na Vercel)
    const timestamp = Date.now();
    return NextResponse.json(
      {
        ok: true,
        images: data || [],
        timestamp, // Inclui timestamp na resposta para debug
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Timestamp': timestamp.toString(),
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error: any) {
    console.error('[gallery] Error:', error);
    return NextResponse.json({ ok: false, error: 'Unexpected error.' }, { status: 500 });
  }
}
