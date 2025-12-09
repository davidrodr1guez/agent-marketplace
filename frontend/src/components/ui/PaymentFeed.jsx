import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle, Loader2, Coins, Bot } from 'lucide-react';
import { useStore } from '../../stores/useStore';

const eventIcons = {
  initiated: Coins,
  confirmed: CheckCircle,
  task_started: Bot,
  agent_working: Loader2,
  completed: CheckCircle,
  distributed: ArrowRight,
};

const eventColors = {
  initiated: 'text-neon-yellow',
  confirmed: 'text-neon-green',
  task_started: 'text-neon-blue',
  agent_working: 'text-neon-purple',
  completed: 'text-neon-green',
  distributed: 'text-neon-pink',
};

export function PaymentFeed() {
  const paymentEvents = useStore((s) => s.paymentEvents);
  const wsConnected = useStore((s) => s.wsConnected);

  if (paymentEvents.length === 0 && !wsConnected) return null;

  return (
    <div className="fixed right-6 top-24 bottom-6 w-80 pointer-events-none hidden xl:block">
      <div className="h-full glass rounded-2xl p-4 pointer-events-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className={`status-dot ${wsConnected ? 'status-active' : 'status-error'}`} />
            <span className="text-sm font-medium">Live Feed</span>
          </div>
          <span className="text-xs text-white/40 font-mono">
            {paymentEvents.length} events
          </span>
        </div>

        {/* Events */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <AnimatePresence mode="popLayout">
            {paymentEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/30 text-sm"
              >
                Waiting for activity...
              </motion.div>
            ) : (
              paymentEvents.map((event, index) => (
                <EventCard key={`${event.timestamp}-${index}`} event={event} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }) {
  const Icon = eventIcons[event.type] || Coins;
  const colorClass = eventColors[event.type] || 'text-white';

  const getEventText = () => {
    switch (event.type) {
      case 'initiated':
        return `Payment initiated: ${event.amount} ETH`;
      case 'confirmed':
        return `Payment confirmed`;
      case 'task_started':
        return `Task #${event.taskId} started`;
      case 'agent_working':
        return `${event.agentName} working... ${event.progress || ''}`;
      case 'completed':
        return `Task completed! Earned ${event.earnings} ETH`;
      case 'distributed':
        return `Payments distributed to ${event.agents?.length || 0} agents`;
      default:
        return event.type;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="p-3 rounded-lg bg-dark-700/50 border border-white/5"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${colorClass}`}>
          <Icon className={`w-4 h-4 ${event.type === 'agent_working' ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 truncate">{getEventText()}</p>
          <div className="flex items-center gap-2 mt-1">
            {event.taskId && (
              <span className="text-xs font-mono text-white/40">
                Task #{event.taskId}
              </span>
            )}
            <span className="text-xs text-white/20">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {event.txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${event.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neon-blue hover:underline mt-1 inline-block"
            >
              View tx →
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
