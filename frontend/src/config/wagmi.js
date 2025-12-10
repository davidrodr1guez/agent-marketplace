import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

// Local Hardhat chain
const localhost = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
};

export const config = getDefaultConfig({
  appName: 'AgentMarket',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [localhost, baseSepolia],
  ssr: false,
});

// Contract addresses
export const CONTRACTS = {
  AgentRegistry: import.meta.env.VITE_AGENT_REGISTRY_ADDRESS || '',
  TaskManager: import.meta.env.VITE_TASK_MANAGER_ADDRESS || '',
  ReputationSystem: import.meta.env.VITE_REPUTATION_SYSTEM_ADDRESS || '',
};

// API URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Agent types
export const AGENT_TYPES = {
  0: { name: 'Searcher', color: 'searcher', icon: '🔍', description: 'Busca información y datos' },
  1: { name: 'Analyst', color: 'analyst', icon: '📊', description: 'Analiza datos y tendencias' },
  2: { name: 'Writer', color: 'writer', icon: '✍️', description: 'Genera contenido' },
};

// Task statuses
export const TASK_STATUS = {
  0: { name: 'Created', color: 'blue' },
  1: { name: 'Assigned', color: 'yellow' },
  2: { name: 'In Progress', color: 'purple' },
  3: { name: 'Completed', color: 'green' },
  4: { name: 'Disputed', color: 'red' },
  5: { name: 'Cancelled', color: 'gray' },
};
