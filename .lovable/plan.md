# Plano de Reformulação Técnica: Auditoria AME

Implementação do sistema de gestão de auditorias multi-especialidade conforme os requisitos do Auditoria AME, utilizando a base técnica atual e expandindo para suportar organizações, perfis admin/auditor, temas personalizados e gestão dinâmica de questionários.

## 1. Modelo de Dados e Segurança (Supabase)

### Tabelas
- **organizations**: Gestão de identidades organizacionais e configurações de relatórios.
- **profiles**: Extensão do `auth.users` com `organization_id`, `role` (admin/auditor) e `theme`.
- **specialties**: Atualização para incluir `organization_id`, `code`, `color`, `is_critical` e `active`.
- **question_sections**: Agrupamento lógico de perguntas dentro de uma especialidade.
- **questions**: Reestruturação profunda: `organization_id`, `section_id`, versionamento e flags de obrigatoriedade (NC comment, plano de ação).
- **audits**: Inclusão de `organization_id` e metadados de auditoria.

### RLS e Segurança
- Políticas segregadas por `organization_id` e `auth.uid()`.
- Garantir que um usuário só acesse dados da sua organização.
- Funções `has_role` para controle de acesso Admin vs Auditor.

## 2. Identidade Visual e Temas (Arctic, Midnight, Forest, etc.)

- Atualização do `ThemeProvider` em `src/lib/theme.tsx` para incluir as 6 paletas solicitadas.
- Persistência da escolha do tema no Perfil do usuário (Supabase) e `localStorage`.
- Padronização do azul principal `#2B7FE0` no tema Arctic.

## 3. Fluxo de Navegação e Perfis

- **Tela de Boas-vindas**: Reformulação de `src/routes/index.tsx` com os botões "Acessar sistema", "Entrar" e "Criar conta".
- **Dashboard Segmentado**: Ajuste do Dashboard para filtrar dados pela Organização e Especialidade.
- **Menu Administrativo**: Criação de rotas exclusivas para Admins:
    - `/admin/especialidades`
    - `/admin/usuarios`
    - `/admin/backup`
- **Fluxo do Auditor**:
    - Seleção de especialidade (visualização apenas de ativas).
    - Execução da auditoria com justificativas obrigatórias para NC.

## 4. Gestão de Questionários

- Interface de gerenciamento de perguntas com:
    - Arrastar e soltar (reordenação).
    - Importação/Exportação CSV.
    - Versionamento: preservação do texto original da pergunta em auditorias já finalizadas.

## 5. Relatórios e Indicadores

- **jsPDF**: Personalização do cabeçalho conforme configuração da organização.
- **Dashboard**: Gráficos Recharts adaptados para o novo schema multi-organização.

## Detalhes Técnicos
- Migração SQL incremental para adicionar novas tabelas e colunas.
- Atualização das `server functions` em `src/lib/audit.functions.ts` para validar o contexto de organização e papel do usuário.
- Utilização de `tanstack-auth-guards` para proteger rotas administrativas.
- `jsPDF-AutoTable` para geração de relatórios tabulares.
