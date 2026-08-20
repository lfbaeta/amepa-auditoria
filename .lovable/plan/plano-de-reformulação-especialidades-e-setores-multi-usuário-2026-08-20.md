# Plano de Reformulação: Especialidades e Setores Multi-Usuário

Este plano detalha a reestruturação da jornada inicial do aplicativo para permitir que usuários de diferentes setores/especialidades utilizem a mesma base técnica com fluxos de entrada personalizados.

## Objetivo
Transformar o "Setores" (que hoje lista categorias de checklist) em um segundo nível, precedido por uma seleção de "Especialidade" ou "Área de Atuação" (ex: Saúde, Manutenção, Administrativo).

## Alterações Propostas

### 1. Banco de Dados e API
- **Nova Tabela `specialties`**:
  - `id` (uuid), `user_id` (uuid), `name` (text), `description` (text), `icon` (text), `sort_order` (int).
- **Relacionamento**:
  - Adicionar `specialty_id` à tabela `sectors`.
- **Migração de Dados**:
  - Criar uma especialidade padrão (ex: "SCIRAS - Saúde") e vincular todos os setores existentes a ela para não quebrar o uso atual.
- **Novas Server Functions**:
  - `listSpecialties`, `createSpecialty`, `updateSpecialty`, `deleteSpecialty`.
  - Atualizar `listSectors` para filtrar opcionalmente por `specialty_id`.

### 2. Interface de Usuário (UX)
- **Nova Rota `/_authenticated/especialidades`**:
  - Tela inicial após o login (ou redirecionamento do Painel).
  - Cards grandes com ícones representando as áreas (ex: Estetoscópio para Saúde, Chave de fenda para Manutenção).
- **Fluxo de Navegação**:
  - Login -> Especialidades -> Setores (daquela especialidade) -> Auditoria.
- **Gerenciamento**:
  - Atualizar a tela de configurações para permitir gerenciar Especialidades -> Setores -> Perguntas (hierarquia de 3 níveis).

### 3. Ajustes de Dashboard e Relatórios
- **Filtro por Especialidade**: Adicionar seletor no Painel para que o usuário possa ver métricas de apenas uma área ou do perfil completo.
- **PDF**: Incluir o nome da Especialidade no cabeçalho do relatório.

## Detalhes Técnicos
- **RLS**: Garantir que as Especialidades sigam a mesma política de `user_id = auth.uid()`.
- **Seed**: Atualizar a função de seed inicial para criar a primeira Especialidade e seus Setores vinculados.

## Próximos Passos
1. Executar migração SQL para criar a tabela `specialties` e atualizar `sectors`.
2. Implementar as funções de backend em `src/lib/audit.functions.ts`.
3. Criar a nova rota de seleção no frontend.
