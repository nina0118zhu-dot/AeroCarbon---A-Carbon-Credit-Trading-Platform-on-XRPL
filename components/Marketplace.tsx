import React from 'react';
import { CarbonProject, VerificationStandard, IssuerName, TabView } from '../types';
import { MapPin, Info, ArrowUpRight, Zap } from 'lucide-react';

interface MarketplaceProps {
  projects: CarbonProject[];
  onSelectProject: (project: CarbonProject) => void;
  onNavigate: (tab: TabView) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ projects, onSelectProject, onNavigate }) => {
  return (
    <div className="animate-fade-in space-y-8">
      
      {/* RWA Tokenization Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                  <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                      <h2 className="text-xl font-bold text-white">Institutional RWA Tokenization</h2>
                  </div>
                  <p className="text-gray-300 max-w-2xl text-sm leading-relaxed">
                      Bring your Real World Assets (Carbon Credits, Treasury Bills, Real Estate) on-chain with the XRP Ledger. 
                      Leverage native compliance hooks, AMM liquidity, and settlement finality.
                  </p>
                  <div className="mt-4 flex gap-3">
                      <a 
                          href="https://ripple.com/tokenization/" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-white flex items-center gap-1 font-bold transition-colors"
                      >
                          Learn about Ripple Tokenization <ArrowUpRight size={12} />
                      </a>
                  </div>
              </div>
              <button 
                  onClick={() => onNavigate('ISSUER_PORTAL')}
                  className="bg-white text-blue-900 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
              >
                  <Zap size={18} className="fill-current" /> Mint New Asset
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div 
            key={project.id} 
            className="group bg-xrpl-card border border-gray-800 rounded-xl overflow-hidden hover:border-xrpl-accent/50 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col"
          >
            {/* Clickable Image Area */}
            <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => onSelectProject(project)}>
              <img 
                src={project.imageUrl} 
                alt={project.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-xs text-white border border-gray-700">
                {project.standard}
              </div>
              <div className="absolute bottom-3 left-3 bg-xrpl-accent text-black font-bold px-2 py-0.5 rounded text-xs">
                {project.tokenTicker}
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => onSelectProject(project)}>
                <h3 className="text-lg font-bold text-white group-hover:text-xrpl-accent transition-colors line-clamp-1">{project.name}</h3>
              </div>
              
              <div className="flex items-center gap-2 text-xrpl-muted text-sm mb-4">
                <MapPin size={14} />
                {project.location}
              </div>

              <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                {project.description}
              </p>

              <div className="flex items-center gap-2 mb-4">
                <div className="px-2 py-1 bg-gray-800 rounded text-[10px] text-gray-300 uppercase tracking-wide border border-gray-700">
                  Issuer: {project.issuer}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Price per Ton</p>
                  <p className="text-xl font-mono text-white">${project.pricePerTon.toFixed(2)}</p>
                </div>
                
                <div className="flex gap-2">
                    {/* Deposit/Portfolio Shortcut */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('PORTFOLIO');
                        }}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold py-2 px-3 rounded flex items-center gap-1 transition-colors border border-gray-700"
                        title="View in Portfolio"
                    >
                        Deposit
                    </button>
                    
                    {/* View Details */}
                    <button 
                        onClick={() => onSelectProject(project)}
                        className="bg-xrpl-accent text-black hover:bg-green-400 text-xs font-bold py-2 px-4 rounded flex items-center gap-1 transition-colors"
                    >
                        Trade
                    </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};