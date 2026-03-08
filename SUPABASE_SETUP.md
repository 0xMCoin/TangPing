# Configuração do Supabase

Este guia explica como configurar o Supabase para salvar e exibir as imagens geradas.

**Nota:** As imagens geradas são automaticamente enviadas para o Supabase Storage para garantir que tenhamos controle total sobre os arquivos.

## 1. Criar o Bucket de Storage

1. Vá em **Storage** no menu lateral do Supabase
2. Clique em **New bucket**
3. Configure o bucket:
   - **Name**: `tangping-images`
   - **Public bucket**: ✅ **Marcar como público** (para permitir acesso às imagens)
   - **File size limit**: Deixe o padrão ou ajuste conforme necessário
   - **Allowed MIME types**: `image/jpeg, image/jpg, image/png` (ou deixe vazio para permitir todos)
4. Clique em **Create bucket**

### Configurar Políticas de Acesso do Storage

Após criar o bucket, configure as políticas de acesso:

1. Vá em **Storage** > **Policies** > **tangping-images**
2. Clique em **New Policy**
3. Selecione **For full customization**, clique em **Use a template** e escolha **Allow public read access**
4. Execute o seguinte SQL no **SQL Editor**:

```sql
-- Política para permitir leitura pública do bucket
CREATE POLICY "Public read access for tangping-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tangping-images');

-- Política para permitir upload apenas via service role
CREATE POLICY "Service role upload for tangping-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tangping-images');
```

## 2. Criar a Tabela no Banco de Dados

1. Vá em **SQL Editor** no menu lateral
2. Execute o seguinte SQL:

```sql
-- Criar tabela para armazenar metadados das imagens geradas
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL, -- Caminho no Supabase Storage
  public_url TEXT NOT NULL, -- URL pública da imagem no Supabase
  style TEXT NOT NULL CHECK (style IN ('cartoon', 'pixel', 'meme')),
  image_number INTEGER, -- Número sequencial da imagem (1, 2, 3, ...)
  username TEXT, -- Username opcional do criador da imagem
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
-- Atualizar tabela existente: tornar storage_path obrigatório novamente
ALTER TABLE generated_images 
  ALTER COLUMN storage_path SET NOT NULL;

-- Adicionar coluna image_number se não existir
ALTER TABLE generated_images 
  ADD COLUMN IF NOT EXISTS image_number INTEGER;

-- Adicionar coluna username se não existir
ALTER TABLE generated_images 
  ADD COLUMN IF NOT EXISTS username TEXT;
```

## 3. Configurar Variáveis de Ambiente

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

## 4. Verificar Configuração

Após configurar tudo:

1. Reinicie o servidor de desenvolvimento: `pnpm dev`
2. Gere uma imagem através da interface
3. Verifique se a imagem aparece na galeria abaixo do formulário
4. Verifique no Storage se a imagem foi enviada para o bucket `tangping-images`
5. Verifique na tabela `generated_images` se o registro foi criado com:
   - `storage_path`: caminho no Storage (ex: `generated/tangping-1-1234567890.jpg`)
   - `public_url`: URL pública do Supabase Storage

## Estrutura de Arquivos

- `lib/supabase.ts` - Cliente do Supabase (admin e público)
- `app/api/generate/route.ts` - Rota que salva imagens no Supabase após gerar
- `app/api/gallery/route.ts` - Rota que busca as últimas 5 imagens
- `components/ImageGallery.tsx` - Componente que exibe a galeria na página
