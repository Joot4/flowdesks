# FlowDesks (Angular + Supabase)

MVP fullstack com Angular 17 (standalone), Angular Material, PWA, FullCalendar e Supabase (Auth + Postgres + RLS + RPC).

## Stack
- Frontend: Angular 17+, TypeScript, Router, Signals, Reactive Forms, Angular Material, FullCalendar
- PWA: `@angular/service-worker` + `ngsw-config.json`
- Backend: Supabase Auth + Postgres + RLS + RPC
- Timezone: `America/Fortaleza` no frontend, `timestamptz` em UTC no banco

## 1) Criacao do projeto (referencia)
```bash
ng new calendar-app --standalone --routing --style=scss
cd calendar-app
ng add @angular/material
ng add @angular/pwa
npm install @supabase/supabase-js @fullcalendar/angular @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction idb-keyval
```

## 2) Instalar dependencias e rodar
```bash
npm install
npm run start
```

## 3) Variaveis de ambiente
Edite:
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Campos:
- `supabaseUrl`
- `supabaseAnonKey`
- `timezone` (`America/Fortaleza`)

## 4) Banco Supabase
Migration principal:
- `supabase/migrations/001_init.sql`

### Aplicar migration
Opcao SQL Editor (Supabase):
1. Abra o SQL Editor
2. Cole o conteudo de `supabase/migrations/001_init.sql`
3. Execute

Opcao CLI (se estiver configurada):
```bash
supabase db push
```

## 5) Criar primeiro SUPER_ADMIN
Fluxo:
1. Faça signup normal pelo app (ou painel Auth)
2. Pegue o UUID do usuario em `auth.users`
3. Execute:
   - `supabase/sql/make_super_admin.sql`

Exemplo:
```sql
update public.profiles set role='SUPER_ADMIN' where id='<uuid>';
```

## 6) Criar ADMIN
MVP seguro recomenda criar usuario no painel Auth e promover via SQL:
- `supabase/sql/make_admin.sql`

> Criacao de admin diretamente pelo frontend exigiria backend seguro com Service Role (nao expor no client).

## 6.2) Criar colaborador direto no Admin (Edge Function)
Foi adicionada a função `create-collaborator` em:
- `supabase/functions/create-collaborator/index.ts`

Ela cria usuário no Auth (`email + senha`) e já prepara `profiles/employees`.

### Deploy da função
```bash
supabase functions deploy create-collaborator
```

### Secrets necessários
```bash
supabase secrets set SERVICE_ROLE_KEY=<SUA_SERVICE_ROLE_KEY>
```

Para envio de credenciais por email (opcional, via Resend):
```bash
supabase secrets set RESEND_API_KEY=<SUA_RESEND_API_KEY>
supabase secrets set RESEND_FROM_EMAIL='Seu Nome <onboarding@seu-dominio.com>'
```

## 6.1) Seed para testes rapidos
Depois de criar ao menos 1 `SUPER_ADMIN` e alguns usuarios `COLLABORATOR`, execute:
- `supabase/sql/seed.sql`

Para validar os dados:
- `supabase/sql/check_seed.sql`

## 7) Rotas por papel
- `SUPER_ADMIN` -> `/director`
- `ADMIN` -> `/admin`
- `COLLABORATOR` -> `/me`

## 8) Funcionalidades MVP
- Login email/senha (Supabase Auth)
- Guards de autenticacao e role
- Diretor: lista de admins + orientacao de criacao
- Admin:
  - Colaboradores (edicao de dados)
  - Catalogos: locais e tipos de atividade
  - Calendario geral com filtros
  - Criar/editar alocacao
  - Drag-and-drop de datas
  - Remanejamento via RPC `reassign_assignment`
- Colaborador:
  - Minha agenda (leitura)
- Offline:
  - Banner de modo offline
  - Cache local da ultima agenda carregada (IndexedDB via `idb-keyval`)
  - Bloqueio de criacao/edicao offline

## 9) Seguranca
- RLS habilitado em todas as tabelas
- Policies por papel e escopo de dados
- RPC de remanejamento com validacao de role
- Regra de anti-conflito no banco (`assignments_no_overlap`)

## 10) Mensagem amigavel de conflito
Quando o banco retorna erro de overlap (`assignments_no_overlap`), o frontend mostra:
- `Conflito de horario: colaborador ja possui alocacao nesse intervalo.`

## Estrutura principal
```text
src/app/
  core/
    supabase/
    guards/
    ui/
  shared/
    components/
    pipes/
    models/
  features/
    auth/
    admin/
    director/
    collaborator/
```
