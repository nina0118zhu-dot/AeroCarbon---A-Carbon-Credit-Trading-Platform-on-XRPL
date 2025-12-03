import React, { useState, useEffect } from 'react';
import { 
  CarbonProject, 
  TabView, 
  WalletInfo 
} from './types';
import { Marketplace } from './components/Marketplace';
import { TradingInterface } from './components/TradingInterface';
import { GeminiAssistant } from './components/GeminiAssistant';
import { WalletPortfolio } from './components/WalletPortfolio';
import { IssuerPortal } from './components/IssuerPortal';
import { ComplianceDashboard } from './components/ComplianceDashboard';
import { WalletConnectModal } from './components/WalletConnectModal';
import { IoTScanner } from './components/IoTScanner';
import { xrplApi } from './services/xrplApi';
import { 
  Leaf, 
  Wallet, 
  LayoutGrid, 
  PlusCircle, 
  ShieldCheck,
  Loader2,
  FileCheck,
  ScanLine
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>('MARKETPLACE');
  const [selectedProject, setSelectedProject] = useState<CarbonProject | null>(null);
  const [showGemini, setShowGemini] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Data State
  const [projects, setProjects] = useState<CarbonProject[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // Wallet State
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await xrplApi.getProjects();
        setProjects(data);
      } catch (e) {
        console.error("Failed to load projects", e);
      } finally {
        setIsProjectsLoading(false);
      }
    };
    loadData();
  }, []);

  // Ensure refreshed data on Marketplace revisit
  useEffect(() => {
    if (activeTab === 'MARKETPLACE') {
         xrplApi.getProjects().then(setProjects);
    }
  }, [activeTab]);

  const handleConnectClick = async () => {
    if (wallet) {
      // Disconnect
      await xrplApi.disconnect(); // Clean up real connection if exists
      setWallet(null);
      return;
    }
    // Show the modal to input seed or generate
    setShowConnectModal(true);
  };

  const handleWalletConnected = async () => {
    setShowConnectModal(false);
    setIsWalletConnecting(true);
    try {
      // Wallet connection logic happens in modal, we just fetch info here
      const walletData = await xrplApi.getWalletInfo();
      setWallet(walletData);
    } catch (e) {
      alert("Failed to fetch wallet info");
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const refreshWallet = async () => {
      if (wallet) {
          const updated = await xrplApi.getWalletInfo();
          setWallet(updated);
      }
  };

  const renderContent = () => {
    if (activeTab === 'MARKETPLACE') {
      if (selectedProject) {
        return (
          <TradingInterface 
            project={selectedProject}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
          />
        );
      }
      if (isProjectsLoading) {
          return (
              <div className="flex h-full items-center justify-center">
                  <Loader2 className="animate-spin text-xrpl-accent w-8 h-8" />
              </div>
          );
      }
      return (
        <Marketplace 
          projects={projects}
          onSelectProject={(p) => setSelectedProject(p)}
          onNavigate={(tab) => {
              setActiveTab(tab);
              setSelectedProject(null);
          }}
        />
      );
    }

    if (activeTab === 'PORTFOLIO') {
      if (!wallet) {
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500 animate-fade-in">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h2>
            <p className="text-gray-400 mb-6">Connect your XRPL wallet to view assets, trustlines, and retire credits.</p>
            <button 
              onClick={handleConnectClick}
              className="bg-xrpl-accent text-black font-bold px-6 py-3 rounded-lg hover:bg-green-400 transition-all"
            >
              Connect Wallet
            </button>
          </div>
        );
      }
      return <WalletPortfolio wallet={wallet} onRefreshWallet={refreshWallet} />;
    }

    if (activeTab === 'ISSUER_PORTAL') {
      return <IssuerPortal />;
    }

    if (activeTab === 'COMPLIANCE') {
      return <ComplianceDashboard />;
    }
    
    return null;
  };

  return (
    <div className="min-h-screen flex text-gray-200 font-sans selection:bg-xrpl-accent selection:text-black">
      
      {showConnectModal && (
        <WalletConnectModal 
          onClose={() => setShowConnectModal(false)}
          onSuccess={handleWalletConnected}
        />
      )}

      {showScanner && (
        <IoTScanner onClose={() => setShowScanner(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-[#0d0f12] border-r border-gray-800 flex flex-col fixed h-full z-10 transition-all duration-300">
        <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
          <div className="w-8 h-8 bg-xrpl-accent rounded-br-xl rounded-tl-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,252,155,0.4)]">
            <Leaf className="text-black w-5 h-5" />
          </div>
          <span className="hidden lg:block font-bold text-lg text-white tracking-tight">CarbonConnect</span>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-2">
          <button 
            onClick={() => { setActiveTab('MARKETPLACE'); setSelectedProject(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'MARKETPLACE' ? 'bg-xrpl-accent/10 text-xrpl-accent border border-xrpl-accent/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <LayoutGrid size={20} />
            <span className="hidden lg:block text-sm font-medium">Marketplace</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('PORTFOLIO')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'PORTFOLIO' ? 'bg-xrpl-accent/10 text-xrpl-accent border border-xrpl-accent/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <Wallet size={20} />
            <span className="hidden lg:block text-sm font-medium">My Portfolio</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] text-gray-500 uppercase font-bold tracking-wider hidden lg:block">
            Management
          </div>

          <button 
            onClick={() => setActiveTab('ISSUER_PORTAL')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'ISSUER_PORTAL' ? 'bg-xrpl-accent/10 text-xrpl-accent border border-xrpl-accent/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <PlusCircle size={20} />
            <span className="hidden lg:block text-sm font-medium">Issuer Portal</span>
          </button>

          <button 
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'COMPLIANCE' ? 'bg-xrpl-accent/10 text-xrpl-accent border border-xrpl-accent/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <FileCheck size={20} />
            <span className="hidden lg:block text-sm font-medium">Regulatory Audit</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="hidden lg:block bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
                 <p className="text-xs text-gray-400">XRPL Status</p>
                 <span className="text-[10px] bg-green-900/30 text-green-500 border border-green-900 px-1 rounded">Testnet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-mono text-white">Block #82,104,220</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col ml-20 lg:ml-64 transition-all duration-300 ${showGemini ? 'mr-80' : ''}`}>
        
        {/* Top Navbar */}
        <header className="h-16 bg-[#0f1114]/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedProject && (
              <button 
                onClick={() => setSelectedProject(null)} 
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                <span className="text-xl">←</span> Back to Market
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* IoT Scanner Button */}
            <button 
              onClick={() => setShowScanner(true)}
              className="p-2 rounded-full bg-gray-800 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-colors border border-transparent hover:border-blue-500/30"
              title="Open IoT Validator"
            >
              <ScanLine size={18} />
            </button>

            <button 
              onClick={() => setShowGemini(!showGemini)}
              className={`p-2 rounded-full transition-colors ${showGemini ? 'bg-xrpl-accent text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              title="Toggle AI Audit Assistant"
            >
              <ShieldCheck size={18} />
            </button>

            <div className="h-6 w-[1px] bg-gray-700"></div>

            <button 
              onClick={handleConnectClick}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${
                wallet 
                  ? 'bg-xrpl-accent/10 text-xrpl-accent border-xrpl-accent/50' 
                  : 'bg-white text-black border-white hover:bg-gray-200'
              }`}
            >
              {isWalletConnecting && <Loader2 className="w-3 h-3 animate-spin" />}
              {wallet ? `${wallet.address.substring(0,4)}...${wallet.address.substring(wallet.address.length-3)}` : 'Connect Wallet'}
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-8 flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>

      {/* Gemini Sidebar */}
      {showGemini && (
        <GeminiAssistant activeProject={selectedProject || undefined} />
      )}
      
    </div>
  );
}