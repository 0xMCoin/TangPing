import ImageUploader from '@/components/ImageUploader';
import ImageGallery from '@/components/ImageGallery';

export default function HomePage() {
  return (
    <main className="page-shell relative overflow-hidden px-4 py-10 md:px-8 md:py-12">
      <div className="hero-glow left-[-80px] top-[60px] absolute" />
      <div className="hero-glow right-[-120px] top-[240px] absolute" />

      <div className="mx-auto max-w-7xl">
        <header className="relative mb-10 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-10 shadow-2xl md:px-10 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_24%)]" />

          <div className="relative z-10 max-w-4xl">
            <div className="mb-4 inline-flex rounded-full border border-green-400/25 bg-green-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-green-300">
              Become TangPing
            </div>
            <h1 className="text-4xl font-black leading-tight md:text-6xl md:leading-[1.02]">
              Turn any photo into a <span className="text-green-400">TangPing</span> meme masterpiece.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/72 md:text-lg">
              Upload a selfie, avatar, NFT, or profile image and transform it into a lie-flat crypto art scene with
              tatami, coins, candles, and pure unbothered energy.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Drag & Drop Upload</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Live Preview</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Cartoon / Pixel / Meme</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Download Ready</div>
            </div>
          </div>
        </header>

        <ImageUploader />

        <div className="mt-10">
          <ImageGallery />
        </div>
      </div>
    </main>
  );
}