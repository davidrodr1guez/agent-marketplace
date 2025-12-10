import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Loader2, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { AgentTypeSelector } from '../agents/AgentTypeSelector';
import { CONTRACTS, AGENT_TYPES } from '../../config/wagmi';
import { useStore } from '../../stores/useStore';

// UltraTask ABI (simplified)
const ULTRA_TASK_ABI = [
  {
    name: 'createTask',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'description', type: 'string' },
      { name: 'requiredAgentType', type: 'uint8' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

export function CreateTaskForm() {
  const [step, setStep] = useState(1);
  const [agentType, setAgentType] = useState(null);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('0.01');

  const { isConnected } = useAccount();
  const { addNotification, addActiveTask } = useStore();

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

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
      writeContract({
        address: CONTRACTS.UltraTask,
        abi: ULTRA_TASK_ABI,
        functionName: 'createTask',
        args: [description, agentType],
        value: parseEther(budget),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Transaction Failed',
        message: error.message
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
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon-green/20 flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-neon-green" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Task Created!</h2>
        <p className="text-white/60 mb-6">Your task is being processed by agents</p>
        <a
          href={`https://sepolia.basescan.org/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neon-blue hover:underline text-sm font-mono"
        >
          View transaction →
        </a>
        <button
          onClick={() => {
            setStep(1);
            setAgentType(null);
            setDescription('');
            setBudget('0.01');
          }}
          className="btn-secondary mt-6 block mx-auto"
        >
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
                  ? 'bg-neon-blue text-dark-900'
                  : s < step
                  ? 'bg-neon-green/20 text-neon-green'
                  : 'bg-dark-700 text-white/40'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 ${s < step ? 'bg-neon-green/30' : 'bg-dark-700'}`} />
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

        {/* Step 3: Set Budget */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-2xl font-bold mb-2">Set Your Budget</h2>
            <p className="text-white/50 mb-6">
              This will be distributed to agents upon task completion
            </p>

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
              {['0.005', '0.01', '0.05', '0.1'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBudget(amount)}
                  className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                    budget === amount
                      ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                      : 'bg-dark-700 text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Summary */}
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
                  <span className="text-white/40">Total Cost</span>
                  <span className="text-neon-blue font-bold">{budget} ETH</span>
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
            disabled={!isConnected || !canProceed() || isPending || isConfirming}
            className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isPending ? 'Confirm in Wallet...' : 'Processing...'}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Create Task
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
