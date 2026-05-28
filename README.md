# 📅 Agendamento de Salas — Frontend

Sistema web para agendamento de salas e laboratórios, desenvolvido como projeto acadêmico. Permite que professores solicitem reservas de espaços e que coordenadores gerenciem e aprovem essas solicitações.

> **Instituição:** FATEC Zona Leste
> **Tecnologia principal:** React 18 + TypeScript + Vite

**Hospedado em:** https://agendamento-salas-front.vercel.app
---

## Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução Local](#instalação-e-execução-local)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Manual de Uso Básico](#manual-de-uso-básico)
- [Instruções de Deploy](#instruções-de-deploy)
- [Estrutura do Projeto](#estrutura-do-projeto)

---

## Visão Geral

A aplicação é um SPA (Single Page Application) que se comunica com uma API REST via JWT. Existem dois perfis de acesso:

| Perfil | Descrição |
|---|---|
| **PROFESSOR** | Solicita reservas, acompanha o histórico e visualiza o calendário |
| **COORDENADOR** | Aprova/rejeita reservas, gerencia salas, usuários, períodos letivos e visualiza o calendário |

---

## Funcionalidades

### Professor
- Login e recuperação de senha
- Solicitar reserva de sala ou laboratório com seleção de data, turno e horário
- Visualizar histórico de suas reservas e seus status (Aguardando, Aprovada, Rejeitada, Cancelada, Parcial)
- Visualizar calendário de ocupação das salas
- Definir períodos de inatividade próprios

### Coordenador
- Dashboard com visão geral das reservas e estatísticas
- Aprovar, rejeitar ou cancelar solicitações de reserva
- Gerenciar salas (criar, editar, excluir) com suporte a Sala, Laboratório e Auditório
- Gerenciar usuários do sistema
- Controle de períodos letivos e feriados
- Visualizar calendário geral de reservas
- Consultar histórico completo de reservas

### Acessibilidade
- Alternância de alto contraste
- Controles de tamanho de fonte

---

## Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Framework | React 18 |
| Linguagem | TypeScript 5 |
| Build tool | Vite 8 |
| Estilização | Tailwind CSS 3 + shadcn/ui |
| Roteamento | React Router DOM 6 |
| HTTP Client | Axios |
| Ícones | Lucide React |
| Servidor (produção) | Nginx (via Docker) |

---

## Pré-requisitos

- **Node.js** v20 ou superior
- **npm** v9 ou superior (já incluso com o Node)
- Acesso a uma instância da **API backend** (por padrão em `http://localhost:3333/api`)

---

## Instalação e Execução Local

**1. Clone o repositório**

```bash
git clone <url-do-repositorio>
cd agendamento-salas-front-main
```

**2. Instale as dependências**

```bash
npm install
```

**3. Configure as variáveis de ambiente**

Copie o arquivo de exemplo e preencha com os valores corretos:

```bash
cp .env.example .env
```

Edite o arquivo `.env` conforme necessário (veja a seção [Variáveis de Ambiente](#variáveis-de-ambiente)).

**4. Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

A aplicação estará disponível em **http://localhost:5173**.

> O servidor de desenvolvimento já inclui proxy reverso para `/api` apontando para `http://localhost:3333`, dispensando configuração de CORS durante o desenvolvimento.

---

## Variáveis de Ambiente

O arquivo `.env` (baseado em `.env.example`) aceita as seguintes variáveis:

| Variável | Descrição | Padrão |
|---|---|---|
| `VITE_API_BASE_URL` | URL base da API backend | `http://localhost:3333/api` |
| `VITE_APP_NAME` | Nome da aplicação exibido na interface | `Agendamento de Salas` |

> **Atenção:** todas as variáveis expostas ao navegador devem obrigatoriamente começar com o prefixo `VITE_`.

---

## Manual de Uso Básico

### 1. Acesso ao sistema

Acesse a URL da aplicação e insira e-mail e senha cadastrados. Após o login, o sistema redireciona automaticamente para o painel correspondente ao seu perfil.

Caso tenha esquecido a senha, clique em **"Esqueci minha senha"** na tela de login, informe o e-mail cadastrado e siga as instruções enviadas por e-mail.

---

### 2. Perfil Professor

#### Solicitar uma reserva

1. No menu lateral, acesse **Reservas**.
2. Selecione a **data** desejada no calendário.
3. Escolha o **curso** e o **turno** (Manhã, Tarde ou Noite).
4. Selecione o **horário** disponível.
5. Escolha a **sala** disponível na lista.
6. Clique em **Enviar solicitação**.

A solicitação ficará com status **Aguardando** até a avaliação do coordenador.

#### Acompanhar reservas

Acesse **Histórico de Reservas** no menu lateral para visualizar todas as suas solicitações e seus respectivos status.

#### Visualizar o calendário

Acesse **Calendário** para ver a ocupação geral das salas por dia.

---

### 3. Perfil Coordenador

#### Gerenciar reservas (Dashboard)

O Dashboard exibe as solicitações pendentes. Para cada reserva é possível:
- ✅ **Aprovar** — confirma a reserva para o professor
- ❌ **Rejeitar** — nega a solicitação (é possível informar um motivo)
- 🚫 **Cancelar** — cancela uma reserva já aprovada

Use os filtros de **status**, **sala** e **data** para localizar reservas específicas.

#### Gerenciar salas

1. No menu lateral, acesse **Salas**.
2. Para **adicionar** uma sala, clique em **Nova Sala**, preencha nome, descrição, capacidade e tipo (Sala, Laboratório ou Auditório) e salve.
3. Para **editar**, clique no ícone de lápis na linha correspondente.
4. Para **excluir**, clique no ícone de lixeira (a ação é irreversível).

#### Gerenciar usuários

Acesse **Usuários** no menu lateral para cadastrar novos professores ou coordenadores, editar dados e redefinir senhas.

#### Controle de períodos letivos

Acesse **Períodos** para cadastrar os semestres ativos e configurar datas de início e fim do período letivo. Fora desses períodos, o sistema bloqueia novas solicitações de reserva.

---

## Instruções de Deploy

### Opção 1 — Vercel (recomendado para avaliação)

1. Importe o repositório no painel da [Vercel](https://vercel.com).
2. Defina a variável de ambiente `VITE_API_BASE_URL` apontando para a URL da API em produção.
3. Clique em **Deploy**. A Vercel detecta automaticamente o Vite e executa `npm run build`.

O arquivo `vercel.json` já está configurado com o rewrite necessário para o roteamento SPA (`/*` → `/index.html`).

---

### Opção 2 — Docker + Nginx

O projeto inclui `Dockerfile` com build multi-stage (Node para compilar, Nginx para servir).

**Build da imagem:**

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://sua-api.exemplo.com/api \
  -t agendamento-salas-front .
```

**Execução do container:**

```bash
docker run -d -p 80:80 --name agendamento-front agendamento-salas-front
```

A aplicação estará disponível na porta **80**.

> O `nginx.conf` já configura proxy reverso de `/api/` para o serviço `backend:3333`. Em ambiente Docker Compose, certifique-se de que o serviço do backend esteja nomeado como `backend` na rede interna.

**Exemplo de `docker-compose.yml` simplificado:**

```yaml
version: '3.8'
services:
  frontend:
    build:
      context: .
      args:
        VITE_API_BASE_URL: /api
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    image: sua-imagem-backend
    ports:
      - "3333:3333"
```

---

### Opção 3 — Build estático com servidor próprio

Gere os arquivos estáticos:

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`. Sirva essa pasta com qualquer servidor HTTP (Apache, Nginx, etc.). Certifique-se de configurar o fallback para `index.html` em todas as rotas (necessário para o roteamento SPA).

**Exemplo de configuração Nginx mínima:**

```nginx
server {
  listen 80;
  root /var/www/agendamento/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── accessibility/    # Controles de fonte e contraste
│   ├── layout/           # AppLayout, Navbar, Sidebar
│   └── ui/               # Componentes base (Button, Input, Badge…)
├── contexts/
│   └── AuthContext.tsx   # Contexto global de autenticação JWT
├── hooks/                # useAuth, useKeepAlive, useNotifications
├── lib/
│   └── holidays.ts       # Feriados e lógica de período letivo (FATEC ZL)
├── pages/
│   ├── LoginPage.tsx
│   ├── CoordinatorDashboard.tsx
│   ├── SolicitarReservaPage.tsx
│   ├── HistoricoReservasPage.tsx
│   ├── CalendarioPage.tsx
│   ├── ClassManagementPage.tsx
│   ├── GestaoPerfilPage.tsx
│   └── ControlePeriodosPage.tsx
└── services/             # Camada de comunicação com a API REST
    ├── api.ts            # Instância Axios + interceptor JWT
    ├── authService.ts
    ├── reservaService.ts
    ├── classService.ts
    └── ...
```
