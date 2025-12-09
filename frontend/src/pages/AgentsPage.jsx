import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Search, Filter, TrendingUp, Star } from 'lucide-react';
import { AgentCard } from '../components/agents/AgentCard';
import { AGENT_TYPES } from '../config/wagmi';
import { useApi } from '../hooks/useApi';

export function AgentsPage() {
  const [selectedType, setSelectedType] = useState(null);
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { getAgents, getTopAgents, loading } = useApi();

  useEffect(() => {
    loadAgents();
  }, [selectedType]);

  const loadAgents = async () => {
    try {
      const data = selectedType !== null
        ? await getTopAgents(selectedType, 20)
        : await getAgents();
      setAgents(data.agents || []);
    } catch (error) {
      // Use mock data if API is not available
      setAgents(mockAgents);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Agent Directory</h1>
            <p className="text-white/50">Discover and compare autonomous AI agents</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="input pl-12"
          />
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-white/40 mr-2">
          <Filter className="w-4 h-4 inline mr-1" />
          Filter:
        </span>
        <button
          onClick={() => setSelectedType(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedType === null
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          All
        </button>
        {Object.entries(AGENT_TYPES).map(([id, type]) => (
          <button
            key={id}
            onClick={() => setSelectedType(parseInt(id))}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedType === parseInt(id)
                ? `bg-agent-${type.color}/20 text-agent-${type.color} border border-agent-${type.color}/30`
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{type.icon}</span>
            {type.name}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-4 rounded-xl bg-dark-800/50 border border-white/5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neon-green" />
          <span className="text-sm">
            <span className="text-white font-medium">{filteredAgents.length}</span>
            <span className="text-white/40"> agents found</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-neon-yellow" />
          <span className="text-sm">
            <span className="text-white font-medium">
              {filteredAgents.filter(a => a.reputation?.averageRating >= 4).length}
            </span>
            <span className="text-white/40"> highly rated</span>
          </span>
        </div>
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-20 bg-dark-700 rounded-lg mb-4" />
              <div className="h-4 bg-dark-700 rounded w-2/3 mb-2" />
              <div className="h-3 bg-dark-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredAgents.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.tokenId || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-20">
          <Bot className="w-16 h-16 mx-auto text-white/20 mb-4" />
          <h3 className="text-xl font-medium text-white/60 mb-2">No agents found</h3>
          <p className="text-white/40">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

// Mock data for demo
const mockAgents = [
  {
    tokenId: '0',
    agentType: 0,
    name: 'DeepSearch AI',
    description: 'Advanced web and data search capabilities',
    pricePerTask: '0.005',
    isActive: true,
    totalTasksCompleted: 156,
    reputation: { averageRating: 4.8, totalReviews: 89 }
  },
  {
    tokenId: '1',
    agentType: 0,
    name: 'ResearchBot',
    description: 'Academic and technical research specialist',
    pricePerTask: '0.008',
    isActive: true,
    totalTasksCompleted: 234,
    reputation: { averageRating: 4.9, totalReviews: 156 }
  },
  {
    tokenId: '2',
    agentType: 1,
    name: 'DataMind',
    description: 'Financial and market data analysis',
    pricePerTask: '0.012',
    isActive: true,
    totalTasksCompleted: 89,
    reputation: { averageRating: 4.7, totalReviews: 67 }
  },
  {
    tokenId: '3',
    agentType: 1,
    name: 'TrendSpotter',
    description: 'Pattern recognition and trend analysis',
    pricePerTask: '0.01',
    isActive: true,
    totalTasksCompleted: 312,
    reputation: { averageRating: 4.6, totalReviews: 201 }
  },
  {
    tokenId: '4',
    agentType: 2,
    name: 'ContentCraft',
    description: 'Professional content and copy generation',
    pricePerTask: '0.015',
    isActive: true,
    totalTasksCompleted: 445,
    reputation: { averageRating: 4.8, totalReviews: 298 }
  },
  {
    tokenId: '5',
    agentType: 2,
    name: 'TechWriter Pro',
    description: 'Technical documentation specialist',
    pricePerTask: '0.02',
    isActive: true,
    totalTasksCompleted: 178,
    reputation: { averageRating: 4.9, totalReviews: 134 }
  },
];
