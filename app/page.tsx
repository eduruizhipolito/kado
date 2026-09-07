import FormularioCodigo from './FormularioCodigo';

/**
 * Entrada por código escrito. Es el camino de respaldo: lo normal es escanear
 * el QR, y esta pantalla existe para cuando la cámara no colabora.
 */
export default function Inicio() {
  return (
    <main className="fixed inset-0 flex flex-col bg-tapa text-interior">
      <div className="flex h-[34%] w-full shrink-0 items-center justify-center">
        {/* La tapa lleva la marca. El logo es la única fuente: /brand/kado-logo.svg */}
        <img src="/brand/kado-logo.svg" alt="Kadó" width={96} height={96} className="h-24 w-24" />
      </div>
      <div className="h-[2px] w-full shrink-0 bg-costura" />
      <div className="flex min-h-0 flex-1 flex-col items-center px-6 pt-12 text-center">
        <h1 className="text-xl font-medium tracking-tight">Escribe tu código</h1>
        <p className="mt-2 text-[15px] text-interior/70">Está impreso en el papel que te dieron</p>
        <FormularioCodigo />
      </div>
    </main>
  );
}
