import { motion } from 'framer-motion';
import { AGENT_TYPES } from '../../config/wagmi';

export function AgentTypeSelector({ selected, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(AGENT_TYPES).map(([id, type]) => {
        const isSelected = selected === parseInt(id);
        const colorClass = `agent-${type.color}`;

        return (
          <motion.button
            key={id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(parseInt(id))}
            className={`relative p-6 rounded-2xl text-left transition-all duration-300 ${
              isSelected
                ? `border-2 border-${type.color === 'searcher' ? 'agent-searcher' : type.color === 'analyst' ? 'agent-analyst' : 'agent-writer'} bg-dark-700/50`
                : 'border border-white/10 hover:border-white/20 bg-dark-800/30'
            }`}
          >
            {/* Glow effect when selected */}
            {isSelected && (
              <motion.div
                layoutId="agent-type-glow"
                className={`absolute inset-0 rounded-2xl ${colorClass} opacity-10 blur-xl`}
              />
            )}

            <div className="relative">
              {/* Icon */}
              <div className={`text-4xl mb-4 ${isSelected ? colorClass : ''}`}>
                {type.icon}
              </div>

              {/* Name */}
              <h3 className={`text-xl font-bold mb-2 ${isSelected ? colorClass : 'text-white'}`}>
                {type.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-white/50">
                {type.description}
              </p>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-0 right-0 w-6 h-6 rounded-full ${colorClass} bg-current flex items-center justify-center`}
                >
                  <svg className="w-4 h-4 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
