
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TokenizationRequest, WalletInfo } from '../types';
import { Wallet, CreditCard, Activity, Copy, ArrowUpRight, ArrowDownLeft, ShieldCheck, Flame, Leaf, TrendingUp, ExternalLink, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { RetirementModal } from './RetirementModal';
import { TokenizeModal } from './TokenizeModal';
import { xrplApi } from '../services/xrplApi';

interface WalletPortfolioProps {
  wallet: WalletInfo;
  onRefreshWallet?: () => void;
}

export const WalletPortfolio: React.FC<WalletPortfolioProps> = ({ wallet, onRefreshWallet }) => {
  const [retireAsset, setRetireAsset] = useState<{ticker: string, amount: number} | null>(null);
  const [showTokenizeModal, setShowTokenizeModal] = useState(false);
  const [tokenRequests, setTokenRequests] = useState<TokenizationRequest[]>([]);
  
  // Calculate stats
  const totalValue = (wallet.xrpBalance * 0.60 + wallet.assets.reduce((acc, curr) => acc + (curr.amount * curr.currentValue), 0));
  const totalCredits = wallet.assets.reduce((acc, curr) => acc + curr.amount, 0);
  const retiredTotal = 1540; // Mock historical total for demo purposes

  useEffect(() => {
      loadRequests();
      const interval = setInterval(loadRequests, 5000);
      return () => clearInterval(interval);
  }, [wallet.address]);

  const loadRequests = async () => {
      const reqs = await xrplApi.getTokenizationRequests(wallet.address);
      setTokenRequests(reqs);
  };

  return (
    <>
      {retireAsset && createPortal(
        <RetirementModal 
            ticker={retireAsset.ticker} 
            maxAmount={retireAsset.amount} 
            onClose={() => setRetireAsset(null)}
            onSuccess={() => {
                // Refresh data but keep modal open to show success state
                if (onRefreshWallet) onRefreshWallet();
            }}
        />,
        document.body
      )}

      {showTokenizeModal && createPortal(
          <TokenizeModal 
             address={wallet.address}
             onClose={() => setShowTokenizeModal(false)}
             onSuccess={() => {
                 setShowTokenizeModal(false);
                 loadRequests();
             }}
          />,
          document.body
      )}
      
      <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
        {/* Enterprise Dashboard Header */}
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-bold text-white">Enterprise Carbon Dashboard</h2>
                <p className="text-gray-400 mt-1">Manage assets, track offsetting impact, and audit ledger history.</p>
            </div>
            <button 
                onClick={() => setShowTokenizeModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
            >
                <Zap size={18} /> Tokenize Real World Asset
            </button>
        </div>

        {/* Institutional Tokenization Banner (If no requests) */}
        {tokenRequests.length === 0 && (
            <div className="bg-gradient-to-r from-gray-900 to-blue-900/20 border border-blue-900/30 rounded-xl p-4 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="p-3 bg-blue-500/10 rounded-full">
                         <ShieldCheck className="text-blue-400" />
                     </div>
                     <div>
                         <h4 className="text-white font-bold">Ripple Institutional Tokenization</h4>
                         <p className="text-sm text-gray-400">Bring Treasury Bills, Carbon Credits, and Real Estate on-chain via our partner issuers.</p>
                     </div>
                 </div>
                 <a href="https://ripple.com/tokenization/" target="_blank" rel="noreferrer" className="text-blue-400 text-sm font-bold flex items-center gap-1 hover:text-white transition-colors">
                     Read Whitepaper <ExternalLink size={14} />
                 </a>
            </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-xrpl-card border border-gray-800 rounded-2xl p-6">
                <p className="text-sm text-gray-500 font-medium mb-1">Total Carbon Retired</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-white">{retiredTotal.toLocaleString()}</h3>
                    <span className="text-sm text-gray-500">tCO2e</span>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-400 bg-green-900/20 w-fit px-3 py-1 rounded-full border border-green-900/50">
                    <Leaf size={14} className="mr-1" />
                    <span>Offsetting Active</span>
                </div>
            </div>

            <div className="bg-xrpl-card border border-gray-800 rounded-2xl p-6">
                <p className="text-sm text-gray-500 font-medium mb-1">Available Credits</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-white">{totalCredits.toLocaleString()}</h3>
                    <span className="text-sm text-gray-500">Tokens</span>
                </div>
                 <div className="mt-4 flex items-center text-sm text-blue-400 bg-blue-900/20 w-fit px-3 py-1 rounded-full border border-blue-900/50">
                    <Activity size={14} className="mr-1" />
                    <span>Tradeable Assets</span>
                </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-xrpl-accent/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <p className="text-sm text-gray-500 font-medium mb-1">Portfolio Value</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-white font-mono">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                    <span className="text-sm text-gray-500">USD</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-mono text-gray-400">{wallet.address.substring(0,6)}...{wallet.address.substring(wallet.address.length-4)}</span>
                </div>
            </div>
        </div>

        {/* Tokenization Application History */}
        <div className="bg-xrpl-card border border-gray-800 rounded-2xl overflow-hidden shadow-lg animate-fade-in">
                <div className="p-4 border-b border-gray-800 bg-blue-900/10 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-blue-400" /> Tokenization Application History
                </h3>
                <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-800">
                    {tokenRequests.length} Records
                </span>
            </div>
            <div className="divide-y divide-gray-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                {tokenRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
                        <Clock className="w-8 h-8 opacity-20" />
                        <p>No tokenization requests found.</p>
                        <p className="text-xs">Start by clicking "Tokenize Real World Asset" above.</p>
                    </div>
                ) : (
                    tokenRequests.map(req => (
                        <div key={req.id} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${req.status === 'APPROVED' ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                                        {req.status === 'APPROVED' ? <CheckCircle2 size={18} className="text-green-500" /> : <Clock size={18} className="text-yellow-500" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{req.projectName} ({req.tokenTicker})</div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span>Issuer: {req.issuerName}</span>
                                            <span>•</span>
                                            <span>{req.amount} Tons</span>
                                            <span>•</span>
                                            <span>Vintage: {req.vintage}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${
                                        req.status === 'APPROVED' ? 'bg-green-900/20 text-green-400 border-green-900' : 'bg-yellow-900/20 text-yellow-400 border-yellow-900'
                                    }`}>
                                        {req.status}
                                    </div>
                                </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assets List */}
          <div className="lg:col-span-2 bg-xrpl-card border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-xrpl-accent" />
                Issued Assets (Carbon Credits)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900/30 text-gray-500">
                  <tr>
                    <th className="p-4 font-medium">Asset</th>
                    <th className="p-4 font-medium text-right">Balance</th>
                    <th className="p-4 font-medium text-right">Value (USD)</th>
                    <th className="p-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {wallet.assets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-500">
                          No assets found. Visit the Marketplace to acquire credits.
                      </td>
                    </tr>
                  ) : (
                    wallet.assets.map(asset => (
                      <tr key={asset.ticker} className="hover:bg-gray-800/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                                  {asset.ticker.substring(0,2)}
                              </div>
                              <div>
                                  <div className="font-bold text-white">{asset.ticker}</div>
                                  <div className="text-xs text-gray-500">Carbon Credit</div>
                              </div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-white text-base">{asset.amount.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-gray-400">${(asset.amount * asset.currentValue).toLocaleString()}</td>
                        <td className="p-4 text-center">
                           <button 
                              onClick={() => setRetireAsset({ticker: asset.ticker, amount: asset.amount})}
                              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all"
                           >
                              <Flame size={14} /> Retire
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-xrpl-card border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-gray-800 bg-gray-900/50">
               <h3 className="font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-xrpl-accent" />
                Ledger History
              </h3>
            </div>
            <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto custom-scrollbar">
               {wallet.transactions.map(tx => (
                   <div key={tx.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                       <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-full ${
                                  tx.type === 'BUY' || tx.type === 'RECEIVE' ? 'bg-green-500/20 text-green-500' :
                                  tx.type === 'RETIRE' ? 'bg-orange-500/20 text-orange-500' : 
                                  'bg-blue-500/20 text-blue-500'
                              }`}>
                                  {tx.type === 'BUY' || tx.type === 'RECEIVE' ? <ArrowDownLeft size={14} /> : 
                                   tx.type === 'RETIRE' ? <Flame size={14} /> : <ArrowUpRight size={14} />}
                              </div>
                              <span className="text-sm font-medium text-white">
                                  {tx.type === 'TRUSTLINE_SET' ? 'Set Trustline' : tx.type}
                              </span>
                           </div>
                           <span className="text-xs text-gray-500">{tx.timestamp.toLocaleDateString()}</span>
                       </div>
                       <div className="flex justify-between items-end pl-8">
                           <a 
                               href={`https://testnet.xrpscan.com/tx/${tx.hash}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-xs text-blue-400/80 hover:text-blue-300 font-mono flex items-center gap-1 transition-colors"
                           >
                               Hash: {tx.hash.substring(0,8)}... <ExternalLink size={10} />
                           </a>
                           {tx.amount && (
                               <div className="text-sm font-bold text-gray-300">
                                   {tx.amount} {tx.ticker}
                               </div>
                           )}
                       </div>
                   </div>
               ))}
               {wallet.transactions.length === 0 && (
                   <div className="p-8 text-center text-gray-500 text-sm">No recent transactions</div>
               )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
