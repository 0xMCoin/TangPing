import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt, type StyleMode } from '@/lib/prompts';

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

    // O output pode ser um objeto com método url() ou uma string/array
    let generatedUrl: string;
    
    if (typeof output === 'object' && output !== null && 'url' in output && typeof output.url === 'function') {
      // Se tem método url(), usa ele
      generatedUrl = output.url();
    } else if (Array.isArray(output)) {
      generatedUrl = output[0];
    } else if (typeof output === 'string') {
      generatedUrl = output;
    } else {
      // Tenta acessar propriedade url diretamente
      generatedUrl = (output as any)?.url || (output as any)?.[0] || '';
    }

    if (!generatedUrl) {
      throw new Error('No image URL returned from Replicate');
    }

    console.log('[generate] generated image URL:', generatedUrl);

    // Baixa a imagem e converte para base64
    const imageResponse = await fetch(generatedUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch generated image: ${imageResponse.statusText}`);
    }
    
    const buffer = await imageResponse.arrayBuffer();
    const generatedBase64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({
      ok: true,
      imageBase64: generatedBase64,
      mimeType: 'image/jpeg', // nano-banana-2 retorna JPG
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
