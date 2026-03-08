import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt, type StyleMode } from '@/lib/prompts';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Desabilita cache completamente
export const fetchCache = 'force-no-store'; // Força não usar cache

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
    const username = formData.get('username') ? String(formData.get('username')).trim() : null;

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
    if (username) {
      console.log('[generate] username provided:', username);
    }

    // Usa o prompt completo do TANGPING (com username opcional)
    const prompt = buildPrompt(style, username);
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
    const imageBuffer = Buffer.from(buffer);
    const generatedBase64 = imageBuffer.toString('base64');

    // Faz upload da imagem para o Supabase Storage
    let savedToSupabase = false;
    let imageNumber = 0;
    let supabasePublicUrl = generatedUrl; // Fallback para URL do Replicate
    let storagePath: string | null = null;

    try {
      console.log('[generate] Uploading image to Supabase Storage...');

      // Calcula o número sequencial da imagem (conta quantas já existem + 1)
      const { count } = await supabaseAdmin
        .from('generated_images')
        .select('*', { count: 'exact', head: true });

      imageNumber = (count || 0) + 1;
      console.log('[generate] This will be image #', imageNumber);

      // Gera um nome único para o arquivo
      const timestamp = Date.now();
      const filename = `tangping-${imageNumber}-${timestamp}.jpg`;
      storagePath = `generated/${filename}`;

      // Faz upload para o bucket 'images'
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('images')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false, // Não sobrescrever se já existir
        });

      if (uploadError) {
        console.error('[generate] Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('[generate] Image uploaded to Storage:', uploadData.path);

      // Obtém a URL pública da imagem
      const { data: urlData } = supabaseAdmin.storage
        .from('images')
        .getPublicUrl(storagePath);

      if (urlData?.publicUrl) {
        supabasePublicUrl = urlData.publicUrl;
        console.log('[generate] Public URL:', supabasePublicUrl);
      }

      // Salva o registro na tabela com a URL do Supabase
      const insertData: any = {
        storage_path: storagePath,
        public_url: supabasePublicUrl,
        style: style,
        image_number: imageNumber,
        created_at: new Date().toISOString(),
      };

      // Adiciona username se fornecido
      if (username) {
        insertData.username = username;
      }

      console.log('[generate] Insert data:', insertData);

      const { data: insertResult, error: dbError } = await supabaseAdmin
        .from('generated_images')
        .insert(insertData)
        .select();

      if (dbError) {
        console.error('[generate] Database insert error:', dbError);
        throw dbError;
      } else {
        savedToSupabase = true;
        console.log('[generate] Image saved to Supabase successfully. Insert result:', insertResult);
        console.log('[generate] Storage path:', storagePath);
        console.log('[generate] Public URL:', supabasePublicUrl);
        console.log('[generate] Image number:', imageNumber);
      }
    } catch (error: any) {
      console.error('[generate] Supabase error:', error);
      // Se falhar o upload, tenta salvar pelo menos a URL do Replicate no banco
      console.log('[generate] Upload failed, trying to save Replicate URL as fallback...');
      supabasePublicUrl = generatedUrl;
      storagePath = null;

      try {
        // Tenta salvar pelo menos a URL do Replicate
        const { count } = await supabaseAdmin
          .from('generated_images')
          .select('*', { count: 'exact', head: true });

        imageNumber = (count || 0) + 1;

        const insertData: any = {
          storage_path: null, // Null se não conseguiu fazer upload
          public_url: generatedUrl, // URL do Replicate como fallback
          style: style,
          image_number: imageNumber,
          created_at: new Date().toISOString(),
        };

        if (username) {
          insertData.username = username;
        }

        const { error: dbError } = await supabaseAdmin
          .from('generated_images')
          .insert(insertData);

        if (!dbError) {
          savedToSupabase = true;
          console.log('[generate] Saved Replicate URL as fallback');
        }
      } catch (fallbackError) {
        console.error('[generate] Fallback save also failed:', fallbackError);
        // Continua mesmo se tudo falhar
      }
    }

    return NextResponse.json({
      ok: true,
      imageBase64: generatedBase64,
      mimeType: 'image/jpeg', // nano-banana-2 retorna JPG
      replicateUrl: generatedUrl, // URL do Replicate (fallback)
      supabaseUrl: supabasePublicUrl, // URL do Supabase Storage
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
