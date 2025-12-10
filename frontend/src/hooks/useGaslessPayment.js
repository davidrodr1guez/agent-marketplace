import { useState, useCallback } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { API_URL } from '../config/wagmi';

/**
 * Hook for Gasless Payments powered by UltravioletaDAO
 *
 * Uses ERC-3009 meta-transactions - user only signs, no gas needed!
 */

// USDC on Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ERC-3009 Types for USDC TransferWithAuthorization
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

// USDC Domain - must match exactly what contract expects
const getUSDCDomain = (chainId) => ({
  name: 'USDC',  // Base Sepolia USDC uses "USDC" not "USD Coin"
  version: '2',
  chainId,
  verifyingContract: USDC_ADDRESS
});

// Generate random nonce
const generateNonce = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

export function useGaslessPayment() {
  const { address, chainId } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get quote for gasless payment
   */
  const getQuote = useCallback(async (ethAmount) => {
    try {
      const response = await fetch(`${API_URL}/api/payment/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ethAmount })
      });

      if (!response.ok) {
        // Fallback calculation
        const ethValue = parseFloat(ethAmount);
        const usdcAmount = ethValue * 2500; // Approximate ETH price
        return {
          ethAmount,
          usdcAmount: usdcAmount.toFixed(2),
          usdcRaw: Math.ceil(usdcAmount * 1e6),
          fee: (usdcAmount * 0.025).toFixed(2),
          total: (usdcAmount * 1.025).toFixed(2),
          totalRaw: Math.ceil(usdcAmount * 1.025 * 1e6)
        };
      }

      return await response.json();
    } catch (err) {
      console.error('Quote error:', err);
      throw err;
    }
  }, []);

  /**
   * Create and sign gasless payment authorization
   */
  const signPayment = useCallback(async ({
    recipient,
    amountUSDC,
    taskId,
    agentId
  }) => {
    if (!address) throw new Error('Wallet not connected');

    setIsLoading(true);
    setError(null);

    try {
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
      const nonce = generateNonce();

      // Message values must be BigInt for uint256 types
      const message = {
        from: address,
        to: recipient,
        value: BigInt(amountUSDC),
        validAfter: BigInt(0),
        validBefore: validBefore,
        nonce
      };

      // Sign ERC-3009 authorization
      const signature = await signTypedDataAsync({
        domain: getUSDCDomain(chainId || 84532),
        types: ERC3009_TYPES,
        primaryType: 'TransferWithAuthorization',
        message
      });

      // Convert back to strings for JSON serialization
      const authorization = {
        from: address,
        to: recipient,
        value: amountUSDC.toString(),
        validAfter: '0',
        validBefore: validBefore.toString(),
        nonce
      };

      return {
        authorization: {
          domain: getUSDCDomain(chainId || 84532),
          types: ERC3009_TYPES,
          message: authorization
        },
        signature,
        taskId,
        agentId
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, signTypedDataAsync]);

  /**
   * Submit signed authorization to execute payment
   */
  const executePayment = useCallback(async (signedPayment) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/payment/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Payer': address,
          'X-402-Mode': 'gasless'
        },
        body: JSON.stringify(signedPayment)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.reason || 'Payment failed');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  /**
   * Full gasless payment flow
   */
  const payGasless = useCallback(async ({
    recipient,
    ethAmount,
    taskId,
    agentId
  }) => {
    // 1. Get quote
    const quote = await getQuote(ethAmount);

    // 2. Sign authorization
    const signedPayment = await signPayment({
      recipient,
      amountUSDC: quote.totalRaw,
      taskId,
      agentId
    });

    // 3. Execute through facilitator
    const result = await executePayment(signedPayment);

    return {
      ...result,
      quote,
      gasless: true,
      poweredBy: 'UltravioletaDAO'
    };
  }, [getQuote, signPayment, executePayment]);

  return {
    payGasless,
    signPayment,
    executePayment,
    getQuote,
    isLoading,
    error,
    isConnected: !!address
  };
}

export default useGaslessPayment;
