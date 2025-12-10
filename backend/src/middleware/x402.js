import { ethers } from 'ethers';
import {
  createGaslessPaymentRequest,
  processGaslessPayment,
  getPaymentQuote,
  verifyAuthorization,
  FACILITATOR_URL,
  USDC_ADDRESS
} from '../services/X402Facilitator.js';

/**
 * x402 Middleware - HTTP 402 Payment Required
 * Now with Gasless Payments powered by UltravioletaDAO!
 *
 * Supports two payment modes:
 * 1. Traditional: User pays gas + ETH
 * 2. Gasless: User signs ERC-3009, facilitator pays gas, collects USDC
 *
 * Headers:
 * - X-402-Payment: JSON with payment data
 * - X-402-Payer: Payer address
 * - X-402-Mode: 'gasless' | 'traditional' (default: gasless)
 */

// In-memory nonce tracking (use Redis in production)
const usedNonces = new Set();

// UltravioletaDAO Payment Configuration
const PAYMENT_CONFIG = {
  recipient: process.env.X402_RECIPIENT || '0x97a3935fBF2d4ac9437dc10e62722D1549C8C43A',
  facilitator: FACILITATOR_URL,
  usdcAddress: USDC_ADDRESS,
  chainId: 84532, // Base Sepolia
  validityWindow: 5 * 60 * 1000, // 5 minutes
  daoName: 'UltravioletaDAO',
  gaslessEnabled: process.env.X402_GASLESS !== 'false', // Enabled by default
};

/**
 * x402 Payment Middleware with Gasless Support
 */
export function x402Payment(priceWei, options = {}) {
  const { agentName = 'AI Agent', taskDescription = 'Task execution' } = options;

  return async (req, res, next) => {
    // Skip if x402 is disabled
    if (process.env.X402_ENABLED !== 'true') {
      return next();
    }

    const paymentHeader = req.headers['x-402-payment'];
    const payerAddress = req.headers['x-402-payer'];
    const paymentMode = req.headers['x-402-mode'] || 'gasless';

    // No payment header - return 402 with payment options
    if (!paymentHeader) {
      // Get USDC quote for gasless option
      let gaslessQuote = null;
      if (PAYMENT_CONFIG.gaslessEnabled) {
        try {
          gaslessQuote = await getPaymentQuote({
            serviceType: 'agent-task',
            ethAmount: priceWei
          });
        } catch (e) {
          console.warn('Failed to get gasless quote:', e.message);
        }
      }

      return res.status(402).json({
        error: 'Payment Required',
        x402: {
          version: '2.0',
          poweredBy: 'UltravioletaDAO',

          // Gasless option (recommended)
          gasless: PAYMENT_CONFIG.gaslessEnabled ? {
            enabled: true,
            facilitator: PAYMENT_CONFIG.facilitator,
            token: {
              address: PAYMENT_CONFIG.usdcAddress,
              symbol: 'USDC',
              decimals: 6
            },
            quote: gaslessQuote,
            message: 'Sign to pay. No gas required!',
            instructions: [
              '1. Connect wallet',
              '2. Sign the payment authorization',
              '3. Facilitator submits transaction',
              '4. Task executes automatically'
            ]
          } : null,

          // Traditional option
          traditional: {
            recipient: PAYMENT_CONFIG.recipient,
            amount: priceWei,
            currency: 'ETH',
            chainId: PAYMENT_CONFIG.chainId,
            network: 'base-sepolia'
          },

          // Metadata
          description: taskDescription,
          agent: agentName,
          paymentMethods: PAYMENT_CONFIG.gaslessEnabled
            ? ['gasless-erc3009', 'eip-712-signature']
            : ['eip-712-signature']
        }
      });
    }

    try {
      const payment = JSON.parse(paymentHeader);

      // Route to appropriate handler
      if (paymentMode === 'gasless' && payment.authorization) {
        return await handleGaslessPayment(req, res, next, payment, payerAddress);
      } else {
        return await handleTraditionalPayment(req, res, next, payment, payerAddress, priceWei);
      }
    } catch (error) {
      return res.status(402).json({
        error: 'Payment Processing Error',
        reason: error.message
      });
    }
  };
}

/**
 * Handle gasless ERC-3009 payment
 */
async function handleGaslessPayment(req, res, next, payment, payerAddress) {
  const { authorization, signature, taskId, agentId } = payment;

  // Verify signature
  if (!verifyAuthorization(authorization, signature)) {
    return res.status(402).json({
      error: 'Payment Invalid',
      reason: 'Invalid authorization signature'
    });
  }

  // Check nonce
  const nonce = authorization.message?.nonce;
  if (usedNonces.has(nonce)) {
    return res.status(402).json({
      error: 'Payment Invalid',
      reason: 'Authorization already used'
    });
  }

  try {
    // Process through facilitator
    const result = await processGaslessPayment({
      authorization,
      signature,
      taskId,
      agentId
    });

    // Mark nonce as used
    usedNonces.add(nonce);

    // Attach payment info to request
    req.x402Payment = {
      payer: payerAddress,
      amount: authorization.message.value,
      currency: 'USDC',
      mode: 'gasless',
      transactionHash: result.transactionHash,
      verified: true,
      poweredBy: 'UltravioletaDAO'
    };

    next();
  } catch (error) {
    return res.status(402).json({
      error: 'Facilitator Error',
      reason: error.message,
      suggestion: 'Try traditional payment method'
    });
  }
}

/**
 * Handle traditional ETH payment
 */
async function handleTraditionalPayment(req, res, next, payment, payerAddress, requiredAmount) {
  const { signature, amount, nonce, timestamp } = payment;

  // Validate payment
  const validation = await validateTraditionalPayment({
    signature,
    amount,
    nonce,
    timestamp,
    payer: payerAddress,
    requiredAmount
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
    currency: 'ETH',
    mode: 'traditional',
    nonce,
    verified: true
  };

  next();
}

/**
 * Validate traditional ETH payment signature
 */
async function validateTraditionalPayment({ signature, amount, nonce, timestamp, payer, requiredAmount }) {
  if (BigInt(amount) < BigInt(requiredAmount)) {
    return { valid: false, reason: 'Insufficient payment amount' };
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > PAYMENT_CONFIG.validityWindow) {
    return { valid: false, reason: 'Payment timestamp expired' };
  }

  if (usedNonces.has(nonce)) {
    return { valid: false, reason: 'Nonce already used' };
  }

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
 * Generate gasless payment request for client
 */
export function createPaymentRequest({
  payer,
  amountWei,
  agentName,
  taskDescription
}) {
  return createGaslessPaymentRequest({
    payer,
    recipient: PAYMENT_CONFIG.recipient,
    amountUSDC: Math.ceil(parseFloat(ethers.formatEther(amountWei)) * 2500 * 1e6), // Convert ETH to USDC
    taskDescription,
    agentName,
    chainId: PAYMENT_CONFIG.chainId
  });
}

/**
 * Get payment info for client
 */
export function getPaymentInfo(priceWei) {
  return {
    version: '2.0',
    poweredBy: 'UltravioletaDAO',
    gaslessEnabled: PAYMENT_CONFIG.gaslessEnabled,
    facilitator: PAYMENT_CONFIG.facilitator,
    recipient: PAYMENT_CONFIG.recipient,
    amount: priceWei,
    currency: 'ETH',
    chainId: PAYMENT_CONFIG.chainId,
    network: 'base-sepolia',
    usdcAddress: PAYMENT_CONFIG.usdcAddress
  };
}

export default {
  x402Payment,
  createPaymentRequest,
  getPaymentInfo,
  PAYMENT_CONFIG
};
