import type { FrenteId } from '../engine/tipos';

export interface Fato {
  texto: string;
  frente: FrenteId;
  /** Página oficial onde o fato foi conferido. */
  url: string;
  fonte: string;
  /** Data da conferência, AAAA-MM-DD. */
  consultadoEm: string;
}

// Regra: nada entra aqui de memória. Cada fato foi lido na página indicada na data indicada.
export const FATOS: Fato[] = [
  {
    texto:
      'O SUS foi organizado pela Lei nº 8.080, de 19 de setembro de 1990. Ela define o SUS como o conjunto das ações e serviços de saúde prestados por órgãos públicos federais, estaduais e municipais.',
    frente: 'atencao',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8080.htm',
    fonte: 'Lei nº 8.080/1990, art. 4º',
    consultadoEm: '2026-11-10',
  },
  {
    texto:
      'A lei do SUS garante acesso universal: todos têm direito aos serviços de saúde, em todos os níveis de assistência, sem preconceitos ou privilégios de qualquer espécie.',
    frente: 'atencao',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8080.htm',
    fonte: 'Lei nº 8.080/1990, art. 7º, incisos I e IV',
    consultadoEm: '2026-11-10',
  },
  {
    texto:
      'A Estratégia Saúde da Família trabalha com equipes multiprofissionais e organiza o cuidado a partir da pessoa, da família e do território onde ela vive.',
    frente: 'atencao',
    url: 'https://www.gov.br/saude/pt-br/composicao/saps/estrategia-saude-da-familia',
    fonte: 'Ministério da Saúde, Estratégia Saúde da Família',
    consultadoEm: '2026-11-10',
  },
  {
    texto:
      'Notificação compulsória é a comunicação obrigatória de certas doenças à autoridade de saúde. Vale para médicos, profissionais e estabelecimentos de saúde, públicos ou privados. É assim que o país enxerga um surto.',
    frente: 'vigilancia',
    url: 'https://www.gov.br/saude/pt-br/composicao/svsa/vigilancia-de-doencas-cronicas-nao-transmissiveis/notificacao-compulsoria',
    fonte: 'Ministério da Saúde, Notificação Compulsória',
    consultadoEm: '2026-11-10',
  },
  {
    texto:
      'As vacinas do Calendário Nacional de Vacinação são aplicadas de graça nas salas de vacinação das Unidades Básicas de Saúde em todo o país. O calendário é atualizado pelo Programa Nacional de Imunizações.',
    frente: 'imunizacao',
    url: 'https://www.gov.br/saude/pt-br/vacinacao',
    fonte: 'Ministério da Saúde, Vacinação',
    consultadoEm: '2026-11-10',
  },
  {
    texto:
      'O Brasil era considerado livre do sarampo em 2016. Em 2018, as baixas coberturas vacinais permitiram a volta do vírus. O país só recuperou o certificado em 12 de novembro de 2024, entregue pela Organização Pan-Americana da Saúde.',
    frente: 'imunizacao',
    url: 'https://www.gov.br/saude/pt-br/assuntos/noticias/2024/novembro/brasil-recebe-recertificacao-de-pais-livre-do-sarampo',
    fonte: 'Ministério da Saúde, notícia de 12/11/2024',
    consultadoEm: '2026-11-10',
  },
  {
    texto:
      'A queda da vacinação custou ao Brasil o certificado de país livre do sarampo. A confiança da população na vacina é parte da defesa contra a doença.',
    frente: 'comunicacao',
    url: 'https://www.gov.br/saude/pt-br/assuntos/noticias/2024/novembro/brasil-recebe-recertificacao-de-pais-livre-do-sarampo',
    fonte: 'Ministério da Saúde, notícia de 12/11/2024',
    consultadoEm: '2026-11-10',
  },
  {
    texto: 'O SAMU é gratuito, atende pelo telefone 192 e funciona 24 horas por dia, 7 dias por semana.',
    frente: 'urgencia',
    url: 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192',
    fonte: 'Ministério da Saúde, SAMU 192',
    consultadoEm: '2026-11-10',
  },
  {
    texto:
      'A Força Nacional do SUS existe de verdade: foi criada pelo Decreto nº 7.616, de 17 de novembro de 2011, para atuar em epidemias, desastres e situações de desassistência à população.',
    frente: 'urgencia',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/decreto/d7616.htm',
    fonte: 'Decreto nº 7.616/2011, art. 12',
    consultadoEm: '2026-11-10',
  },
];

/** Domínios aceitos como fonte. */
export const DOMINIOS_PERMITIDOS = ['gov.br', 'ibge.gov.br', 'fiocruz.br', 'paho.org', 'who.int'];
