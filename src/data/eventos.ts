import type { AlvoMod } from '../engine/tipos';

export type Efeito =
  | { tipo: 'confianca'; valor: number; atenuaComunicacao?: boolean }
  | { tipo: 'orcamento'; valor: number }
  | { tipo: 'mod'; alvo: AlvoMod; fator: number; dias: number; regional?: boolean };

export interface OpcaoEvento {
  rotulo: string;
  custo?: number;
  efeitos: Efeito[];
  resultado: string;
}

export interface Evento {
  id: string;
  titulo: string;
  /** "{ufs}" é trocado pelos estados atingidos quando o evento é regional. */
  texto: string;
  regional?: boolean;
  opcoes: OpcaoEvento[];
}

const PERMANENTE = 9999;

export const EVENTOS: Record<string, Evento> = {
  boato: {
    id: 'boato',
    titulo: 'Boato se espalha nas redes',
    texto: 'Mensagens falsas dizem que a vacina faz mal. Postos de saúde relatam famílias desistindo de se vacinar.',
    opcoes: [
      {
        rotulo: 'Esclarecer com profissionais de saúde',
        custo: 20,
        efeitos: [{ tipo: 'confianca', valor: -2 }],
        resultado: 'Agentes de saúde foram de casa em casa. O boato perdeu força.',
      },
      {
        rotulo: 'Não responder',
        efeitos: [
          { tipo: 'confianca', valor: -12, atenuaComunicacao: true },
          { tipo: 'mod', alvo: 'vacina', fator: 0.6, dias: 45 },
        ],
        resultado: 'Sem resposta, o boato cresceu e a vacinação caiu por semanas.',
      },
    ],
  },
  corte: {
    id: 'corte',
    titulo: 'Repasse menor neste mês',
    texto: 'A arrecadação caiu e o dinheiro disponível para a saúde diminuiu. Algo vai ficar sem cobertura.',
    opcoes: [
      {
        rotulo: 'Absorver no orçamento',
        efeitos: [{ tipo: 'orcamento', valor: -40 }],
        resultado: 'O caixa encolheu, mas os serviços seguiram funcionando.',
      },
      {
        rotulo: 'Adiar manutenção dos hospitais',
        efeitos: [{ tipo: 'mod', alvo: 'leitos', fator: 0.85, dias: 60 }],
        resultado: 'Equipamentos parados reduziram os leitos disponíveis por dois meses.',
      },
    ],
  },
  enchente: {
    id: 'enchente',
    titulo: 'Enchente atinge {ufs}',
    texto: 'Famílias desabrigadas, abrigos lotados e unidades de saúde alagadas em {ufs}.',
    regional: true,
    opcoes: [
      {
        rotulo: 'Enviar equipes e insumos',
        custo: 30,
        efeitos: [{ tipo: 'mod', alvo: 'beta', fator: 1.1, dias: 30, regional: true }],
        resultado: 'Equipes de saúde chegaram aos abrigos e contiveram o pior.',
      },
      {
        rotulo: 'Manter os recursos onde estão',
        efeitos: [
          { tipo: 'mod', alvo: 'beta', fator: 1.4, dias: 60, regional: true },
          { tipo: 'mod', alvo: 'leitos', fator: 0.8, dias: 60, regional: true },
        ],
        resultado: 'Sem reforço, a doença se espalhou nos abrigos e os hospitais locais perderam capacidade.',
      },
    ],
  },
  insumo: {
    id: 'insumo',
    titulo: 'Falta de insumo hospitalar',
    texto: 'Hospitais avisam que medicamentos e materiais básicos acabam em poucos dias.',
    opcoes: [
      {
        rotulo: 'Compra emergencial',
        custo: 30,
        efeitos: [],
        resultado: 'A compra chegou a tempo. Nenhum leito foi fechado.',
      },
      {
        rotulo: 'Racionar o que há',
        efeitos: [{ tipo: 'mod', alvo: 'leitos', fator: 0.8, dias: 45 }],
        resultado: 'Leitos ficaram fechados por falta de material.',
      },
    ],
  },
  feriado: {
    id: 'feriado',
    titulo: 'Feriado prolongado',
    texto: 'Rodoviárias e aeroportos cheios. Muita gente viajando e se encontrando ao mesmo tempo.',
    opcoes: [
      {
        rotulo: 'Campanha de prevenção',
        custo: 15,
        efeitos: [{ tipo: 'mod', alvo: 'beta', fator: 1.08, dias: 15 }],
        resultado: 'Orientação nas estradas e terminais reduziu o contágio do feriado.',
      },
      {
        rotulo: 'Deixar passar',
        efeitos: [{ tipo: 'mod', alvo: 'beta', fator: 1.3, dias: 15 }],
        resultado: 'Duas semanas depois do feriado, os casos subiram.',
      },
    ],
  },
  doacao: {
    id: 'doacao',
    titulo: 'Reforço de universidades e voluntários',
    texto: 'Hospitais universitários abrem alas e estudantes da saúde se oferecem para ajudar.',
    opcoes: [
      {
        rotulo: 'Integrar à rede',
        efeitos: [
          { tipo: 'mod', alvo: 'leitos', fator: 1.15, dias: 60 },
          { tipo: 'confianca', valor: 3 },
        ],
        resultado: 'A rede ganhou fôlego por dois meses.',
      },
    ],
  },
  variante: {
    id: 'variante',
    titulo: 'Nova variante identificada',
    texto: 'Laboratórios encontram uma versão do vírus que se transmite com mais facilidade.',
    opcoes: [
      {
        rotulo: 'Reforçar o sequenciamento',
        custo: 25,
        efeitos: [{ tipo: 'mod', alvo: 'beta', fator: 1.12, dias: PERMANENTE }],
        resultado: 'Com a variante mapeada cedo, as medidas foram ajustadas a tempo.',
      },
      {
        rotulo: 'Só acompanhar',
        efeitos: [{ tipo: 'mod', alvo: 'beta', fator: 1.3, dias: PERMANENTE }],
        resultado: 'A variante se espalhou sem ser percebida e virou a dominante.',
      },
    ],
  },
};
