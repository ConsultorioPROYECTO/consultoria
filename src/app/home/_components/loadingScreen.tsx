import UiScreen from '@rutas/components/uiscreen';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';

export function LoadingScreen() {
  return (
    <UiScreen className="flex h-screen flex-col items-center justify-center ">
      <p className="font-bold text-muted-foreground text-2xl text-center">Preparando<br/>tu<br/>espacio</p>
      <WaveformLoader className="mt-4 w-30 h-auto text-muted-foreground" />
    </UiScreen>
  );
}