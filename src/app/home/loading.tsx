import WaveformLoader from '@/components/custom/WaveformLoader';

export default function Loading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <WaveformLoader className="w-24 h-auto text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">
        Cargando dashboard...
      </p>
    </div>
  );
}