# Remix of Auditoria - saas

# Arquitetura do Aplicativo: Gestor de Auditorias

## Descrição Geral

Um sistema mobile focado no registro de auditorias internas, permitindo avaliar conformidade por setor, gerar relatórios em PDF e exportar dados. O design deve ser minimalista (estilo Arctic) usando a paleta #2B7FE0 e #3C82DC.

## Funcionalidades Principais

* **Offline First:** O aplicativo deve permitir a realização de auditorias sem conexão com a internet, sincronizando os dados localmente.

* **Auditorias Dinâmicas:** As perguntas do formulário variam de acordo com o setor selecionado.

* **Relatórios Automatizados:** Geração de PDF ao finalizar o formulário.

* **Gestão de Dados:** Backup, Restore e Exportação para planilha (CSV/XLS).

## Estrutura de Telas

1. **Seleção de Setores:** Lista de setores disponíveis. Ao selecionar, carrega o schema de perguntas específico.

2. **Formulário de Auditoria:** Interface limpa contendo as perguntas. Cada pergunta possui: 

   - Radio buttons (Conforme, Não Conforme, Não se Aplica).

   - Campo de texto para comentários detalhados.

3. **Dashboard Crítico:** Gráfico ou lista destacando setores com maior volume de "Não Conforme".

4. **Histórico de Relatórios:** Tabela de auditorias realizadas com filtros por data e setor.

5. **Gestão de Dados:** Ferramentas para exportar dados e realizar backup/restauração local.

## Modelo de Dados

* **Setor:** ID, Nome, Configuração de Perguntas.

* **Pergunta:** ID, SetorID, Texto da Pergunta.

* **Auditoria:** ID, SetorID, Data, Status.

* **Resposta:** AuditoriaID, PerguntaID, Status (Conforme/Não Conforme/N/A), Comentário.

## Regras de Negócio

* Ao finalizar uma auditoria, o sistema calcula a pontuação de conformidade.

* O dashboard deve ordenar setores pela soma de indicadores "Não Conforme".

* O backup deve ser um arquivo local que o usuário pode armazenar externamente.

## UX/UI (Estilo Arctic)

* **Paleta:** Fundo branco, elementos principais em tons de azul (#2B7FE0 / #3C82DC).

* **Tipografia:** Limpa e legível (Sans-serif).

* **Espaçamento:** Foco em áreas amplas de toque para preenchimento ágil.

## Prioridades de Implementação

1. Banco de dados local para suportar o modo offline.

2. Lógica de renderização de perguntas dinâmica baseada no setor.

3. Fluxo de preenchimento (Formulário) e finalização (Geração de PDF).

4. Dashboard de métricas de criticidade.

5. Funcionalidades de backup/restore e exportação CSV.

Segue abaixo as perguntas 

Aqui está o roteiro transformado em um **Checklist de Visita Técnica da SCIRAS**, formatado com as colunas de conformidade (**C** = Conforme | **NC** = Não Conforme | **NA** = Não se Aplica) e um espaço para observações/plano de ação.

Você pode copiar esta estrutura para um documento de texto, planilha ou imprimir para uso em campo.

---

# 📑 CHECKLIST DE VISITA TÉCNICA – SCIRAS

**Data da Visita:** **/**/_______

**Avaliador(es):** ______________________________________________________

**Setor Avaliado:** _____________________________________________________

---

## 📋 1. Requisitos Gerais (Aplicável a todos os setores)

| Itens a Avaliar | C | NC | NA | Observações / Evidências / Ações |

| --- | --- | --- | --- | --- |

| **1.1** Pias para higienização das mãos exclusivas, limpas e desimpedidas? | ☐ | ☐ | ☐ |  |

| **1.2** Há insumos completos? (Sabonete líquido e papel toalha) | ☐ | ☐ | ☐ |  |

| **1.3** Dispensadores de álcool 70% estão abastecidos e dentro da validade? | ☐ | ☐ | ☐ |  |

| **1.4** Profissionais aderem à higienização das mãos nos momentos críticos? | ☐ | ☐ | ☐ |  |

| **1.5** EPIs recomendados estão disponíveis em quantidade e tamanhos adequados? | ☐ | ☐ | ☐ |  |

| **1.6** Os profissionais utilizam os EPIs de forma correta? | ☐ | ☐ | ☐ |  |

| **1.7** Adornos estão sendo retirados pela equipe (NR-32)? | ☐ | ☐ | ☐ |  |

| **1.8** Lixeiras possuem tampa e acionamento por pedal (sem contato manual)? | ☐ | ☐ | ☐ |  |

| **1.9** Sacos de lixo seguem a cor do PGRSS? (Branco: infectante | Preto/Cinza: comum) | ☐ | ☐ | ☐ |

| **1.10** Coletores de perfurocortantes estão dentro do limite de preenchimento (2/3)? | ☐ | ☐ | ☐ |  |

| **1.11** O coletor de perfurocortante está montado corretamente e em suporte próprio? | ☐ | ☐ | ☐ |  |

| **1.12** O ambiente, mobiliários e equipamentos apresentam-se visualmente limpos? | ☐ | ☐ | ☐ |  |

---

## 🔬 2. Laboratório de Análises Clínicas

| Itens a Avaliar | C | NC | NA | Observações / Evidências / Ações |

| --- | --- | --- | --- | --- |

| **2.1** Existe separação física/fluxo claro entre a área suja (técnica) e limpa? | ☐ | ☐ | ☐ |  |

| **2.2** As bancadas de coleta são limpas e desinfetadas após cada paciente? | ☐ | ☐ | ☐ |  |

| **2.3** Profissionais utilizam luvas de procedimento e óculos/máscara na coleta? | ☐ | ☐ | ☐ |  |

| **2.4** A centrífuga passa por limpeza rotineira? Há POP em caso de derramamento? | ☐ | ☐ | ☐ |  |

| **2.5** A Cabine de Segurança Biológica (se houver) possui laudo de certificação em dia? | ☐ | ☐ | ☐ |  |

| **2.6** Geladeiras de amostras/reagentes são exclusivas? (Proibido guardar alimentos) | ☐ | ☐ | ☐ |  |

| **2.7** Há controle e registro diário de temperatura das geladeiras (máxima e mínima)? | ☐ | ☐ | ☐ |  |

| **2.8** O descarte de tubos de sangue e culturas segue rigorosamente o PGRSS? | ☐ | ☐ | ☐ |  |

---

## ⚙️ 3. CME (Central de Material e Esterilização)

| Itens a Avaliar | C | NC | NA | Observações / Evidências / Ações |

| --- | --- | --- | --- | --- |

| **3.1** O fluxo da CME é estritamente unidirecional? (Expurgo $\rightarrow$ Preparo $\rightarrow$ Esterilização $\rightarrow$ Guarda) | ☐ | ☐ | ☐ |  |

| **3.2** No expurgo, os funcionários usam EPIs pesados (avental impermeável, luvas cano longo, protetor facial)? | ☐ | ☐ | ☐ |  |

| **3.3** A lavagem manual/automatizada segue os POPs? O detergente enzimático é monitorado (diluição/validade)? | ☐ | ☐ | ☐ |  |

| **3.4** Na área de preparo, os instrumentais são inspecionados com auxílio de lupa? | ☐ | ☐ | ☐ |  |

| **3.5** As seladoras estão com a temperatura regulada e testadas quanto à integridade da selagem? | ☐ | ☐ | ☐ |  |

| **3.6** Os pacotes estão identificados com: data, validade, lote, autoclave e responsável? | ☐ | ☐ | ☐ |  |

| **3.7** O teste Bowie-Dick é realizado diariamente na primeira carga da autoclave? | ☐ | ☐ | ☐ |  |

| **3.8** Indicadores químicos (Classe 5 ou 6) são inseridos em todas as cargas/pacotes? | ☐ | ☐ | ☐ |  |

| **3.9** O indicador biológico é realizado na frequência padronizada e devidamente registrado? | ☐ | ☐ | ☐ |  |

| **3.10** A área de guarda é restrita, limpa, seca e os armários/prateleiras respeitam o distanciamento do piso/teto/paredes? | ☐ | ☐ | ☐ |  |

---

## 🏥 4. Centro Cirúrgico Ambulatorial (CCA)

| Itens a Avaliar | C | NC | NA | Observações / Evidências / Ações |

| --- | --- | --- | --- | --- |

| **4.1** O controle de acesso é respeitado? (Uso obrigatório de roupa privativa e gorro) | ☐ | ☐ | ☐ |  |

| **4.2** Há calçados exclusivos para a área cirúrgica ou restrição de entrada com calçados externos? | ☐ | ☐ | ☐ |  |

| **4.3** O lavatório de escovação das mãos possui acionamento que dispensa o uso das mãos? | ☐ | ☐ | ☐ |  |

| **4.4** Há disponibilidade de antissépticos adequados (Degermantes e Alcoólicos) para a equipe cirúrgica? | ☐ | ☐ | ☐ |  |

| **4.5** As escovas para antissepsia das mãos possuem cerdas macias ou são esponjas secas? | ☐ | ☐ | ☐ |  |

| **4.6** O sistema de climatização da Sala Operatória (SO) possui manutenção e troca de filtros registradas? | ☐ | ☐ | ☐ |  |

| **4.7** A limpeza concorrente é realizada rigorosamente entre as cirurgias (foco em superfícies de alto toque)? | ☐ | ☐ | ☐ |  |

| **4.8** O Checklist de Cirurgia Segura da OMS é aplicado e assinado em prontuário? | ☐ | ☐ | ☐ |  |

---

## 🩺 5. Consultórios Médicos e Salas de Procedimento

| Itens a Avaliar | C | NC | NA | Observações / Evidências / Ações |

| --- | --- | --- | --- | --- |

| **5.1** Há desinfecção de equipamentos portáteis (estetoscópio, termômetro, esfigmo) entre os atendimentos? | ☐ | ☐ | ☐ |  |

| **5.2** A maca de exames é limpa/desinfetada e o lençol de papel é trocado a cada paciente? | ☐ | ☐ | ☐ |  |

| **5.3** Na sala de curativos, as técnicas assépticas são rigorosamente mantidas? | ☐ | ☐ | ☐ |  |

| **5.4** Frascos de soluções abertas (soro, antissépticos) contêm a data de abertura e validade pós-abertura anotadas? | ☐ | ☐ | ☐ |  |

| **5.5** Materiais estéreis utilizados em pequenos procedimentos estão dentro do prazo de validade? | ☐ | ☐ | ☐ |  |

---

## 📷 6. Sala de Endoscopia / Colonoscopia (Se houver)

| Itens a Avaliar | C | NC | NA | Observações / Evidências / Ações |

| --- | --- | --- | --- | --- |

| **6.1** A pré-limpeza do endoscópio é realizada imediatamente após o término do exame, ainda na sala de procedimentos? | ☐ | ☐ | ☐ |  |

| **6.2** O teste de vazamento (*Leak Test*) é realizado antes da imersão em água/detergente? | ☐ | ☐ | ☐ |  |

| **6.3** A limpeza manual de todos os canais é feita com escovas dedicadas, de tamanho adequado e em bom estado? | ☐ | ☐ | ☐ |  |

| **6.4** A fita-teste para verificar a concentração do desinfetante de alto nível (Ex: Ácido Peracético, OPA) é usada diariamente? | ☐ | ☐ | ☐ |  |

| **6.5** O tempo de imersão do equipamento no desinfetante respeita estritamente o fabricante? | ☐ | ☐ | ☐ |  |

| **6.6** Os canais são totalmente secos com ar comprimido medicinal e álcool 70% antes do armazenamento? | ☐ | ☐ | ☐ |  |

| **6.7** Os endoscópios são guardados na vertical, sem dobras, em armário limpo e fechado? | ☐ | ☐ | ☐ |  |

---

## 🧹 7. Higiene, Limpeza (SHL) e Resíduos

| Itens a Avaliar | C | NC | NA | Observações / Evidências / Ações |

| --- | --- | --- | --- | --- |

| **7.1** O DML (Depósito de Material de Limpeza) está limpo, organizado e com os mops/panos secando suspensos? | ☐ | ☐ | ☐ |  |

| **7.2** Todos os produtos químicos utilizados possuem registro na ANVISA? | ☐ | ☐ | ☐ |  |

| **7.3** Os saneantes diluídos na instituição possuem etiqueta com nome do produto, diluição, data, validade e responsável? | ☐ | ☐ | ☐ |  |

| **7.4** O abrigo externo de resíduos é mantido trancado, limpo, livre de vetores e com separação entre as categorias de lixo? | ☐ | ☐ | ☐ |  |

---

### 📝 Encerramento da Visita

**Principais não conformidades críticas identificadas:** __________________________________________________________________________________________________________________________________

---

**Avaliador (SCIRAS):** ___________________________________

**Responsável pelo Setor:** __________________________________

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://amepa-auditoria.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4d230c00-76e6-47c3-8cc4-a2da90afb0fb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
