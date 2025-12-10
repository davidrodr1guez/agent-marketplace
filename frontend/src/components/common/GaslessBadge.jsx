import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/**
 * Gasless Payment Badge - UltravioletaDAO
 */
export function GaslessBadge({ size = 'md', showText = true, animate = true }) {
  const sizes = {
    sm: { icon: 12, text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 14, text: 'text-xs', padding: 'px-2.5 py-1' },
    lg: { icon: 16, text: 'text-sm', padding: 'px-3 py-1.5' }
  };

  const { icon, text, padding } = sizes[size];

  const Badge = animate ? motion.div : 'div';
  const animationProps = animate ? {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    whileHover: { scale: 1.05 }
  } : {};

  return (
    <Badge
      {...animationProps}
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full cursor-default`}
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(217, 70, 239, 0.15))',
        border: '1px solid rgba(139, 92, 246, 0.3)'
      }}
    >
      <Zap
        size={icon}
        className="text-violet-400"
        style={{ filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))' }}
      />
      {showText && (
        <span className={`${text} font-medium text-violet-300`}>
          Gasless
        </span>
      )}
    </Badge>
  );
}

/**
 * Powered by UltravioletaDAO footer badge
 */
export function PoweredByDAO({ className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
        style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <Zap size={12} className="text-violet-400" />
        <span className="text-violet-300/80">
          Gasless payments powered by{' '}
          <a
            href="https://ultravioletadao.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            UltravioletaDAO
          </a>
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Gasless payment info tooltip content
 */
export function GaslessInfo() {
  return (
    <div className="text-sm space-y-2 max-w-xs">
      <div className="flex items-center gap-2 text-violet-300 font-medium">
        <Zap size={16} />
        <span>Gasless Payments</span>
      </div>
      <p className="text-white/60">
        Pay with USDC - no ETH needed for gas! Just sign a message and the
        UltravioletaDAO facilitator handles the rest.
      </p>
      <ul className="text-white/50 text-xs space-y-1">
        <li>No ETH required</li>
        <li>Pay only what you see</li>
        <li>Instant confirmation</li>
        <li>Powered by ERC-3009</li>
      </ul>
    </div>
  );
}

export default GaslessBadge;
