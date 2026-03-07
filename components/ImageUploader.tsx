'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { STYLE_OPTIONS, type StyleMode } from '@/lib/prompts';

type ApiSuccess = {
  ok: true;
  imageBase64: string;
  mimeType: string;
};

type ApiError = {
  ok: false;
  error: string;
};

export default function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState<StyleMode>('cartoon');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0] ?? null;
    setFile(selected);
    setResultUrl(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
  });

  async function handleGenerate() {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('style', style);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as ApiSuccess | ApiError;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'Failed to generate image.' : data.error);
      }

      const dataUrl = `data:${data.mimeType};base64,${data.imageBase64}`;
      setResultUrl(dataUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-green-300">
              Upload & Create
            </div>
            <h2 className="text-2xl font-black md:text-3xl">Come become TangPing</h2>
            <p className="mt-2 max-w-xl text-sm text-white/70 md:text-base">
              Drop your photo, pick a style, and generate your own lie-flat crypto meme artwork.
            </p>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`soft-grid flex min-h-[320px] cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-black/20 p-5 text-center transition ${
            isDragActive ? 'dropzone-active' : 'hover:border-white/25 hover:bg-black/30'
          }`}
        >
          <input {...getInputProps()} />

          {previewUrl ? (
            <div className="w-full">
              <p className="mb-4 text-sm font-semibold text-green-300">Uploaded Preview</p>
              <div className="relative h-[320px] w-full overflow-hidden rounded-[20px] border border-white/10 bg-black/30">
                <Image src={previewUrl} alt="Uploaded preview" fill className="object-contain" unoptimized />
              </div>
              <p className="mt-4 text-sm text-white/60">Drag another image here or click to replace it.</p>
            </div>
          ) : (
            <div className="max-w-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-400/12 text-3xl">
                🀄
              </div>
              <h3 className="text-xl font-bold">Drag & drop your image here</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Or click to browse. Best results come from avatars, profile pictures, selfies, and character art with
                a clear face.
              </p>
              <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70">
                PNG, JPG or WEBP
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {STYLE_OPTIONS.map((option) => {
            const active = style === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStyle(option.value)}
                className={`rounded-[20px] border p-4 text-left transition ${
                  active
                    ? 'border-green-400 bg-green-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="text-base font-bold">{option.label}</div>
                <div className="mt-1 text-sm text-white/60">{option.description}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-[18px] bg-green-400 px-6 py-4 text-base font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Generating your TangPing...' : 'Generate TangPing'}
          </button>

          {file ? (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setResultUrl(null);
                setError(null);
              }}
              className="inline-flex items-center justify-center rounded-[18px] border border-white/12 bg-white/5 px-6 py-4 text-base font-bold text-white transition hover:bg-white/10"
            >
              Clear Image
            </button>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </section>

      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            Final Result
          </div>
          <h2 className="text-2xl font-black md:text-3xl">Your TangPing is born here</h2>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            Once generated, your final image appears here ready to save and share.
          </p>
        </div>

        <div className="flex min-h-[560px] items-center justify-center rounded-[24px] border border-white/10 bg-black/20 p-4">
          {resultUrl ? (
            <div className="w-full">
              <p className="mb-4 text-sm font-semibold text-cyan-300">Generated Preview</p>
              <div className="relative h-[460px] w-full overflow-hidden rounded-[20px] border border-white/10 bg-black/30">
                <Image src={resultUrl} alt="Generated TangPing" fill className="object-contain" unoptimized />
              </div>
              <a
                href={resultUrl}
                download={`tangping-${Date.now()}.png`}
                className="mt-5 inline-flex rounded-[18px] bg-white px-5 py-3 font-black text-black transition hover:bg-white/90"
              >
                Download Image
              </a>
            </div>
          ) : (
            <div className="max-w-md text-center text-white/55">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/7 text-3xl">
                ✨
              </div>
              <p className="text-xl font-bold text-white/80">Your TangPing preview will appear here</p>
              <p className="mt-3 text-sm leading-6">
                Upload your image on the left, choose a style, and click generate.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}