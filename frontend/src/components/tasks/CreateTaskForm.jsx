import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Loader2, Zap, ArrowRight, Sparkles, PenTool } from 'lucide-react';
import { AgentTypeSelector } from '../agents/AgentTypeSelector';
import { CONTRACTS, AGENT_TYPES, API_URL } from '../../config/wagmi';
import { useStore } from '../../stores/useStore';
import { useGaslessPayment } from '../../hooks/useGaslessPayment';
import { GaslessBadge } from '../common/GaslessBadge';

// UltravioletaDAO Testnet Facilitator Address (receives USDC payments)
const DAO_RECIPIENT = '0x34033041a5944B8F10f8E4D8496Bfb84f1A293A8';

export function CreateTaskForm() {
  const [step, setStep] = useState(1);
  const [agentType, setAgentType] = useState(null);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('0.00001');
  const [quote, setQuote] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const { isConnected, address } = useAccount();
  const { addNotification } = useStore();
  const { signPayment, getQuote, isLoading, error } = useGaslessPayment();

  // Get USDC quote when budget changes
  useEffect(() => {
    if (step === 3 && budget) {
      getQuote(budget)
        .then(setQuote)
        .catch(console.error);
    }
  }, [step, budget, getQuote]);

  const handleSubmit = async () => {
    if (!CONTRACTS.UltraTask) {
      addNotification({
        type: 'error',
        title: 'Contract Not Deployed',
        message: 'UltraTask contract address not configured'
      });
      return;
    }

    try {
      // 1. Get fresh quote
      const freshQuote = await getQuote(budget);

      // 2. Sign the payment authorization (no gas needed!)
      const signedPayment = await signPayment({
        recipient: DAO_RECIPIENT,
        amountUSDC: freshQuote.totalRaw,
        taskId: `task-${Date.now()}`,
        agentId: `agent-type-${agentType}`
      });

      // 3. Send to backend to process
      const response = await fetch(`${API_URL}/api/tasks/create-gasless`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Payer': address,
          'X-402-Mode': 'gasless'
        },
        body: JSON.stringify({
          ...signedPayment,
          task: {
            description,
            agentType,
            budget,
            budgetUSDC: freshQuote.total
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.reason || errorData.error || 'Failed to create task');
      }

      const result = await response.json();

      setTxHash(result.transactionHash);
      setIsSuccess(true);

      addNotification({
        type: 'success',
        title: 'Task Created!',
        message: `Gasless payment processed. No gas fees paid!`
      });

    } catch (err) {
      console.error('Gasless payment error:', err);
      addNotification({
        type: 'error',
        title: 'Payment Failed',
        message: err.message || 'Failed to sign payment'
      });
    }
  };

  const canProceed = () => {
    if (step === 1) return agentType !== null;
    if (step === 2) return description.trim().length >= 10;
    if (step === 3) return parseFloat(budget) > 0;
    return false;
  };

  const nextStep = () => {
    if (canProceed() && step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetForm = () => {
    setStep(1);
    setAgentType(null);
    setDescription('');
    setBudget('0.00001');
    setQuote(null);
    setIsSuccess(false);
    setTxHash(null);
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(139, 92, 246, 0.2)' }}
        >
          <Sparkles className="w-10 h-10 text-violet-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Task Created!</h2>
        <p className="text-white/60 mb-4">Your task is being processed by agents</p>
        <GaslessBadge size="lg" className="justify-center mb-6" />
        {txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 hover:underline text-sm font-mono block mb-6"
          >
            View transaction on BaseScan →
          </a>
        )}
        <button onClick={resetForm} className="btn-secondary">
          Create Another Task
        </button>
      </motion.div>
    );
  }

  return (
    <div className="card">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s === step
                  ? 'bg-violet-500 text-white'
                  : s < step
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-dark-700 text-white/40'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 ${s < step ? 'bg-violet-500/30' : 'bg-dark-700'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Agent Type */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-2xl font-bold mb-2">Choose Agent Type</h2>
            <p className="text-white/50 mb-6">Select the type of AI agent for your task</p>
            <AgentTypeSelector selected={agentType} onChange={setAgentType} />
          </motion.div>
        )}

        {/* Step 2: Task Description */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-2xl font-bold mb-2">Describe Your Task</h2>
            <p className="text-white/50 mb-6">
              Be specific about what you need the {AGENT_TYPES[agentType]?.name} to do
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Example: ${
                agentType === 0
                  ? 'Search for the latest trends in AI automation...'
                  : agentType === 1
                  ? 'Analyze the market data for DeFi protocols...'
                  : 'Write a technical blog post about smart contracts...'
              }`}
              className="input min-h-[200px] resize-none font-mono text-sm"
            />
            <p className="text-xs text-white/30 mt-2">
              {description.length} characters (minimum 10)
            </p>
          </motion.div>
        )}

        {/* Step 3: Set Budget - GASLESS */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Set Your Budget</h2>
                <p className="text-white/50">Pay with USDC - No gas fees!</p>
              </div>
              <GaslessBadge size="md" />
            </div>

            <div className="relative mb-6">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                step="0.001"
                min="0.001"
                className="input text-3xl font-bold text-center pr-20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-mono">
                ETH
              </span>
            </div>

            {/* Quick select */}
            <div className="flex gap-2 justify-center mb-8">
              {['0.00001', '0.00002', '0.00005', '0.0001'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBudget(amount)}
                  className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                    budget === amount
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      : 'bg-dark-700 text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Summary with USDC conversion */}
            <div className="bg-dark-700/50 rounded-xl p-4 border border-white/5">
              <h4 className="text-sm font-medium text-white/60 mb-3">Task Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Agent Type</span>
                  <span className="text-white">{AGENT_TYPES[agentType]?.icon} {AGENT_TYPES[agentType]?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Description</span>
                  <span className="text-white truncate max-w-[200px]">{description.slice(0, 30)}...</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-white/40">Budget (ETH)</span>
                  <span className="text-white font-mono">{budget} ETH</span>
                </div>
                {quote && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/40">Amount (USDC)</span>
                      <span className="text-white font-mono">${quote.usdcAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Facilitator Fee</span>
                      <span className="text-white font-mono">${quote.fee}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/5">
                      <span className="text-violet-400 font-medium">Total (USDC)</span>
                      <span className="text-violet-400 font-bold font-mono">${quote.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Gas Fee</span>
                      <span className="text-green-400 font-bold">$0.00</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Gasless info */}
            <div className="mt-4 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
            >
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                <div className="text-white/70">
                  <strong className="text-violet-300">Gasless Payment:</strong> You'll only need to sign a message.
                  The UltravioletaDAO facilitator will execute the transaction and pay the gas fees.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {step < 3 ? (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isConnected || !canProceed() || isLoading}
            className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sign in Wallet...
              </>
            ) : (
              <>
                <PenTool className="w-4 h-4" />
                Sign & Create Task
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
      )}
    </div>
  );
}
