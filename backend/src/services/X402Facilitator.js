import { ethers } from 'ethers';

/**
 * X402 Facilitator Service - UltravioletaDAO
 *
 * Full implementation following the x402 specification:
 * https://github.com/coinbase/x402/blob/main/specs/x402-specification.md
 * https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/
 */

export const FACILITATOR_URL = process.env.X402_FACILITATOR || 'https://facilitator.ultravioletadao.xyz';

// USDC on Base Sepolia (official Circle deployment)
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Network name for x402
const NETWORK = 'base-sepolia';

// ERC-3009 Domain for USDC - must match exactly what the contract expects
const getUSDCDomain = (chainId = BASE_SEPOLIA_CHAIN_ID) => ({
  name: 'USDC',  // Base Sepolia USDC uses "USDC" not "USD Coin"
  version: '2',
  chainId,
  verifyingContract: USDC_ADDRESS
});

// ERC-3009 Types for TransferWithAuthorization - exact format per EIP-712
const ERC3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

/**
 * Generate a random 32-byte nonce for ERC-3009
 */
export function generateNonce() {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Verify EIP-712 authorization signature locally
 */
export function verifyAuthorization(authorization, signature) {
  try {
    const { domain, types, message } = authorization;

    // Remove EIP712Domain if present (ethers handles it internally)
    const typesToUse = { ...types };
    delete typesToUse.EIP712Domain;

    const recoveredAddress = ethers.verifyTypedData(domain, typesToUse, message, signature);
    const isValid = recoveredAddress.toLowerCase() === message.from.toLowerCase();

    console.log(`[x402] Local signature verification: ${isValid ? 'VALID' : 'INVALID'}`);
    console.log(`[x402] Recovered: ${recoveredAddress}, Expected: ${message.from}`);

    return isValid;
  } catch (error) {
    console.error('[x402] Signature verification failed:', error.message);
    return false;
  }
}

/**
 * Build PaymentPayload according to x402 specification
 * This is what the client sends in the X-PAYMENT header (base64 encoded)
 */
export function buildPaymentPayload(signature, authorization) {
  return {
    x402Version: 1,
    scheme: 'exact',
    network: NETWORK,
    payload: {
      signature: signature,
      authorization: {
        from: authorization.from,
        to: authorization.to,
        value: authorization.value.toString(),
        validAfter: authorization.validAfter.toString(),
        validBefore: authorization.validBefore.toString(),
        nonce: authorization.nonce
      }
    }
  };
}

/**
 * Build PaymentRequirements according to x402 specification
 * This is returned in the HTTP 402 response
 */
export function buildPaymentRequirements({
  maxAmountRequired,
  payTo,
  resource,
  description = 'UltraMarket Task Payment'
}) {
  return {
    x402Version: 1,
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: maxAmountRequired.toString(),
    asset: USDC_ADDRESS,
    payTo: payTo,
    resource: resource,
    description: description,
    mimeType: 'application/json',
    maxTimeoutSeconds: 60,
    outputSchema: null,
    extra: {
      name: 'USDC',
      version: '2'
    }
  };
}

/**
 * Call the facilitator /verify endpoint
 * Request format per x402 spec (UltravioletaDAO requires x402Version at root)
 */
export async function verifyWithFacilitator(paymentPayload, paymentRequirements) {
  console.log(`[x402] Calling ${FACILITATOR_URL}/verify`);

  const requestBody = {
    x402Version: 1,
    paymentPayload,
    paymentRequirements
  };

  console.log('[x402] Verify request:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${FACILITATOR_URL}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const text = await response.text();
  console.log('[x402] Verify response:', response.status, text);

  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Invalid JSON from facilitator: ${text.substring(0, 200)}`);
  }

  // Response format: { isValid: boolean, invalidReason?: string, payer: string }
  return result;
}

/**
 * Call the facilitator /settle endpoint
 * Request format per x402 spec
 */
export async function settleWithFacilitator(paymentPayload, paymentRequirements) {
  console.log(`[x402] Calling ${FACILITATOR_URL}/settle`);

  const requestBody = {
    x402Version: 1,
    paymentPayload,
    paymentRequirements
  };

  console.log('[x402] Settle request:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${FACILITATOR_URL}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const text = await response.text();
  console.log('[x402] Settle response:', response.status, text);

  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Invalid JSON from facilitator: ${text.substring(0, 200)}`);
  }

  // Response format: { success: boolean, transaction?: string, network?: string, payer?: string, errorReason?: string }
  return result;
}

/**
 * Process gasless payment through UltravioletaDAO facilitator
 * Full x402 flow: verify -> settle
 */
export async function processGaslessPayment({
  authorization,
  signature,
  taskId,
  recipient
}) {
  console.log('[x402] Processing gasless payment for task:', taskId);

  // Extract authorization message from the full authorization object
  const authMessage = authorization.message || authorization;

  // 1. Build the paymentPayload from the signed authorization
  const paymentPayload = buildPaymentPayload(signature, authMessage);

  // 2. Build paymentRequirements
  const paymentRequirements = buildPaymentRequirements({
    maxAmountRequired: authMessage.value,
    payTo: authMessage.to,
    resource: `ultramarket://task/${taskId}`,
    description: `UltraMarket Task: ${taskId}`
  });

  // 3. Verify with facilitator
  const verifyResult = await verifyWithFacilitator(paymentPayload, paymentRequirements);

  if (!verifyResult.isValid) {
    console.error('[x402] Verification failed:', verifyResult.invalidReason);
    throw new Error(verifyResult.invalidReason || 'Payment verification failed');
  }

  console.log('[x402] Payment verified, payer:', verifyResult.payer);

  // 4. Settle (execute) the payment
  const settleResult = await settleWithFacilitator(paymentPayload, paymentRequirements);

  if (!settleResult.success) {
    console.error('[x402] Settlement failed:', settleResult.errorReason);
    throw new Error(settleResult.errorReason || 'Payment settlement failed');
  }

  console.log('[x402] Payment settled successfully');
  console.log('[x402] Transaction hash:', settleResult.transaction);

  return {
    success: true,
    transactionHash: settleResult.transaction,
    network: settleResult.network || NETWORK,
    payer: settleResult.payer,
    gasless: true,
    paidBy: 'UltravioletaDAO Facilitator'
  };
}

/**
 * Get payment quote - local calculation
 */
export async function getPaymentQuote({ serviceType, ethAmount }) {
  const ethPrice = 2500; // USD per ETH
  const ethValue = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
  const usdcAmount = ethValue * ethPrice;
  const fee = usdcAmount * 0.025; // 2.5% facilitator fee
  const total = usdcAmount + fee;

  return {
    ethAmount: ethAmount.toString(),
    usdcAmount: usdcAmount.toFixed(2),
    usdcRaw: Math.ceil(usdcAmount * 1e6),
    fee: fee.toFixed(2),
    total: total.toFixed(2),
    totalRaw: Math.ceil(total * 1e6),
    ethPrice,
    serviceType,
    poweredBy: 'UltravioletaDAO'
  };
}

/**
 * Create the data for frontend to request EIP-712 signature
 * Returns the exact structure needed for wagmi's signTypedData
 */
export function createSignatureRequest({
  payer,
  recipient,
  amountUSDC,
  chainId = BASE_SEPOLIA_CHAIN_ID
}) {
  const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity
  const nonce = generateNonce();

  const domain = getUSDCDomain(chainId);
  const types = ERC3009_TYPES;
  const message = {
    from: payer,
    to: recipient,
    value: amountUSDC.toString(),
    validAfter: '0',
    validBefore: validBefore.toString(),
    nonce
  };

  return {
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message
  };
}

/**
 * Generate HTTP 402 Payment Required response
 * This is returned when a client requests a protected resource without payment
 */
export function createPaymentRequiredResponse({
  price,
  payTo,
  resource,
  description
}) {
  return {
    x402Version: 1,
    error: 'Payment Required',
    accepts: [
      buildPaymentRequirements({
        maxAmountRequired: price,
        payTo,
        resource,
        description
      })
    ]
  };
}

// Legacy exports for compatibility
export const createGaslessPaymentRequest = createSignatureRequest;
export const submitToFacilitator = processGaslessPayment;
export const createTransferAuthorization = createSignatureRequest;

export default {
  FACILITATOR_URL,
  USDC_ADDRESS,
  generateNonce,
  verifyAuthorization,
  buildPaymentPayload,
  buildPaymentRequirements,
  verifyWithFacilitator,
  settleWithFacilitator,
  processGaslessPayment,
  getPaymentQuote,
  createSignatureRequest,
  createPaymentRequiredResponse
};
