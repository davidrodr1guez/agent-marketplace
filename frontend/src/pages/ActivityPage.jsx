import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Activity, Clock, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { AGENT_TYPES, TASK_STATUS } from '../config/wagmi';
import { useStore } from '../stores/useStore';
import { useWebSocket } from '../hooks/useWebSocket';

export function ActivityPage() {
  const { address } = useAccount();
  const { paymentEvents } = useStore();
  const { connected } = useWebSocket();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center">
          <Activity className="w-6 h-6 text-neon-green" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-white/50">Real-time task and payment activity</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700/50 border border-white/5">
          <div className={`status-dot ${connected ? 'status-active' : 'status-error'}`} />
          <span className="text-sm text-white/60">
            {connected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            Live Events
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {paymentEvents.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Waiting for activity...</p>
                  <p className="text-sm mt-1">Events will appear here in real-time</p>
                </div>
              ) : (
                paymentEvents.map((event, index) => (
                  <EventRow key={`${event.timestamp}-${index}`} event={event} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Your Tasks */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Your Tasks</h3>

          {!address ? (
            <div className="text-center py-12 text-white/30">
              <p>Connect wallet to see your tasks</p>
            </div>
          ) : (
            <TaskList address={address} />
          )}
        </div>
      </div>

      {/* Payment Flow Visualization */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-6">Payment Flow</h3>
        <PaymentFlowDiagram />
      </div>
    </div>
  );
}

function EventRow({ event }) {
  const getEventInfo = () => {
    switch (event.type) {
      case 'initiated':
        return { icon: Clock, color: 'text-neon-yellow', text: `Payment initiated: ${event.amount} ETH` };
      case 'confirmed':
        return { icon: CheckCircle, color: 'text-neon-green', text: 'Payment confirmed on-chain' };
      case 'task_started':
        return { icon: Loader2, color: 'text-neon-blue', text: `Task #${event.taskId} processing` };
      case 'agent_working':
        return { icon: Loader2, color: 'text-neon-purple', text: `${event.agentName || 'Agent'} working...` };
      case 'completed':
        return { icon: CheckCircle, color: 'text-neon-green', text: `Task completed! ${event.earnings || ''} ETH earned` };
      case 'distributed':
        return { icon: Activity, color: 'text-neon-pink', text: 'Payments distributed to agents' };
      default:
        return { icon: Activity, color: 'text-white/50', text: event.type };
    }
  };

  const { icon: Icon, color, text } = getEventInfo();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/30 border border-white/5"
    >
      <Icon className={`w-5 h-5 ${color} ${event.type === 'agent_working' || event.type === 'task_started' ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{text}</p>
        <p className="text-xs text-white/30">
          {new Date(event.timestamp).toLocaleTimeString()}
        </p>
      </div>
      {event.txHash && (
        <a
          href={`https://sepolia.basescan.org/tx/${event.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neon-blue hover:text-neon-blue/80"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </motion.div>
  );
}

function TaskList({ address }) {
  // Mock tasks for demo
  const mockTasks = [
    { id: 1, description: 'Research DeFi protocols', status: 3, agentType: 0, budget: '0.01' },
    { id: 2, description: 'Analyze market trends', status: 2, agentType: 1, budget: '0.015' },
    { id: 3, description: 'Write blog post', status: 0, agentType: 2, budget: '0.02' },
  ];

  return (
    <div className="space-y-3">
      {mockTasks.map((task) => (
        <div key={task.id} className="p-4 rounded-lg bg-dark-700/30 border border-white/5">
          <div className="flex items-start justify-between mb-2">
            <span className="font-medium">Task #{task.id}</span>
            <TaskStatusBadge status={task.status} />
          </div>
          <p className="text-sm text-white/60 mb-2">{task.description}</p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span>{AGENT_TYPES[task.agentType]?.icon} {AGENT_TYPES[task.agentType]?.name}</span>
            <span>{task.budget} ETH</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskStatusBadge({ status }) {
  const statusInfo = TASK_STATUS[status] || { name: 'Unknown', color: 'gray' };
  const colorClasses = {
    blue: 'bg-neon-blue/20 text-neon-blue',
    yellow: 'bg-neon-yellow/20 text-neon-yellow',
    purple: 'bg-neon-purple/20 text-neon-purple',
    green: 'bg-neon-green/20 text-neon-green',
    red: 'bg-neon-pink/20 text-neon-pink',
    gray: 'bg-white/10 text-white/50',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colorClasses[statusInfo.color]}`}>
      {statusInfo.name}
    </span>
  );
}

function PaymentFlowDiagram() {
  const steps = [
    { label: 'User', sublabel: 'Creates task', icon: '👤' },
    { label: 'Contract', sublabel: 'Holds funds', icon: '📝' },
    { label: 'Orchestrator', sublabel: 'Assigns agents', icon: '🎯' },
    { label: 'Agents', sublabel: 'Execute task', icon: '🤖' },
    { label: 'Complete', sublabel: 'Auto-payment', icon: '✅' },
  ];

  return (
    <div className="flex items-center justify-between overflow-x-auto pb-4">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-white/10 flex items-center justify-center text-2xl mb-2">
              {step.icon}
            </div>
            <span className="text-sm font-medium">{step.label}</span>
            <span className="text-xs text-white/40">{step.sublabel}</span>
          </motion.div>
          {index < steps.length - 1 && (
            <div className="w-12 h-0.5 mx-2 bg-gradient-to-r from-neon-blue/50 to-neon-purple/50" />
          )}
        </div>
      ))}
    </div>
  );
}
