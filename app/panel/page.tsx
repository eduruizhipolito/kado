import { EXPLORADOR, RED } from '@/lib/config';
import { aFechaCorta } from '@/lib/dinero';
import { leerPanel, type MetricasTanda } from '@/lib/metricas';

export const dynamic = 'force-dynamic';

/**
 * Panel del organizador. Herramienta interna: densidad alta, cero decoración.
 * Es la fuente de las métricas del piloto, así que cada número enlaza a lo
 * que cualquiera puede comprobar por su cuenta en el explorador.
 */
export default async function PaginaPanel() {
  const panel = await leerPanel();

  return (
    <main className="min-h-dvh bg-white px-8 py-10 text-tinta">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Kadó · panel</h1>
        <div className="flex items-center gap-6 text-[13px]">
          <span className="text-tinta/50">
            Red: <strong className="font-semibold text-tinta">{RED}</strong>
          </span>
          <a
            href="/panel/exportar"
            className="border border-tinta px-4 py-2 font-semibold transition-colors hover:bg-tinta hover:text-white"
          >
            Exportar
          </a>
        </div>
      </header>

      {panel.patrocinadora.alerta ? (
        <p className="mt-6 border-l-4 border-costura bg-costura/10 px-4 py-3 text-[15px]">
          <strong className="font-semibold">Saldo bajo en la patrocinadora.</strong> Quedan{' '}
          {panel.patrocinadora.saldoXlm} XLM. Si se agota, dejan de abrirse todos los Kadós a la
          vez. Recarga antes del próximo evento.
        </p>
      ) : null}

      <section className="mt-10 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
        <Metrica valor={String(panel.generados)} etiqueta="Kadós generados" />
        <Metrica valor={String(panel.abiertos)} etiqueta="Kadós abiertos" />
        <Metrica valor={porcentaje(panel.tasaApertura)} etiqueta="Tasa de apertura" />
        <Metrica valor={duracion(panel.medianaMinutos)} etiqueta="Tiempo mediano" />
      </section>

      <section className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-left text-[14px]">
          <thead>
            <tr className="bg-tapa text-white">
              {['Evento', 'Fecha', 'Generados', 'Abiertos', 'Tasa', 'Tiempo mediano', 'Estado'].map(
                (encabezado) => (
                  <th key={encabezado} className="px-4 py-3 font-semibold">
                    {encabezado}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {panel.tandas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-tinta/50">
                  Todavía no hay tandas. Genera una con{' '}
                  <code className="bg-tinta/5 px-1">npm run generar-tanda</code>.
                </td>
              </tr>
            ) : (
              panel.tandas.map((fila) => <Fila key={fila.tanda.id} fila={fila} />)
            )}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 border-t border-tinta/10 pt-6 text-[13px] text-tinta/60">
        <p>
          Cuenta patrocinadora{' '}
          <a
            href={`${EXPLORADOR}/account/${panel.patrocinadora.cuenta}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {panel.patrocinadora.cuenta}
          </a>
          {' · '}
          {panel.patrocinadora.saldoXlm} XLM
          {' · '}
          {panel.patrocinadora.reservas} reservas patrocinadas
        </p>
        <p className="mt-2">
          Todos los números salen de la cadena. Cada Kadó abierto es una cuenta Stellar creada por
          esta patrocinadora, verificable en el explorador.
        </p>
      </footer>
    </main>
  );
}

function Fila({ fila }: { fila: MetricasTanda }) {
  const { tanda } = fila;
  return (
    <tr className="border-b border-tinta/10">
      <td className="px-4 py-3">
        <span className="font-medium">{tanda.evento}</span>
        {tanda.hashes[0] ? (
          <a
            href={`${EXPLORADOR}/tx/${tanda.hashes[0]}`}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-[12px] text-tinta/40 underline underline-offset-2"
          >
            tx
          </a>
        ) : null}
      </td>
      <td className="px-4 py-3 text-tinta/70">{aFechaCorta(tanda.fecha)}</td>
      <td className="px-4 py-3 tabular-nums">{fila.generados}</td>
      <td className="px-4 py-3 tabular-nums">{fila.abiertos}</td>
      <td className="px-4 py-3 tabular-nums">{porcentaje(fila.tasaApertura)}</td>
      <td className="px-4 py-3 tabular-nums">{duracion(fila.medianaMinutos)}</td>
      <td className="px-4 py-3 text-tinta/70">{fila.vencida ? 'Vencida' : 'Abierta'}</td>
    </tr>
  );
}

function Metrica({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div>
      <p className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums">{valor}</p>
      <p className="mt-1 text-[13px] text-tinta/60">{etiqueta}</p>
    </div>
  );
}

function porcentaje(fraccion: number): string {
  return `${Math.round(fraccion * 100)}%`;
}

/** Minutos a algo legible. La mediana suele estar en minutos, no en días. */
function duracion(minutos: number | null): string {
  if (minutos === null) return '—';
  if (minutos < 1) return `${Math.round(minutos * 60)} s`;
  if (minutos < 90) return `${Math.round(minutos)} min`;
  if (minutos < 60 * 48) return `${Math.round(minutos / 60)} h`;
  return `${Math.round(minutos / 1440)} d`;
}
