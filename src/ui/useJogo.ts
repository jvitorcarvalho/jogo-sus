import { useCallback, useEffect, useState } from 'react';
import { aplicarAcao } from '../engine/acoes';
import { criarPartida } from '../engine/partida';
import { avancarDia } from '../engine/passo';
import type { Acao, CenarioId, Estado } from '../engine/tipos';
import { salvarPartida } from '../storage/local';

export const MS_POR_DIA = 1500;

export interface Jogo {
  estado: Estado | null;
  velocidade: number;
  definirVelocidade(v: number): void;
  agir(acao: Acao): void;
  nova(cenario: CenarioId): void;
  retomar(estado: Estado): void;
  fechar(): void;
}

/** Guarda a partida em andamento e faz o relógio do jogo andar. */
export function useJogo(): Jogo {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [velocidade, setVelocidade] = useState(0);
  const emAndamento = estado !== null && !estado.fim;

  useEffect(() => {
    if (!emAndamento || velocidade === 0) return;
    const id = window.setInterval(() => setEstado((e) => (e ? avancarDia(e) : e)), MS_POR_DIA / velocidade);
    return () => window.clearInterval(id);
  }, [emAndamento, velocidade]);

  // Salvamento automático a cada mês de jogo.
  useEffect(() => {
    if (estado && !estado.fim && estado.dia > 0 && estado.dia % 30 === 0) salvarPartida(estado);
  }, [estado]);

  // Pausa quando a aba fica escondida e salva ao sair da página.
  useEffect(() => {
    const aoEsconder = (): void => {
      if (document.hidden) setVelocidade(0);
    };
    const aoSair = (): void => {
      if (estado && !estado.fim) salvarPartida(estado);
    };
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('pagehide', aoSair);
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('pagehide', aoSair);
    };
  }, [estado]);

  const agir = useCallback(
    (acao: Acao) => {
      if (!estado) return;
      const r = aplicarAcao(estado, acao);
      if (!r.ok) return;
      salvarPartida(r.estado);
      setEstado(r.estado);
    },
    [estado],
  );

  const retomar = useCallback((e: Estado) => {
    setVelocidade(0);
    setEstado(e);
  }, []);

  const nova = useCallback(
    (cenario: CenarioId) => {
      const semente = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
      retomar(criarPartida(cenario, semente));
    },
    [retomar],
  );

  const fechar = useCallback(() => {
    if (estado && !estado.fim) salvarPartida(estado);
    setVelocidade(0);
    setEstado(null);
  }, [estado]);

  return { estado, velocidade, definirVelocidade: setVelocidade, agir, nova, retomar, fechar };
}
