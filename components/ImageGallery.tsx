'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type GalleryImage = {
  id: string;
  public_url: string;
  style: string;
  created_at: string;
  image_number?: number;
};

type ApiResponse = {
  ok: boolean;
  images?: GalleryImage[];
  error?: string;
};

export default function ImageGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [mounted, setMounted] = useState(false);

  // Garante que o componente está montado antes de usar portal
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Adiciona timestamp para evitar cache do navegador e Vercel
      const timestamp = Date.now();
      const response = await fetch(`/api/gallery?t=${timestamp}&_=${Math.random()}`, {
        cache: 'no-store',
        next: { revalidate: 0 }, // Força revalidação no Next.js
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load gallery');
      }

      setImages(data.images || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load gallery';
      setError(message);
      console.error('[ImageGallery] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
    const handleImageGenerated = () => {
      setTimeout(() => {
        fetchGallery();
      }, 1000);
    };

    window.addEventListener('tangping:image-generated', handleImageGenerated);

    return () => {
      window.removeEventListener('tangping:image-generated', handleImageGenerated);
    };
  }, [fetchGallery]);

  // Fecha o modal com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Previne scroll do body
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  if (loading) {
    return (
      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
            Recent Creations
          </div>
          <h2 className="text-2xl font-black md:text-3xl">Latest TangPing Artworks</h2>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            Check out the most recent transformations created by the community.
          </p>
        </div>
        <div className="flex min-h-[200px] items-center justify-center rounded-[24px] border border-white/10 bg-black/20">
          <p className="text-white/60">Loading gallery...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
            Recent Creations
          </div>
          <h2 className="text-2xl font-black md:text-3xl">Latest TangPing Artworks</h2>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            Check out the most recent transformations created by the community.
          </p>
        </div>
        <div className="flex min-h-[200px] items-center justify-center rounded-[24px] border border-white/10 bg-black/20">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      </section>
    );
  }

  if (images.length === 0) {
    return (
      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
            Recent Creations
          </div>
          <h2 className="text-2xl font-black md:text-3xl">Latest TangPing Artworks</h2>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            Check out the most recent transformations created by the community.
          </p>
        </div>
        <div className="flex min-h-[200px] items-center justify-center rounded-[24px] border border-white/10 bg-black/20">
          <div className="max-w-md text-center text-white/55">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/7 text-3xl">
              🎨
            </div>
            <p className="text-xl font-bold text-white/80">No images yet</p>
            <p className="mt-3 text-sm leading-6">Be the first to generate a TangPing artwork!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="glass rounded-[28px] p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
            Recent Creations
          </div>
          <h2 className="text-2xl font-black md:text-3xl">Latest TangPing Artworks</h2>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            Check out the most recent transformations created by the community.
          </p>
        </div>
        <button
          onClick={fetchGallery}
          disabled={loading}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          title="Refresh gallery"
        >
          {loading ? '⟳' : '↻'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className="group relative cursor-pointer overflow-hidden rounded-[20px] border border-white/10 bg-black/20 transition hover:border-white/20 hover:bg-black/30 hover:scale-105"
          >
            <div className="relative aspect-square w-full">
              <Image
                src={image.public_url}
                alt={`TangPing ${image.style} style`}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Badge com número da imagem */}
              {image.image_number && (
                <div className="absolute top-2 left-2 rounded-full border border-white/30 bg-black/60 px-2 py-1 text-xs font-black text-white backdrop-blur-sm">
                  #{image.image_number}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-2 text-xs font-semibold text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                <div className="rounded-full border border-white/20 bg-black/40 px-2 py-1 capitalize">
                  {image.style}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de visualização - renderizado via portal no body */}
      {mounted && selectedImage && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-h-[95vh] max-w-7xl w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão fechar */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-20 md:-top-12 right-0 z-10 rounded-full border border-white/30 bg-black/80 p-3 text-white transition hover:bg-black hover:border-white/50"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Imagem */}
            <div className="relative rounded-[24px] border border-white/20 bg-black/60 p-6 backdrop-blur-sm shadow-2xl w-full md:w-1/2">
              <div className="relative aspect-square w-full overflow-hidden rounded-[20px]">
                <Image
                  src={selectedImage.public_url}
                  alt={`TangPing ${selectedImage.style} style #${selectedImage.image_number || ''}`}
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>

              {/* Informações */}
              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedImage.image_number && (
                    <div className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur-sm">
                      #{selectedImage.image_number}
                    </div>
                  )}
                  <div className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white capitalize backdrop-blur-sm">
                    {selectedImage.style}
                  </div>
                </div>
                <a
                  href={selectedImage.public_url}
                  download={`tangping-${selectedImage.image_number || Date.now()}.jpg`}
                  className="rounded-[18px] bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90 hover:scale-105"
                  onClick={(e) => e.stopPropagation()}
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
