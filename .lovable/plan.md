# Plano para tornar o sistema Multi-usuário e Multi-tenancy

O objetivo é transformar a aplicação "Auditoria AME" em uma plataforma onde várias organizações podem coexistir e vários usuários dentro de cada organização podem colaborar em auditorias, respeitando o isolamento de dados.

## Alterações Propostas

### 1. Modelo de Dados e Segurança (SQL)
- As tabelas principais (`organizations`, `profiles`, `specialties`, `sectors`, `questions`, `audits`, `responses`) já possuem `organization_id`.
- Revisar e reforçar as políticas de **RLS (Row Level Security)** para garantir que:
  - Usuários só vejam dados de sua própria `organization_id`.
  - Administradores possam gerenciar especialidades e setores da organização.
  - Auditores possam apenas realizar auditorias e visualizar relatórios.

### 2. Autenticação e Cadastro
- Modificar o fluxo de `signUp` em `src/routes/auth.tsx` para garantir que um novo usuário crie automaticamente uma `organization` e um `profile` associado.
- Adicionar suporte a convites ou vinculação a organizações existentes (opcional, para esta fase focaremos na criação automática).

### 3. Backend (Server Functions)
- Atualizar `src/lib/audit.functions.ts` para garantir que todas as operações de escrita (`createSpecialty`, `createSector`, `startAudit`, etc.) injetem automaticamente a `organization_id` do usuário logado, obtida do seu perfil.
- Validar se o usuário tem permissão (role) para realizar a ação solicitada (ex: apenas admins criam setores).

### 4. Interface do Usuário (UI/UX)
- **Dashboard**: Exibir o nome da organização logada no cabeçalho.
- **Configurações**: Permitir que o administrador edite os dados da organização (nome, logo, cabeçalho do relatório).
- **Gestão de Usuários**: Adicionar uma tela simples para visualizar outros membros da mesma organização (funcionalidade futura, mas preparada na base).

## Detalhes Técnicos
- Utilizar o `maybeSingle()` do Supabase para buscar perfis, tratando casos onde o perfil ainda não foi criado.
- Manter o uso do `requireSupabaseAuth` em todas as funções de servidor para garantir o contexto do usuário (`context.userId`).
- Garantir que o `organization_id` seja propagado corretamente nos filtros de busca para evitar vazamento de dados entre inquilinos.
