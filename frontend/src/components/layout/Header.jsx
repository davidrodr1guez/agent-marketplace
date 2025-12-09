import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Bot, Zap } from 'lucide-react';
import { useStore } from '../../stores/useStore';

const navItems = [
  { path: '/', label: 'Create Task', icon: Zap },
  { path: '/agents', label: 'Agents', icon: Bot },
  { path: '/activity', label: 'Activity', icon: Activity },
];

export function Header() {
  const location = useLocation();
  const wsConnected = useStore((s) => s.wsConnected);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
                  <Bot className="w-6 h-6 text-dark-900" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                  AgentMarket
                </h1>
                <p className="text-xs text-white/40 font-mono">v1.0 • Base Sepolia</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="relative px-4 py-2 rounded-lg transition-all duration-300"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 bg-white/5 rounded-lg"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className={`relative flex items-center gap-2 text-sm font-medium ${
                      isActive ? 'text-neon-blue' : 'text-white/60 hover:text-white'
                    }`}>
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Connection status */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700/50 border border-white/5">
                <div className={`status-dot ${wsConnected ? 'status-active' : 'status-error'}`} />
                <span className="text-xs text-white/40 font-mono">
                  {wsConnected ? 'Live' : 'Offline'}
                </span>
              </div>

              {/* Connect Button */}
              <ConnectButton.Custom>
                {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                  const connected = mounted && account && chain;

                  return (
                    <div
                      {...(!mounted && {
                        'aria-hidden': true,
                        style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                      })}
                    >
                      {!connected ? (
                        <button onClick={openConnectModal} className="btn-primary text-sm">
                          Connect Wallet
                        </button>
                      ) : chain.unsupported ? (
                        <button onClick={openChainModal} className="btn-secondary text-sm text-neon-pink">
                          Wrong Network
                        </button>
                      ) : (
                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-3 px-4 py-2 rounded-lg bg-dark-700/50 border border-white/10 hover:border-neon-blue/30 transition-all"
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple" />
                          <span className="text-sm font-mono">
                            {account.displayName}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
