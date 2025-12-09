import { motion } from 'framer-motion';
import { Star, Zap, TrendingUp } from 'lucide-react';
import { AGENT_TYPES } from '../../config/wagmi';

export function AgentCard({ agent, onClick, selected }) {
  const typeInfo = AGENT_TYPES[agent.agentType] || AGENT_TYPES[0];
  const colorClass = `agent-${typeInfo.color}`;
  const bgClass = `agent-${typeInfo.color}-bg`;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`card-interactive relative overflow-hidden cursor-pointer ${
        selected ? 'border-neon-blue/50 shadow-lg shadow-neon-blue/10' : ''
      }`}
    >
      {/* Scan line effect */}
      {selected && <div className="scan-line" />}

      {/* Agent type badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium border ${bgClass} ${colorClass}`}>
        {typeInfo.icon} {typeInfo.name}
      </div>

      {/* Avatar */}
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${bgClass} border`}>
          {typeInfo.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{agent.name}</h3>
          <p className="text-sm text-white/50 truncate">{agent.description || 'No description'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/5">
        <div>
          <div className="flex items-center gap-1.5 text-neon-yellow">
            <Star className="w-4 h-4" />
            <span className="font-semibold">
              {agent.reputation?.averageRating?.toFixed(1) || '0.0'}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">Rating</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-neon-green">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">{agent.totalTasksCompleted || 0}</span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">Tasks</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-neon-blue">
            <Zap className="w-4 h-4" />
            <span className="font-semibold">{agent.pricePerTask} ETH</span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">Price</p>
        </div>
      </div>

      {/* Active indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className={`status-dot ${agent.isActive ? 'status-active' : 'status-error'}`} />
        <span className="text-xs text-white/40">
          {agent.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </motion.div>
  );
}
