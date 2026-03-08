import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt, type StyleMode } from '@/lib/prompts';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function isValidStyle(style: string): style is StyleMode {
  return style === 'cartoon' || style === 'pixel' || style === 'meme';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    const style = String(formData.get('style') || 'cartoon');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No image uploaded.' }, { status: 400 });
    }

    if (!isValidStyle(style)) {
      return NextResponse.json({ ok: false, error: 'Invalid style.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'Not an image.' }, { status: 400 });
    }

    // Converte a imagem para base64 e depois para data URL
    // O nano-banana-2 aceita URLs, então vamos usar data URL ou fazer upload
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/png';
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    console.log('[generate] image ready as data URL');

    // Usa o prompt completo do TANGPING
    const prompt = buildPrompt(style);
    console.log('[generate] prompt length:', prompt.length, 'characters');

    // Modelo nano-banana-2 com formato correto
    const output = await replicate.run('google/nano-banana-2', {
      input: {
        prompt: prompt,
        resolution: '1K',
        image_input: [imageDataUrl], // Array com a URL da imagem de referência
        aspect_ratio: '1:1',
        image_search: false,
        google_search: false,
        output_format: 'jpg',
      },
    });

    console.log('[generate] Replicate output:', output);

    // O output pode ser um objeto URL, string ou array
    let generatedUrl: string;
    
    if (typeof output === 'object' && output !== null) {
      // Se é um objeto URL, extrai a href
      if ('href' in output && typeof output.href === 'string') {
        generatedUrl = output.href;
      } else if ('url' in output && typeof output.url === 'function') {
        // Se tem método url(), usa ele
        generatedUrl = output.url();
      } else if (Array.isArray(output)) {
        generatedUrl = output[0];
      } else {
        // Tenta acessar propriedade url diretamente
        generatedUrl = (output as any)?.url || (output as any)?.[0] || '';
      }
    } else if (typeof output === 'string') {
      generatedUrl = output;
    } else if (Array.isArray(output)) {
      generatedUrl = output[0];
    } else {
      generatedUrl = '';
    }

    if (!generatedUrl) {
      throw new Error('No image URL returned from Replicate');
    }

    // Garante que é uma string
    generatedUrl = String(generatedUrl);
    console.log('[generate] generated image URL:', generatedUrl);

    // Baixa a imagem e converte para base64 (para retornar ao cliente)
    const imageResponse = await fetch(generatedUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch generated image: ${imageResponse.statusText}`);
    }
    
    const buffer = await imageResponse.arrayBuffer();
    const generatedBase64 = Buffer.from(buffer).toString('base64');

    // Salva apenas a URL do Replicate no banco de dados (sem fazer upload)
    let savedToSupabase = false;
    let imageNumber = 0;
    try {
      console.log('[generate] Saving URL to database...');
      console.log('[generate] URL to save:', generatedUrl);
      console.log('[generate] Style:', style);
      
      // Calcula o número sequencial da imagem (conta quantas já existem + 1)
      const { count } = await supabaseAdmin
        .from('generated_images')
        .select('*', { count: 'exact', head: true });
      
      imageNumber = (count || 0) + 1;
      console.log('[generate] This will be image #', imageNumber);
      
      // Salva o registro na tabela com a URL do Replicate
      // Não incluímos storage_path para evitar constraint NOT NULL
      const insertData = {
        public_url: generatedUrl, // URL direta do Replicate
        style: style,
        image_number: imageNumber, // Número sequencial da imagem
        created_at: new Date().toISOString(),
      };
      
      console.log('[generate] Insert data:', insertData);
      
      const { data: insertResult, error: dbError } = await supabaseAdmin
        .from('generated_images')
        .insert(insertData)
        .select();

      if (dbError) {
        console.error('[generate] Database insert error:', dbError);
      } else {
        savedToSupabase = true;
        console.log('[generate] Image URL saved to Supabase successfully. Insert result:', insertResult);
        console.log('[generate] Saved URL:', generatedUrl);
        console.log('[generate] Image number:', imageNumber);
      }
    } catch (dbError) {
      console.error('[generate] Database error:', dbError);
      // Continua mesmo se o salvamento falhar
    }

    return NextResponse.json({
      ok: true,
      imageBase64: generatedBase64,
      mimeType: 'image/jpeg', // nano-banana-2 retorna JPG
      replicateUrl: generatedUrl, // URL do Replicate
      savedToSupabase: savedToSupabase, // Indica se foi salvo com sucesso
      imageNumber: imageNumber, // Número sequencial da imagem
    });

  } catch (error: any) {
    console.error('[generate] Replicate error:', error);
    let message = error?.message || 'Erro na geração.';
    let status = 500;

    if (error?.message?.includes('credits') || error?.message?.includes('quota')) {
      message = 'Créditos insuficientes no Replicate. Adicione saldo ou use tier gratuito.';
      status = 402;
    }

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
