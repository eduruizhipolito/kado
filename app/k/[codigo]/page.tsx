import { resolverCodigo } from '@/lib/vista';

import Kado from './Kado';

/** El estado vive en la cadena, así que nunca se sirve una versión cacheada. */
export const dynamic = 'force-dynamic';

export default async function PaginaKado({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;

  let resuelto;
  try {
    resuelto = await resolverCodigo(codigo);
  } catch (error) {
    // Horizon caído o sin conexión. No se le puede decir a la persona que su
    // Kadó no existe cuando lo que falló fue la red.
    console.error('[kado] no se pudo resolver el código', error);
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center bg-tapa px-6 text-center text-interior">
        <p className="text-xl font-medium">No se pudo conectar</p>
        <p className="mt-3 text-[15px] text-interior/70">
          Vuelve a cargar la página en un momento.
        </p>
      </main>
    );
  }

  if (!resuelto) {
    return <Kado inicial={{ vista: 'noExiste' }} codigo={codigo} />;
  }

  return <Kado inicial={resuelto.vista} codigo={resuelto.codigo} />;
}
