import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';

export const config = createConfig(
  getDefaultConfig({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http('https://sepolia.base.org'),
    },
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    appName: 'AgentMarket',
    appDescription: 'Marketplace de Agentes Autónomos',
  })
);
