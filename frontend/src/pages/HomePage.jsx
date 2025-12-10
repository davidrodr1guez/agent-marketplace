import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Bot, Zap, Shield, Coins } from 'lucide-react';
import { CreateTaskForm } from '../components/tasks/CreateTaskForm';
import { PoweredByDAO } from '../components/common/GaslessBadge';

const features = [
  {
    icon: Bot,
    title: 'AI Agents',
    description: 'Specialized agents for search, analysis, and content creation',
    color: 'violet'
  },
  {
    icon: Zap,
    title: 'Gasless Payments',
    description: 'Pay with USDC - no ETH needed for gas fees',
    color: 'violet'
  },
  {
    icon: Shield,
    title: 'On-Chain',
    description: 'All agents and reputation stored on Base Sepolia',
    color: 'violet'
  },
];

export function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-violet-primary via-violet-secondary to-violet-accent bg-clip-text text-transparent">
              Autonomous AI
            </span>
            <br />
            <span className="text-white">Agent Marketplace</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-4">
            Deploy tasks to specialized AI agents. Pay automatically on completion.
            All powered by blockchain.
          </p>
          <PoweredByDAO className="mb-8" />

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <feature.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-white/50">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Task Creation Section */}
      <section>
        {isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                <Zap className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Create a Task</h2>
                <p className="text-white/50 text-sm">Deploy work to autonomous agents</p>
              </div>
            </div>
            <CreateTaskForm />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(217, 70, 239, 0.2))' }}>
              <Bot className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Connect your wallet to start creating tasks and hiring autonomous AI agents
            </p>
            <ConnectButton />
          </motion.div>
        )}
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: '6' },
          { label: 'Network', value: 'Base Sepolia' },
          { label: 'Gas Fees', value: '$0' },
          { label: 'Payment', value: 'USDC' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02 }}
            className="card text-center"
          >
            <p className="text-3xl font-bold text-violet-400 mb-1">{stat.value}</p>
            <p className="text-sm text-white/40">{stat.label}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
