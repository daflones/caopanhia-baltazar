# Prompt para o Devin — MercosulPay + Supabase

Você tem acesso à pasta de um projeto existente chamado **Cãopanhia Baltazar**. Analise toda a estrutura antes de alterar qualquer arquivo. Não recrie o site, não troque o design e não remova as seções, imagens ou responsividade já existentes.

O domínio de produção será:

```text
https://doecaopanhiabaltazar.com.br
```

## Objetivo

Implementar o fluxo completo de doações Pix usando:

- **MercosulPay** para cobranças automáticas de **R$ 5,00 ou mais**;
- **Pix manual** para valores **maiores que zero e menores que R$ 5,00**;
- **Supabase/PostgreSQL** para persistir todas as tentativas e confirmações;
- backend seguro para MercosulPay, Supabase Service Role e webhooks.

O projeto já possui seletor de valores, valor personalizado e interfaces provisórias. Preserve o visual e substitua apenas os comportamentos provisórios pela integração real.

## Primeira etapa obrigatória

1. Analise framework, scripts, dependências, componentes, build e deploy.
2. Identifique se já existe backend ou rotas de servidor.
3. Identifique os componentes da área de doação.
4. Explique resumidamente o que encontrou.
5. Apresente o plano de implementação.
6. Depois disso, implemente e teste.

Prefira a arquitetura já existente. Se for apenas frontend, crie um backend Node.js organizado e adequado ao EasyPanel. Se for full-stack, use rotas server-side do framework quando forem compatíveis com o deploy.

## Regra dos valores

### Valores abaixo de R$ 5,00

Para `0 < amount < 5`:

1. Não chame a API da MercosulPay.
2. Crie no Supabase um registro com:
   - método `manual_pix`;
   - valor informado;
   - status `awaiting_manual_payment`;
   - referência pública única e imprevisível;
   - data de criação.
3. Retorne ao frontend a chave Pix de telefone:

```text
21968053672
```

4. Exiba no site:
   - valor escolhido;
   - chave Pix;
   - botão “Copiar chave Pix”;
   - confirmação visual de que a chave foi copiada;
   - agradecimento pelo gesto;
   - aviso claro para enviar exatamente o valor escolhido.

Mensagem sugerida:

> Muito obrigado por escolher ajudar! Para contribuições menores que R$ 5, envie o valor diretamente para nossa chave Pix. Mesmo uma pequena doação ajuda a levar alimento, cuidado e proteção para quem precisa.

O registro no banco representa uma **intenção de doação manual**, não uma confirmação financeira. Não marque como `completed` automaticamente, porque esse Pix não passa pela MercosulPay e não terá webhook automático da gateway.

Deixe preparado um método seguro para conciliação administrativa futura, mas não crie painel administrativo se ele não foi solicitado.

### Valores a partir de R$ 5,00

Para `amount >= 5`:

1. Registre a doação no Supabase como `pending` e método `mercosulpay_pix`.
2. Gere `reference_id` único e imprevisível.
3. Crie a cobrança na MercosulPay pelo backend.
4. Salve o ID retornado pela gateway.
5. Exiba QR Code, Pix Copia e Cola, valor e status.
6. Consulte o status interno até o webhook confirmar.
7. Quando confirmado, mostre a mensagem completa de agradecimento.

Nunca use a MercosulPay para valores menores que R$ 5,00.

## Supabase

Eu disponibilizarei no ambiente do Devin/EasyPanel:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Regras obrigatórias:

- `SUPABASE_SERVICE_ROLE_KEY` é segredo absoluto e só pode ser usada no servidor.
- Nunca exponha Service Role em `VITE_*`, `NEXT_PUBLIC_*`, HTML, bundle, logs ou respostas da API.
- O frontend não deve criar ou concluir doações diretamente no banco.
- A criação e atualização de doações deve passar pelo backend.
- A Anon Key pode ser exposta ao navegador somente se a arquitetura realmente precisar e com RLS correto.
- Se não houver necessidade de acesso direto do navegador, mantenha também a Anon Key no servidor/configuração sem utilizá-la no cliente.
- Crie `.env.example` apenas com placeholders.
- Confirme que `.env` está no `.gitignore`.

Use o cliente oficial `@supabase/supabase-js`, aproveitando qualquer versão já instalada. Crie um cliente servidor separado, inicializado com a Service Role.

## Banco e migrations

Crie uma migration SQL no projeto para uma tabela `donations` com, no mínimo:

```text
id uuid primary key
public_id uuid unique not null
reference_id text unique not null
payment_method text not null
status text not null
amount numeric(12,2) not null
pix_key text null
mercosulpay_charge_id text unique null
mercosulpay_transaction_id text unique null
fee_amount numeric(12,2) null
net_amount numeric(12,2) null
donor_name text null
donor_email text null
created_at timestamptz not null
updated_at timestamptz not null
completed_at timestamptz null
```

Métodos permitidos:

```text
manual_pix
mercosulpay_pix
```

Status sugeridos:

```text
awaiting_manual_payment
pending
completed
failed
refunded
expired
```

Crie também uma tabela `webhook_deliveries`:

```text
id uuid primary key
provider text not null
delivery_id text unique not null
event text not null
transaction_id text null
processed_at timestamptz not null
```

Use constraints para impedir valores iguais ou menores que zero. Aplique RLS nas tabelas. O navegador não deve conseguir listar ou modificar doações. O backend com Service Role fará as operações necessárias.

Não armazene a chave Pix manual em cada registro se isso for desnecessário. Ela pode vir de uma variável de ambiente:

```env
MANUAL_PIX_KEY=21968053672
MANUAL_PIX_KEY_TYPE=phone
AUTOMATIC_PIX_MIN_AMOUNT=5.00
```

## MercosulPay

Base URL:

```text
https://mercosulpay.com/api/public/v1
```

Variáveis:

```env
MERCOSULPAY_API_URL=https://mercosulpay.com/api/public/v1
MERCOSULPAY_API_KEY=otp_test_SUBSTITUIR
MERCOSULPAY_WEBHOOK_SECRET=whsec_SUBSTITUIR
```

Chaves `otp_test_` são para homologação. Não use `otp_live_` até eu autorizar explicitamente.

Nunca coloque a chave MercosulPay no navegador.

### Criar cobrança automática

```http
POST https://mercosulpay.com/api/public/v1/pix/charges
Authorization: Bearer MERCOSULPAY_API_KEY
Content-Type: application/json
```

```json
{
  "amount": 10,
  "description": "Doação para Cãopanhia Baltazar",
  "reference_id": "referencia-unica"
}
```

Resposta esperada `201`:

```json
{
  "id": "id-da-cobranca",
  "status": "pending",
  "amount": 10,
  "fee": 0,
  "net_amount": 10,
  "reference_id": "referencia-unica",
  "qr_code": "codigo-pix-copia-e-cola",
  "qr_code_image": "https://...",
  "created_at": "2026-07-30T18:20:11.000Z"
}
```

Crie uma camada de serviço exclusiva para a MercosulPay, com timeout e tratamento de `400`, `401`, `403`, `404`, `422`, `429`, `5xx` e falhas de rede.

## API interna

Implemente:

```http
POST /api/donations
```

Entrada:

```json
{
  "amount": 3.5,
  "donor_name": "opcional",
  "donor_email": "opcional"
}
```

O backend deve validar número positivo, finito e com no máximo duas casas decimais.

Para valor abaixo de R$ 5, resposta segura sugerida:

```json
{
  "donation_id": "uuid-publico",
  "reference_id": "referencia",
  "payment_method": "manual_pix",
  "status": "awaiting_manual_payment",
  "amount": 3.5,
  "pix_key": "21968053672",
  "pix_key_type": "phone"
}
```

Para valor a partir de R$ 5, resposta segura sugerida:

```json
{
  "donation_id": "uuid-publico",
  "reference_id": "referencia",
  "payment_method": "mercosulpay_pix",
  "status": "pending",
  "amount": 10,
  "qr_code": "codigo-pix",
  "qr_code_image": "https://..."
}
```

Não aceite método de pagamento enviado pelo cliente. O backend decide pelo valor.

Implemente também:

```http
GET /api/donations/:referenceId/status
GET /api/health
POST /api/webhooks/mercosulpay
```

O endpoint público de status deve retornar apenas campos seguros.

## Webhook

URL de produção:

```text
https://doecaopanhiabaltazar.com.br/api/webhooks/mercosulpay
```

A MercosulPay assina `{timestamp}.{corpo bruto}` com HMAC-SHA256 e envia:

```text
x-mercosulpay-event
x-mercosulpay-delivery
x-mercosulpay-timestamp
x-mercosulpay-signature
```

Use o corpo bruto antes de `JSON.parse`. Calcule:

```js
import { createHmac, timingSafeEqual } from "crypto";

const raw = await req.text();
const ts = req.headers.get("x-mercosulpay-timestamp") ?? "";
const expected = "sha256=" + createHmac("sha256", process.env.MERCOSULPAY_WEBHOOK_SECRET)
  .update(`${ts}.${raw}`)
  .digest("hex");
const received = req.headers.get("x-mercosulpay-signature") ?? "";
const valid = received.length === expected.length &&
  timingSafeEqual(Buffer.from(received), Buffer.from(expected));
const fresh = Math.abs(Date.now() / 1000 - Number(ts)) < 300;
```

Requisitos obrigatórios:

1. Validar assinatura e timestamp.
2. Rejeitar replay com mais de cinco minutos.
3. Processar `pix.received` somente com `data.status === "completed"`.
4. Localizar pela `reference_id`.
5. Confirmar que método é `mercosulpay_pix`.
6. Confirmar que o valor recebido corresponde ao armazenado.
7. Atualizar em operação idempotente.
8. Registrar `transaction_id`, taxa, valor líquido e `completed_at`.
9. Deduplicar por `x-mercosulpay-delivery` e `transaction_id`.
10. Responder `2xx` em até dez segundos.
11. Nunca marcar doação manual como concluída por esse webhook.
12. Não expor segredo, assinatura ou payload sensível em logs.

## Frontend

Preserve o design existente.

Ao confirmar um valor abaixo de R$ 5:

1. Chame `POST /api/donations` para registrar a intenção no Supabase.
2. Exiba chave Pix, valor, botão de copiar e agradecimento.
3. Não gere QR Code da MercosulPay.
4. Não faça polling de confirmação automática.
5. Não mostre “pagamento confirmado”.

Ao confirmar um valor a partir de R$ 5:

1. Mostre carregamento e bloqueie cliques repetidos.
2. Chame `POST /api/donations`.
3. Exiba `qr_code_image`, Pix Copia e Cola, valor e “Aguardando pagamento”.
4. Faça polling de `GET /api/donations/:referenceId/status` a cada 3–5 segundos.
5. Pare polling em estado terminal, desmontagem ou timeout.
6. Quando o backend retornar `completed`, remova o QR Code e mostre:

> Doação confirmada! Muito obrigado por fazer parte dessa corrente de cuidado. Sua contribuição ajuda a Cãopanhia Baltazar a oferecer alimento, proteção, atendimento e uma nova chance aos animais que precisam. Cada doação importa. Cada gesto salva vidas.

No celular, garanta modal rolável, QR Code responsivo, código sem quebrar layout, botões grandes e ausência de rolagem horizontal.

## Segurança

- Rate limit em criação de cobrança e consulta de status.
- Service Role somente no servidor.
- Validação de entrada no backend.
- CORS restrito se houver origens diferentes.
- Queries parametrizadas/cliente oficial Supabase.
- IDs públicos imprevisíveis.
- Idempotência de webhook.
- Nenhum segredo em logs, respostas, repositório ou navegador.
- Nenhum QR Code falso.
- Nenhuma confirmação baseada apenas no frontend.
- Não implementar saques Pix ou cripto.

## EasyPanel e domínio

Prepare o projeto para EasyPanel com o menor número razoável de serviços. O Supabase será externo, portanto não crie PostgreSQL no EasyPanel.

Verifique ou crie conforme necessário:

- `Dockerfile`;
- comandos de instalação, build e start;
- porta e healthcheck;
- variáveis de ambiente;
- proxy reverso;
- HTTPS;
- migrations Supabase;
- documentação do webhook.

Variáveis esperadas:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://doecaopanhiabaltazar.com.br
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCOSULPAY_API_URL=https://mercosulpay.com/api/public/v1
MERCOSULPAY_API_KEY=otp_test_SUBSTITUIR
MERCOSULPAY_WEBHOOK_SECRET=whsec_SUBSTITUIR
MANUAL_PIX_KEY=21968053672
MANUAL_PIX_KEY_TYPE=phone
AUTOMATIC_PIX_MIN_AMOUNT=5.00
```

Não peça que eu cole Service Role, chave MercosulPay ou segredo de webhook no chat. Oriente-me a cadastrá-los diretamente nas variáveis do EasyPanel e no ambiente local.

## Testes obrigatórios

Implemente testes para:

- valores inválidos;
- `4.99` seguindo fluxo manual;
- `5.00` seguindo MercosulPay;
- criação do registro manual no Supabase;
- criação da cobrança automática;
- falha da MercosulPay sem perder rastreabilidade;
- assinatura HMAC válida e inválida;
- timestamp expirado;
- webhook duplicado;
- divergência de valor;
- transição `pending` para `completed`;
- garantia de que `awaiting_manual_payment` não vira `completed` pelo webhook;
- polling e mensagem de sucesso;
- cópia da chave Pix.

Use `otp_test_`. Nunca realize pagamento real nos testes.

## Entrega

Atualize o README com:

1. Arquitetura encontrada.
2. Arquivos alterados.
3. Migration e como aplicá-la no Supabase.
4. Configuração segura das chaves.
5. Execução local.
6. Testes.
7. Deploy no EasyPanel.
8. Domínio e HTTPS.
9. Cadastro do webhook no painel MercosulPay.
10. Homologação com `otp_test_`.
11. Troca segura para `otp_live_` somente após minha autorização.

Ao final, mostre resumo, arquivos alterados, variáveis, migration, comandos, URL do webhook, checklist de testes e ações manuais restantes.

Não invente campos ou endpoints da MercosulPay. Se faltar informação na documentação, pare e diga exatamente o que precisa ser confirmado.
