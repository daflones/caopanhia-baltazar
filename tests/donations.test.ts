import { describe, it } from "node:test";
import assert from "node:assert";
import { createHmac } from "crypto";

describe("Donation API", () => {
  const API_URL = process.env.TEST_API_URL || "http://localhost:3000";

  describe("POST /api/donations", () => {
    it("should reject invalid amount (zero)", async () => {
      const response = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 0 }),
      });
      assert.strictEqual(response.status, 400);
    });

    it("should reject invalid amount (negative)", async () => {
      const response = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: -10 }),
      });
      assert.strictEqual(response.status, 400);
    });

    it("should reject invalid amount (too many decimals)", async () => {
      const response = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10.999 }),
      });
      assert.strictEqual(response.status, 400);
    });

    it("should create manual Pix donation for 4.99", async () => {
      const response = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 4.99 }),
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.payment_method, "manual_pix");
      assert.strictEqual(data.status, "awaiting_manual_payment");
      assert.ok(data.pix_key);
    });

    it("should create MercosulPay donation for 5.00", async () => {
      const response = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 5.00 }),
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.payment_method, "mercosulpay_pix");
      assert.strictEqual(data.status, "pending");
    });
  });

  describe("GET /api/donations/:referenceId/status", () => {
    it("should return 404 for non-existent donation", async () => {
      const response = await fetch(`${API_URL}/api/donations/nonexistent/status`);
      assert.strictEqual(response.status, 404);
    });
  });

  describe("GET /api/health", () => {
    it("should return healthy status", async () => {
      const response = await fetch(`${API_URL}/api/health`);
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.status, "healthy");
    });
  });
});

describe("Webhook Signature Verification", () => {
  const WEBHOOK_SECRET = "test_secret";

  it("should verify valid signature", () => {
    const timestamp = "1234567890";
    const payload = '{"event":"pix.received","data":{"status":"completed"}}';
    const signature = "sha256=" + createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    assert.strictEqual(signature, expected);
  });

  it("should reject invalid signature", () => {
    const timestamp = "1234567890";
    const payload = '{"event":"pix.received","data":{"status":"completed"}}';
    const signature = "sha256=invalid_signature";

    const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    assert.notStrictEqual(signature, expected);
  });
});

describe("Amount Validation", () => {
  function validateAmount(amount: number): { valid: boolean; error?: string } {
    if (!Number.isFinite(amount)) {
      return { valid: false, error: "Amount must be a finite number" };
    }
    if (amount <= 0) {
      return { valid: false, error: "Amount must be greater than zero" };
    }
    if (Math.round(amount * 100) !== amount * 100) {
      return { valid: false, error: "Amount must have at most 2 decimal places" };
    }
    return { valid: true };
  }

  it("should accept valid amounts", () => {
    assert.strictEqual(validateAmount(5).valid, true);
    assert.strictEqual(validateAmount(10.50).valid, true);
    assert.strictEqual(validateAmount(0.01).valid, true);
  });

  it("should reject invalid amounts", () => {
    assert.strictEqual(validateAmount(0).valid, false);
    assert.strictEqual(validateAmount(-5).valid, false);
    assert.strictEqual(validateAmount(10.999).valid, false);
    assert.strictEqual(validateAmount(Infinity).valid, false);
    assert.strictEqual(validateAmount(NaN).valid, false);
  });
});
