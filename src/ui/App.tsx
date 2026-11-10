import { useEffect, useMemo, useState } from 'react';
import { simularSemSUS } from '../engine/semSUS';
import type { Estado } from '../engine/tipos';
import { nota, totais } from '../engine/visao';
import { apagarPartida, carregarPartida, registrarRanking, type Carregamento, type EntradaRanking } from '../storage/local';
import { Jogo } from './Jogo';
import { FimDePartida, Inicio, Sobre, type Resultado } from './Telas';
import { useJogo } from './useJogo';

function resultadoDe(estado: Estado): Resultado {
  const obitos = totais(estado).obitos;
  const obitosSemSUS = simularSemSUS(estado.cenario, estado.semente, estado.dia).obitos;
  return { obitos, obitosSemSUS, nota: nota(Math.max(0, obitosSemSUS - obitos), obitosSemSUS) };
}

export function App() {
  const jogo = useJogo();
  const [sobreAberto, setSobreAberto] = useState(false);
  const [salvo, setSalvo] = useState<Carregamento>(() => carregarPartida());
  const [ranking, setRanking] = useState<EntradaRanking[]>([]);
  const { estado } = jogo;
  const terminou = estado?.fim ? estado : null;

  const resultado = useMemo(() => (terminou ? resultadoDe(terminou) : null), [terminou]);

  // Ao terminar: a partida salva some e o resultado entra no ranking, uma vez só.
  useEffect(() => {
    if (!terminou || !resultado) return;
    apagarPartida();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- grava no armazenamento e reflete o que foi gravado
    setRanking(
      registrarRanking({
        cenario: terminou.cenario,
        vidasSalvas: Math.round(Math.max(0, resultado.obitosSemSUS - resultado.obitos)),
        obitos: Math.round(resultado.obitos),
        nota: resultado.nota,
        fim: terminou.fim!,
        dias: terminou.dia,
        data: new Date().toISOString().slice(0, 10),
      }),
    );
  }, [terminou, resultado]);

  const semPartida = estado === null;
  useEffect(() => {
    // Com chaves: scrollTo devolve uma Promise nos navegadores novos, e o efeito não pode devolvê-la.
    window.scrollTo(0, 0);
  }, [semPartida, terminou, sobreAberto]);

  const irAoMenu = (): void => {
    jogo.fechar();
    setSalvo(carregarPartida());
  };

  if (terminou && resultado) {
    return <FimDePartida estado={terminou} resultado={resultado} ranking={ranking} denovo={() => jogo.nova(terminou.cenario)} menu={irAoMenu} />;
  }
  if (estado) {
    // A chave recria a tela (seleção, ajuda) quando começa outra partida.
    return <Jogo key={estado.semente} estado={estado} velocidade={jogo.velocidade} definirVelocidade={jogo.definirVelocidade} agir={jogo.agir} sair={irAoMenu} />;
  }
  if (sobreAberto) return <Sobre voltar={() => setSobreAberto(false)} />;

  const partidaSalva = salvo.tipo === 'ok' && !salvo.estado.fim ? salvo.estado : null;
  return (
    <Inicio
      partidaSalva={partidaSalva}
      aviso={salvo.tipo === 'incompativel' ? 'O jogo foi atualizado e a partida salva anterior não pôde ser aproveitada.' : null}
      novo={jogo.nova}
      continuar={() => partidaSalva && jogo.retomar(partidaSalva)}
      sobre={() => setSobreAberto(true)}
    />
  );
}
