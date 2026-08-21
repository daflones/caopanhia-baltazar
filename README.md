# Cãopanhia Baltazar - Sistema de Doações

Site de doações para a Cãopanhia Baltazar com integração completa de pagamentos Pix via MercosulPay e Supabase.

## Arquitetura

- **Framework**: Next.js 16.2.6 com React 19.2.6
- **Banco de dados**: Supabase/PostgreSQL com RLS (Row Level Security)
- **Gateway de pagamento**: MercosulPay para cobranças Pix automáticas (>= R$ 5)
- **Pix manual**: Para valores menores que R$ 5
- **Deploy**: Docker para EasyPanel

## Arquivos Alterados

### Backend
- `lib/supabase-server.ts` - Cliente Supabase com Service Role (servidor)
- `lib/mercosulpay.ts` - Serviço MercosulPay com tratamento de erros
- `app/api/donations/route.ts` - POST /api/donations (criação de doações)
- `app/api/donations/[referenceId]/status/route.ts` - GET /api/donations/:referenceId/status
- `app/api/health/route.ts` - GET /api/health (healthcheck)
- `app/api/webhooks/mercosulpay/route.ts` - POST /api/webhooks/mercosulpay (webhook)

### Frontend
- `app/page.tsx` - Atualizado com integração da API real e polling de status

### Banco de dados
- `supabase/migrations/001_create_donations.sql` - Migration SQL para tabelas donations e webhook_deliveries

### Configuração
- `.env.example` - Variáveis de ambiente de exemplo
- `Dockerfile` - Configuração Docker para EasyPanel
- `next.config.ts` - Configurado para output standalone

### Testes
- `tests/donations.test.ts` - Testes unitários para API e validações

## Migration Supabase

Para aplicar a migration no Supabase:

1. Acesse o painel do Supabase
2. Vá em SQL Editor
3. Copie e execute o conteúdo de `supabase/migrations/001_create_donations.sql`

A migration cria:
- Tabela `donations` com RLS (acesso apenas via Service Role)
- Tabela `webhook_deliveries` para deduplicação de webhooks
- Índices de performance
- Trigger para atualização automática de `updated_at`

## Configuração Segura das Chaves

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure as variáveis:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://doecaopanhiabaltazar.com.br

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# MercosulPay
MERCOSULPAY_API_URL=https://mercosulpay.com/api/public/v1
MERCOSULPAY_API_KEY=otp_test_your_api_key_here
MERCOSULPAY_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Pix Manual
MANUAL_PIX_KEY=21968053672
MANUAL_PIX_KEY_TYPE=phone
AUTOMATIC_PIX_MIN_AMOUNT=5.00
```

**IMPORTANTE**:
- Configure as variáveis diretamente no EasyPanel e no ambiente local
- NUNCA cole Service Role, chave MercosulPay ou segredo de webhook no chat
- O `.env` já está no `.gitignore`

## Execução Local

```bash
# Instalar dependências
npm install

# Configurar .env com as variáveis necessárias
cp .env.example .env

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start
```

## Testes

```bash
# Executar testes
node --test tests/donations.test.ts

# Com variável de ambiente para API URL
TEST_API_URL=http://localhost:3000 node --test tests/donations.test.ts
```

Testes implementados:
- Validação de valores inválidos (zero, negativo, muitas casas decimais)
- Fluxo manual Pix para 4.99
- Fluxo MercosulPay para 5.00
- Verificação de assinatura HMAC
- Validação de timestamp
- Validação de valores

## Deploy no EasyPanel

### Build Docker

```bash
docker build -t caopanhia-baltazar .
```

### Configuração no EasyPanel

1. Crie um novo serviço no EasyPanel
2. Use a imagem Docker construída
3. Configure as variáveis de ambiente no painel
4. Configure proxy reverso para HTTPS
5. Healthcheck configurado para `/api/health`

### Domínio e HTTPS

- Domínio de produção: `https://doecaopanhiabaltazar.com.br`
- Configure o domínio no EasyPanel
- O EasyPanel gerará certificado SSL automático via Let's Encrypt

## Webhook MercosulPay

### URL do Webhook

```
https://doecaopanhiabaltazar.com.br/api/webhooks/mercosulpay
```

### Cadastro no Painel MercosulPay

1. Acesse o painel da MercosulPay
2. Vá em configurações de webhook
3. Cadastre a URL acima
4. Configure o segredo do webhook (MERCOSULPAY_WEBHOOK_SECRET)

### Homologação

Use chaves `otp_test_` para homologação. Não realize pagamentos reais durante os testes.

### Troca para Produção

Somente após autorização explícita, troque `otp_test_` por `otp_live_` nas variáveis de ambiente.

## Regras de Valores

### Valores abaixo de R$ 5,00
- Não chama API MercosulPay
- Cria registro no Supabase como `awaiting_manual_payment`
- Retorna chave Pix manual para pagamento direto
- Não há confirmação automática (sem webhook)

### Valores a partir de R$ 5,00
- Cria cobrança na MercosulPay
- Exibe QR Code e Pix Copia e Cola
- Faz polling de status a cada 4 segundos
- Webhook confirma pagamento automaticamente
- Mostra mensagem de agradecimento quando confirmado

## Segurança

- Service Role Supabase usado apenas no servidor
- RLS ativo nas tabelas (negado acesso direto do cliente)
- Validação de assinatura HMAC-SHA256 no webhook
- Deduplicação por delivery_id e transaction_id
- Rate limit recomendado em produção
- Nenhum segredo exposto em logs ou respostas
- Validação rigorosa de valores no backend

## Pré-requisitos

- Node.js >= 22.13.0
- Conta Supabase configurada
- Conta MercosulPay com chaves de API
- Docker para deploy no EasyPanel
