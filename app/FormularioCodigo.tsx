'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LARGO_CODIGO } from '@/lib/constantes';

/**
 * Sólo la parte del módulo de códigos que no toca `node:crypto` llega acá: la
 * derivación del keypair pasa siempre en el servidor.
 */
const ALFABETO_VISIBLE = /[^0-9A-HJ-KM-NP-TV-Z]/g;

export default function FormularioCodigo() {
  const router = useRouter();
  const [valor, setValor] = useState('');

  // Se corrigen en vivo las confusiones de lectura de un papel: O por 0, I y L
  // por 1. La normalización de verdad vuelve a hacerse en el servidor.
  const limpiar = (crudo: string) =>
    crudo
      .toUpperCase()
      .replace(/O/g, '0')
      .replace(/[IL]/g, '1')
      .replace(ALFABETO_VISIBLE, '')
      .slice(0, LARGO_CODIGO);

  const completo = valor.length === LARGO_CODIGO;

  return (
    <form
      className="mt-14 flex w-full max-w-sm flex-col items-center"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (completo) router.push(`/k/${valor}`);
      }}
    >
      <input
        value={agrupar(valor)}
        onChange={(evento) => setValor(limpiar(evento.target.value))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Código del Kadó"
        placeholder="0000-0000-0000"
        className="w-full border-0 border-b-2 border-costura bg-transparent pb-3 text-center text-2xl tracking-[0.12em] text-interior placeholder:text-interior/25 focus:outline-none"
      />

      <button
        type="submit"
        disabled={!completo}
        className="mt-10 h-14 w-full bg-interior text-lg font-semibold text-tinta transition-opacity active:opacity-80 disabled:opacity-30"
      >
        Continuar
      </button>
    </form>
  );
}

/** Muestra `04F2-9KQX-M2VN` mientras el estado guarda `04F29KQXM2VN`. */
function agrupar(codigo: string): string {
  return codigo.replace(/(.{4})(?=.)/g, '$1-');
}
