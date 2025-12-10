import { ethers } from 'ethers';

/**
 * x402 Middleware - HTTP 402 Payment Required
 *
 * Implementa el protocolo x402 para pagos automáticos en endpoints de API.
 * El cliente envía un header con la firma de pago, el servidor verifica y procesa.
 *
 * Headers esperados:
 * - X-402-Payment: JSON con { signature, amount, nonce, timestamp }
 * - X-402-Payer: Dirección del pagador
 */

// In-memory nonce tracking (use Redis in production)
const usedNonces = new Set();

// UltravioletaDAO Payment Configuration
const PAYMENT_CONFIG = {
  recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
  facilitator: process.env.X402_FACILITATOR || 'https://facilitator.ultravioletadao.xyz',
  chainId: 84532, // Base Sepolia
  validityWindow: 5 * 60 * 1000, // 5 minutes
  daoName: 'UltravioletaDAO',
};

/**
 * Crea el middleware x402 con precio configurable
 */
export function x402Payment(priceWei) {
  return async (req, res, next) => {
    // Skip if x402 is disabled
    if (process.env.X402_ENABLED !== 'true') {
      return next();
    }

    const paymentHeader = req.headers['x-402-payment'];
    const payerAddress = req.headers['x-402-payer'];

    // No payment header - return 402 with payment details
    if (!paymentHeader) {
      return res.status(402).json({
        error: 'Payment Required',
        x402: {
          version: '1.0',
          recipient: PAYMENT_CONFIG.recipient,
          facilitator: PAYMENT_CONFIG.facilitator,
          amount: priceWei,
          currency: 'ETH',
          chainId: PAYMENT_CONFIG.chainId,
          network: 'base-sepolia',
          description: 'UltraMarket - Payment for AI Agent task execution',
          poweredBy: 'UltravioletaDAO',
          paymentMethods: ['eip-712-signature'],
          instructions: 'Sign a payment message with EIP-712 and include in X-402-Payment header'
        }
      });
    }

    try {
      // Parse payment header
      const payment = JSON.parse(paymentHeader);
      const { signature, amount, nonce, timestamp } = payment;

      // Validate payment
      const validation = await validatePayment({
        signature,
        amount,
        nonce,
        timestamp,
        payer: payerAddress,
        requiredAmount: priceWei
      });

      if (!validation.valid) {
        return res.status(402).json({
          error: 'Payment Invalid',
          reason: validation.reason
        });
      }

      // Mark nonce as used
      usedNonces.add(nonce);

      // Attach payment info to request
      req.x402Payment = {
        payer: payerAddress,
        amount,
        nonce,
        verified: true
      };

      next();
    } catch (error) {
      return res.status(402).json({
        error: 'Payment Processing Error',
        reason: error.message
      });
    }
  };
}

/**
 * Valida una firma de pago EIP-712
 */
async function validatePayment({ signature, amount, nonce, timestamp, payer, requiredAmount }) {
  // Check amount
  if (BigInt(amount) < BigInt(requiredAmount)) {
    return { valid: false, reason: 'Insufficient payment amount' };
  }

  // Check timestamp
  const now = Date.now();
  if (Math.abs(now - timestamp) > PAYMENT_CONFIG.validityWindow) {
    return { valid: false, reason: 'Payment timestamp expired' };
  }

  // Check nonce hasn't been used
  if (usedNonces.has(nonce)) {
    return { valid: false, reason: 'Nonce already used' };
  }

  // Verify EIP-712 signature
  const domain = {
    name: 'UltraMarket',
    version: '1',
    chainId: PAYMENT_CONFIG.chainId,
    verifyingContract: PAYMENT_CONFIG.recipient
  };

  const types = {
    Payment: [
      { name: 'payer', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ]
  };

  const value = {
    payer,
    recipient: PAYMENT_CONFIG.recipient,
    amount,
    nonce,
    timestamp
  };

  try {
    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);

    if (recoveredAddress.toLowerCase() !== payer.toLowerCase()) {
      return { valid: false, reason: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Signature verification failed' };
  }
}

/**
 * Helper para generar payment request del cliente
 */
export function generatePaymentMessage(payer, amount, nonce, timestamp) {
  return {
    domain: {
      name: 'UltraMarket',
      version: '1',
      chainId: PAYMENT_CONFIG.chainId,
      verifyingContract: PAYMENT_CONFIG.recipient
    },
    types: {
      Payment: [
        { name: 'payer', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ]
    },
    value: {
      payer,
      recipient: PAYMENT_CONFIG.recipient,
      amount,
      nonce,
      timestamp
    }
  };
}

/**
 * Endpoint helper para obtener info de pago
 */
export function getPaymentInfo(priceWei) {
  return {
    version: '1.0',
    recipient: PAYMENT_CONFIG.recipient,
    facilitator: PAYMENT_CONFIG.facilitator,
    amount: priceWei,
    currency: 'ETH',
    chainId: PAYMENT_CONFIG.chainId,
    network: 'base-sepolia',
    poweredBy: 'UltravioletaDAO'
  };
}

export default { x402Payment, generatePaymentMessage, getPaymentInfo };
