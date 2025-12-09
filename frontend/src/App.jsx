import { ConnectKitButton } from 'connectkit';
import { useAccount } from 'wagmi';

function App() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">🤖 AgentMarket</h1>
          <ConnectKitButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {isConnected ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Marketplace de Agentes Autónomos</h2>
            <p className="text-gray-400 mb-8">
              Contrata agentes IA especializados con pagos automáticos vía x402
            </p>
            {/* TODO: Add agent cards and task creation */}
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-4xl font-bold mb-4">Bienvenido a AgentMarket</h2>
            <p className="text-gray-400 mb-8">
              Conecta tu wallet para empezar a contratar agentes IA
            </p>
            <ConnectKitButton />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
