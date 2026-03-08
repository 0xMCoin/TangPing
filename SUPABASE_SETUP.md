# Configuração do Supabase

Este guia explica como configurar o Supabase para salvar e exibir as imagens geradas.

**Nota:** As imagens são armazenadas diretamente no Replicate, então apenas salvamos a URL no banco de dados. Não é necessário criar buckets de Storage.

## 1. Criar a Tabela no Banco de Dados

1. Vá em **SQL Editor** no menu lateral
2. Execute o seguinte SQL:

```sql
-- Criar tabela para armazenar metadados das imagens geradas
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT, -- Opcional, não usado mais (mantido para compatibilidade)
  public_url TEXT NOT NULL, -- URL do Replicate onde a imagem está hospedada
  style TEXT NOT NULL CHECK (style IN ('cartoon', 'pixel', 'meme')),
  image_number INTEGER, -- Número sequencial da imagem (1, 2, 3, ...)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Public read access" ON generated_images
  FOR SELECT
  USING (true);

-- Política para permitir inserção apenas via service role
CREATE POLICY "Service role insert" ON generated_images
  FOR INSERT
  WITH CHECK (true);
```

**Se você já criou a tabela anteriormente**, execute este SQL para atualizar:

```sql
-- Atualizar tabela existente: tornar storage_path opcional e adicionar image_number
ALTER TABLE generated_images 
  ALTER COLUMN storage_path DROP NOT NULL;

-- Adicionar coluna image_number se não existir
ALTER TABLE generated_images 
  ADD COLUMN IF NOT EXISTS image_number INTEGER;
```

## 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### Como encontrar essas chaves:

1. **NEXT_PUBLIC_SUPABASE_URL**: 
   - Vá em **Settings** > **API**
   - Copie o valor de **Project URL**

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - Vá em **Settings** > **API**
   - Copie o valor de **anon** `public` key

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - Vá em **Settings** > **API**
   - Copie o valor de **service_role** `secret` key
   - ⚠️ **IMPORTANTE**: Esta chave é secreta e nunca deve ser exposta no cliente!

## 3. Verificar Configuração

Após configurar tudo:

1. Reinicie o servidor de desenvolvimento: `pnpm dev`
2. Gere uma imagem através da interface
3. Verifique se a imagem aparece na galeria abaixo do formulário
4. Verifique na tabela `generated_images` se o registro foi criado com a URL do Replicate

## Estrutura de Arquivos

- `lib/supabase.ts` - Cliente do Supabase (admin e público)
- `app/api/generate/route.ts` - Rota que salva imagens no Supabase após gerar
- `app/api/gallery/route.ts` - Rota que busca as últimas 5 imagens
- `components/ImageGallery.tsx` - Componente que exibe a galeria na página
