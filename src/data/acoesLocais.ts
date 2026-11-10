import type { AcaoLocalId, AlvoMod } from '../engine/tipos';

export interface AcaoLocal {
  id: AcaoLocalId;
  nome: string;
  descricao: string;
  custo: number;
  dias: number;
  alvo: AlvoMod;
  fator: number;
  /** Só existe em cenário com vetor (mosquito). */
  soVetor?: boolean;
  /** Exige vacina disponível. */
  exigeVacina?: boolean;
}

export const ACOES_LOCAIS: Record<AcaoLocalId, AcaoLocal> = {
  forca: {
    id: 'forca',
    nome: 'Enviar Força Nacional do SUS',
    descricao: 'Profissionais de outros estados reforçam os hospitais por 30 dias.',
    custo: 25,
    dias: 30,
    alvo: 'leitos',
    fator: 1.5,
  },
  leitos: {
    id: 'leitos',
    nome: 'Abrir leitos de campanha',
    descricao: 'Hospital de campanha amplia os leitos por 60 dias.',
    custo: 30,
    dias: 60,
    alvo: 'leitos',
    fator: 1.4,
  },
  campanha: {
    id: 'campanha',
    nome: 'Campanha de vacinação',
    descricao: 'Dia D, postos volantes e busca ativa triplicam a vacinação por 30 dias.',
    custo: 20,
    dias: 30,
    alvo: 'vacina',
    fator: 3,
    exigeVacina: true,
  },
  mutirao: {
    id: 'mutirao',
    nome: 'Mutirão contra o mosquito',
    descricao: 'Agentes de endemias eliminam criadouros; a transmissão cai 40% por 45 dias.',
    custo: 15,
    dias: 45,
    alvo: 'beta',
    fator: 0.6,
    soVetor: true,
  },
};

export const ACAO_LOCAL_IDS = Object.keys(ACOES_LOCAIS) as AcaoLocalId[];
