# Teste de Webhook MercosulPay via Postman

## Configuração

### URL do Webhook
- **Produção**: `https://doecaopanhiabaltazar.com.br/api/webhooks/mercosulpay`
- **Desenvolvimento**: `http://localhost:5173/api/webhooks/mercosulpay`

### Headers

| Header | Valor | Descrição |
|--------|-------|-----------|
| `Content-Type` | `application/json` | Tipo do conteúdo |
| `x-mercosulpay-signature` | `sha256=<assinatura>` | Assinatura HMAC-SHA256 (veja abaixo) |
| `x-mercosulpay-timestamp` | `<timestamp>` | Timestamp Unix em segundos |
| `x-mercosulpay-delivery` | `<uuid>` | ID único da entrega |
| `x-mercosulpay-event` | `pix.received` | Tipo do evento |

### Payload (Body)

```json
{
  "event": "pix.received",
  "data": {
    "status": "completed",
    "reference_id": "don_1787329911884_b361c794",
    "transaction_id": "txn_test_1234567890",
    "amount": 10,
    "fee": 1.4,
    "net_amount": 8.6
  }
}
```

**Importante**: Substitua `reference_id` pelo ID de uma doação existente no banco de dados.

## Autenticação - Gerando a Assinatura

A assinatura é calculada usando HMAC-SHA256 com o seguinte formato:

```
sha256=<hmac_sha256(WEBHOOK_SECRET, timestamp + "." + raw_body)>
```

### Script para Gerar Assinatura (Node.js)

Crie um arquivo `generate-signature.js`:

```javascript
const crypto = require('crypto');
require('dotenv').config();

const WEBHOOK_SECRET = process.env.MERCOSULPAY_WEBHOOK_SECRET;
const timestamp = Math.floor(Date.now() / 1000);
const rawBody = JSON.stringify({
  "event": "pix.received",
  "data": {
    "status": "completed",
    "reference_id": "don_1787329911884_b361c794",
    "transaction_id": "txn_test_1234567890",
    "amount": 10,
    "fee": 1.4,
    "net_amount": 8.6
  }
});

const signature = "sha256=" + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${timestamp}.${rawBody}`)
  .digest('hex');

console.log('Timestamp:', timestamp);
console.log('Signature:', signature);
console.log('Delivery ID:', crypto.randomUUID());
```

Execute o script:
```bash
node generate-signature.js
```

## Passo a Passo no Postman

1. **Crie uma nova requisição POST**
   - URL: `http://localhost:5173/api/webhooks/mercosulpay`

2. **Configure os Headers**
   ```
   Content-Type: application/json
   x-mercosulpay-signature: sha256=<assinatura_gerada>
   x-mercosulpay-timestamp: <timestamp_gerado>
   x-mercosulpay-delivery: <uuid_gerado>
   x-mercosulpay-event: pix.received
   ```

3. **Configure o Body**
   - Selecione `raw` e `JSON`
   - Cole o payload JSON

4. **Envie a requisição**

## Respostas Esperadas

- **200 OK**: Webhook processado com sucesso
  ```json
  { "status": "processed" }
  ```

- **200 OK**: Webhook já processado anteriormente (duplicate)
  ```json
  { "status": "already_processed" }
  ```

- **200 OK**: Evento ignorado (não é pix.received ou status não é completed)
  ```json
  { "status": "ignored" }
  ```

- **401 Unauthorized**: Assinatura inválida ou timestamp muito antigo
  ```json
  { "error": "Invalid signature" }
  ```
  ou
  ```json
  { "error": "Timestamp too old" }
  ```

- **404 Not Found**: Doação não encontrada para o reference_id
  ```json
  { "error": "Donation not found" }
  ```

- **400 Bad Request**: Erro de validação
  ```json
  { "error": "Amount mismatch" }
  ```
  ou
  ```json
  { "error": "Wrong payment method" }
  ```

## Dicas

1. **Obter reference_id**: Crie uma doação via frontend primeiro para obter o `reference_id` do banco de dados.

2. **Timestamp**: O timestamp deve estar dentro de 5 minutos (300 segundos) do tempo atual.

3. **Delivery ID**: Use um UUID único para cada teste para evitar duplicação.

4. **Ambiente**: Teste primeiro em localhost antes de testar em produção.

5. **Logs**: Verifique os logs do terminal para ver mensagens de erro do webhook.
