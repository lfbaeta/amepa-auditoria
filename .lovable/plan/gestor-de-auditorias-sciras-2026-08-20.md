
# Gestor de Auditorias SCIRAS

App web mobile-first para registro de auditorias internas, com sincronização na nuvem (Lovable Cloud), login, cache offline e geração de PDF.

## Stack e decisões-chave

- **Lovable Cloud** (auth e banco). Login por email/senha + Google.
- **TanStack Start** + TanStack Query para data fetching com cache.
- **PWA leve**: cache do app shell + dados em IndexedDB para leitura offline; gravação offline enfileirada e sincronizada quando voltar online (offline-first dentro do escopo de uma sessão logada).
- **Paleta Arctic**: branco como fundo, azuis `#2B7FE0` e `#3C82DC` como primários. Tipografia sans-serif (Inter). Espaçamento generoso, áreas de toque grandes.
- **Mobile-first** (viewport 390×844 como referência), mas responsivo para desktop.

## Estrutura de telas (rotas)

```
/auth                       login / cadastro
/_authenticated/
  ├── index                 Dashboard crítico (gráfico de NC por setor)
  ├── setores               Lista de setores → inicia auditoria
  ├── setores/gerenciar     Criar / editar setores e perguntas
  ├── auditoria/$id         Formulário dinâmico de auditoria
  ├── auditoria/$id/resumo  Resumo + download de PDF
  ├── historico             Tabela de auditorias (filtros data/setor)
  └── dados                 Backup, restore e exportação
```

## Modelo de dados (Lovable Cloud)

- `sectors` — id, user_id, name, description, is_default, created_at
- `questions` — id, sector_id, order, text, created_at
- `audits` — id, user_id, sector_id, auditor_name, sector_responsible, audit_date, status (`em_andamento` | `finalizada`), conformity_score, created_at, finished_at
- `responses` — id, audit_id, question_id, status (`C` | `NC` | `NA`), comment

RLS: cada usuário só lê/escreve seus próprios registros. Setores e perguntas padrão são criados por seed para cada novo usuário (trigger no signup) para que possa editar/desativar livremente.

## Setores e perguntas (seed inicial — 7 categorias do checklist SCIRAS)

1. Requisitos Gerais (12 itens)
2. Laboratório de Análises Clínicas (8 itens)
3. CME — Central de Material e Esterilização (10 itens)
4. Centro Cirúrgico Ambulatorial (8 itens)
5. Consultórios Médicos e Salas de Procedimento (5 itens)
6. Sala de Endoscopia / Colonoscopia (7 itens)
7. Higiene, Limpeza (SHL) e Resíduos (4 itens)

Cada pergunta tem 3 opções (Conforme / Não Conforme / Não se Aplica) + campo de comentário/evidência. O usuário pode adicionar, editar, reordenar ou desativar perguntas em "Setores → Gerenciar".

## Regras de negócio

- **Pontuação de conformidade** = `C / (C + NC) × 100` (NA não conta no denominador). Calculada ao finalizar a auditoria e persistida em `conformity_score`.
- **Dashboard** ordena setores pela soma absoluta de respostas "NC" em auditorias finalizadas (com filtro de período: 7/30/90 dias). Mostra também score médio por setor.
- **Histórico** com filtros de data (range) e setor; clique abre o resumo com PDF.
- **PDF** gerado no cliente (jsPDF + autoTable) ao finalizar ou a partir do histórico — inclui cabeçalho com setor, data, avaliador, resumo de score, e tabela de respostas com observações.
- **Offline**: leitura de setores/perguntas/auditorias via cache do TanStack Query persistido em IndexedDB; novas auditorias e respostas ficam em uma fila local e sincronizam quando voltar online.

## Fluxo principal

1. Usuário entra em **Setores**, escolhe um setor → cria registro em `audits` (status `em_andamento`).
2. **Formulário** renderiza perguntas do setor uma a uma (ou em lista compacta), com radio C/NC/NA e textarea. Auto-save por resposta.
3. **Finalizar** calcula score, marca como `finalizada`, navega para o **Resumo** com botão "Baixar PDF".
4. **Dashboard** e **Histórico** atualizam automaticamente.

## UX/UI (Arctic)

- Fundo `#FFFFFF`, superfícies `#F6F9FE`, primário `#2B7FE0`, acento `#3C82DC`, borda `#E5EDF7`, texto `#0F172A`, texto suave `#475569`.
- Status: Conforme verde sóbrio, Não Conforme vermelho discreto, NA cinza.
- Cards com bordas sutis, sem sombras pesadas. Tipografia Inter, títulos com tracking levemente negativo.
- Bottom nav mobile com 4 ícones (Setores, Dashboard, Histórico, Dados).
- Cabeçalho com saudação + ação rápida "Nova auditoria".

## Detalhes técnicos

- Server functions (`createServerFn` + `requireSupabaseAuth`) para todas as queries/mutations no Supabase.
- Trigger SQL `on_auth_user_created` que copia setores e perguntas padrão para o novo usuário.
- Persistência de cache: `@tanstack/query-async-storage-persister` + `idb-keyval`.
- PDF: `jspdf` + `jspdf-autotable` (puro client-side, sem dependência de runtime serverless).
- Gráfico do dashboard: `recharts` (BarChart horizontal de NC por setor).
- Validação de formulários com `zod` + `react-hook-form`.

## Entregas por fase

1. **Fundação**: ativar Lovable Cloud, schema + RLS + seed trigger, auth (email/senha + Google), shell do app com bottom nav.
2. **Auditorias**: lista de setores, formulário dinâmico, auto-save, finalização com cálculo de score.
3. **Relatório PDF** no resumo e no histórico.
4. **Dashboard** crítico (gráfico NC + score médio por setor, filtro de período).
5. **Histórico** com filtros, e tela **Gestão de Dados** (gerenciar setores/perguntas + backup JSON de todas as auditorias do usuário).
6. **PWA offline**: manifest, ícones, registro de service worker via `vite-plugin-pwa` e persistência do TanStack Query.

Quer que eu siga com esse plano?
