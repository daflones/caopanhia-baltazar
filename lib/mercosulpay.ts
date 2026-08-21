interface MercosulPayChargeRequest {
  amount: number;
  description: string;
  reference_id: string;
}

interface MercosulPayChargeResponse {
  id: string;
  status: string;
  amount: number;
  fee: number;
  net_amount: number;
  reference_id: string;
  qr_code: string;
  qr_code_image: string;
  created_at: string;
}

interface MercosulPayError {
  error?: string;
  message?: string;
}

const API_URL = process.env.MERCOSULPAY_API_URL || "https://mercosulpay.com/api/public/v1";
const API_KEY = process.env.MERCOSULPAY_API_KEY;

if (!API_KEY) {
  throw new Error("Missing MERCOSULPAY_API_KEY environment variable");
}

export class MercosulPayError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "MercosulPayError";
  }
}

export async function createCharge(
  data: MercosulPayChargeRequest
): Promise<MercosulPayChargeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${API_URL}/pix/charges`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: MercosulPayError = await response.json().catch(() => ({}));
      throw new MercosulPayError(
        errorData.message || errorData.error || `MercosulPay error: ${response.status}`,
        response.status
      );
    }

    const chargeData: MercosulPayChargeResponse = await response.json();
    return chargeData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof MercosulPayError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new MercosulPayError("MercosulPay request timeout");
    }

    throw new MercosulPayError(
      error instanceof Error ? error.message : "Unknown MercosulPay error"
    );
  }
}
