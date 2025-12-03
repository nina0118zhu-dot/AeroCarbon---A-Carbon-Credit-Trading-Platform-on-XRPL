import React, { useState, useEffect } from 'react';
import { CarbonProject, Order, TradeMode, WalletInfo } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Lock, TrendingUp, Layers, Zap, XCircle, FileSignature, ShieldCheck, ArrowRight, Info, ExternalLink, X, Check } from 'lucide-react';
import { OrderBook } from './OrderBook';
import { xrplApi } from '../services/xrplApi';

interface TradingInterfaceProps {
  project: CarbonProject;
  wallet: WalletInfo | null;
  onRefreshWallet: () => void;
}

const generateMockChartData = (basePrice: number) => {
  const data = [];
  let price = basePrice;
  for (let i = 0; i < 40; i++) {
    price = price * (1 + (Math.random() * 0.1 - 0.04));
    data.push({
      name: `Day ${i + 1}`,
      price: Math.max(0.5, price)
    });
  }
  return data;
};

export const TradingInterface: React.FC<TradingInterfaceProps> = ({
  project,
  wallet,
  onRefreshWallet
}) => {
  const [mode, setMode] = useState<TradeMode>('AMM_SWAP');
  const [amount, setAmount] = useState<string>('1');
  const [chartData] = useState(() => generateMockChartData(project.pricePerTon));
  const [orderBook, setOrderBook] = useState<{ bids: Order[], asks: Order[] }>({ bids: [], asks: [] });
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitPrice, setLimitPrice] = useState<string>(project.pricePerTon.toString());
  
  // Success Message State
  const [successMsg, setSuccessMsg] = useState<{title: string, hash?: string, link?: string} | null>(null);

  const hasTrustline = wallet?.trustlines.includes(project.tokenTicker);
  const walletConnected = !!wallet;

  useEffect(() => {
    const fetchOB = async () => {
      const data = await xrplApi.getOrderBook(project.tokenTicker);
      setOrderBook(data);
    };

    fetchOB();
    const interval = window.setInterval(fetchOB, 3000); 

    return () => window.clearInterval(interval);
  }, [project.tokenTicker]);

  useEffect(() => {
    if (mode === 'AMM_SWAP') {
      setLimitPrice(project.pricePerTon.toString());
    }
  }, [mode, project.pricePerTon]);

  const handleEstablishTrustline = async () => {
    if (!walletConnected) return;
    setIsSubmitting(true);
    try {
      const success = await xrplApi.setTrustline(project.tokenTicker);
      if (success) {
        onRefreshWallet();
        // Assume last transaction is the one
        // In real app, API returns the hash
        setSuccessMsg({
             title: "Trustline Established",
             hash: "TRST-" + Math.random().toString(36).substring(7).toUpperCase(),
             link: "https://testnet.xrpscan.com/tx/"
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrade = async () => {
    if (!walletConnected || !hasTrustline) return;
    setIsSubmitting(true);
    
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(limitPrice);
    
    if (isNaN(numAmount) || numAmount <= 0) {
        alert("Invalid Amount");
        setIsSubmitting(false);
        return;
    }

    try {
        const result = await xrplApi.executeTrade(
            project.tokenTicker, 
            activeTab, 
            numAmount, 
            numPrice,
            mode === 'AMM_SWAP' ? 'market' : 'limit'
        );
        onRefreshWallet();
        
        // Check if result is OpenOrder (Pre-Auth) or Transaction (AMM)
        if ('remaining' in result) {
            // It's an OpenOrder
            setSuccessMsg({
                title: "Pre-Auth Order Signed",
                hash: result.id
            });
        } else {
            // It's a Transaction
            setSuccessMsg({
                title: "AMM Trade Executed",
                hash: result.hash,
                link: `https://testnet.xrpscan.com/tx/${result.hash}`
            });
            setAmount('0');
        }

    } catch (error) {
        alert("Trade Failed: " + error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
        await xrplApi.cancelOrder(orderId);
        onRefreshWallet();
    } catch(e) {
        console.error(e);
    }
  };

  const estimatedCost = parseFloat(amount || '0') * parseFloat(limitPrice || '0');
  
  const myOpenOrders = wallet?.openOrders.filter(o => o.ticker === project.tokenTicker) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in h-[calc(100vh-140px)] relative">
      
      {/* Success Notification Banner */}
      {successMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-green-500/50 rounded-lg shadow-2xl p-4 flex items-center gap-4 animate-fade-in max-w-md w-full">
            <div className="bg-green-500/20 p-2 rounded-full">
                <Check className="text-green-400 w-6 h-6" />
            </div>
            <div className="flex-1">
                <h4 className="text-white font-bold">{successMsg.title}</h4>
                {successMsg.link ? (
                    <a 
                        href={successMsg.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 font-mono"
                    >
                        Hash: {successMsg.hash?.substring(0,16)}... <ExternalLink size={10} />
                    </a>
                ) : (
                    <p className="text-xs text-gray-500 mt-1 font-mono">ID: {successMsg.hash}</p>
                )}
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-gray-500 hover:text-white">
                <X size={18} />
            </button>
        </div>
      )}
      
      {/* Left Column */}
      <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-xrpl-card rounded-xl p-6 border border-gray-800 flex justify-between items-center shrink-0 shadow-lg">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{project.name}</h2>
                <span className="px-2 py-1 bg-gray-800 text-xs rounded text-gray-300 border border-gray-700 font-mono">
                  {project.tokenTicker}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xrpl-muted text-sm">
                <span>{project.location}</span>
                <span>•</span>
                <span className="text-xrpl-accent">{project.standard}</span>
                <span>•</span>
                <span>Issuer: {project.issuer}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white font-mono">${project.pricePerTon.toFixed(2)}</div>
              <div className="text-sm text-green-500 flex items-center justify-end gap-1">
                <TrendingUp size={14} /> +2.4% (24h)
              </div>
            </div>
        </div>

        {/* TRUSTLINE BLOCKER - If connected but no trustline */}
        {walletConnected && !hasTrustline && (
            <div className="flex-1 bg-xrpl-card border border-gray-800 rounded-xl flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="text-blue-500 w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Marketplace Locked</h3>
                <p className="text-gray-400 max-w-lg mb-8">
                    To prevent spam, the XRP Ledger requires you to explicitly trust an issuer before holding their tokens. 
                    This creates a "TrustLine" and reserves a small amount of XRP.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-left flex gap-3">
                         <div className="bg-blue-500/10 p-2 rounded h-fit"><Lock size={18} className="text-blue-400" /></div>
                         <div>
                             <h4 className="font-bold text-white text-sm">Security</h4>
                             <p className="text-xs text-gray-400 mt-1">Prevents unauthorized assets from entering your wallet.</p>
                         </div>
                    </div>
                     <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-left flex gap-3">
                         <div className="bg-purple-500/10 p-2 rounded h-fit"><Info size={18} className="text-purple-400" /></div>
                         <div>
                             <h4 className="font-bold text-white text-sm">Ledger Reserve</h4>
                             <p className="text-xs text-gray-400 mt-1">Creating a trustline reserves ~0.2 XRP.</p>
                         </div>
                    </div>
                </div>

                <button 
                    onClick={handleEstablishTrustline}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                >
                    {isSubmitting ? 'Signing Transaction...' : (
                        <>Establish Trustline <ArrowRight size={18} /></>
                    )}
                </button>
            </div>
        )}

        {/* Standard View (If trustline exists or wallet not connected) */}
        {(!walletConnected || hasTrustline) && (
            <>
                <div className="flex-1 bg-xrpl-card rounded-xl p-4 border border-gray-800 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00FC9B" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00FC9B" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis domain={['auto', 'auto']} orientation="right" tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `$${val.toFixed(2)}`} />
                        <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1d21', borderColor: '#334155', color: '#fff' }}
                        itemStyle={{ color: '#00FC9B' }}
                        />
                        <Area type="monotone" dataKey="price" stroke="#00FC9B" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="h-64 flex gap-6">
                    <div className="flex-1">
                        <OrderBook 
                            bids={orderBook.bids} 
                            asks={orderBook.asks} 
                            ticker={project.tokenTicker} 
                            onRowClick={(price) => {
                                setLimitPrice(price.toString());
                                if (mode === 'AMM_SWAP') setMode('CLOB_EXCHANGE');
                            }}
                        />
                    </div>
                    <div className="flex-1 bg-xrpl-card border border-gray-800 rounded-lg overflow-hidden flex flex-col">
                        <div className="px-3 py-2 border-b border-gray-800 bg-gray-900/50">
                            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Pre-Auth Open Orders</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {myOpenOrders.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                                    No active pre-authorizations
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="text-gray-500 bg-gray-900/30">
                                        <tr>
                                            <th className="px-3 py-2">Side</th>
                                            <th className="px-3 py-2 text-right">Price</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                            <th className="px-3 py-2 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {myOpenOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-800/30">
                                                <td className={`px-3 py-2 font-bold ${order.type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                                                    {order.type}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono text-white">{order.price.toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-gray-400">{order.remaining}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button 
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </>
        )}
      </div>

      {/* Right Column: Trading Form */}
      <div className="bg-xrpl-card rounded-xl border border-gray-800 flex flex-col h-fit sticky top-0 shadow-lg z-10">
        <div className="flex border-b border-gray-800">
            <button 
                onClick={() => setMode('AMM_SWAP')}
                disabled={!hasTrustline}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'AMM_SWAP' ? 'text-xrpl-accent border-b-2 border-xrpl-accent bg-xrpl-accent/5' : 'text-gray-400 hover:text-white disabled:opacity-50'}`}
            >
                <Zap size={14} /> Swap (AMM)
            </button>
            <button 
                onClick={() => setMode('CLOB_EXCHANGE')}
                disabled={!hasTrustline}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'CLOB_EXCHANGE' ? 'text-xrpl-accent border-b-2 border-xrpl-accent bg-xrpl-accent/5' : 'text-gray-400 hover:text-white disabled:opacity-50'}`}
            >
                <Layers size={14} /> Limit (CEX)
            </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
            <button 
                onClick={() => setActiveTab('BUY')}
                className={`py-2 rounded text-sm font-bold transition-all ${activeTab === 'BUY' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
                Buy
            </button>
            <button 
                onClick={() => setActiveTab('SELL')}
                className={`py-2 rounded text-sm font-bold transition-all ${activeTab === 'SELL' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
                Sell
            </button>
        </div>
        
        <div className="p-6 space-y-6 pt-0">
          {!walletConnected ? (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4 text-sm">Connect your XRPL Wallet to trade</p>
            </div>
          ) : !hasTrustline ? (
            <div className="text-center py-12 px-4 bg-gray-900/30 rounded border border-gray-800 border-dashed">
                <ShieldCheck className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                    Trading Locked. <br/> Please establish trustline on the dashboard.
                </p>
            </div>
          ) : (
            <>
              {mode === 'CLOB_EXCHANGE' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Limit Price (USD)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:border-xrpl-accent focus:outline-none"
                      />
                    </div>
                  </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                    {activeTab === 'BUY' ? 'You Pay (Est.)' : 'You Sell'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:border-xrpl-accent focus:outline-none"
                  />
                  <span className="absolute right-4 top-3 text-gray-500 text-sm">
                      {activeTab === 'BUY' ? project.tokenTicker : project.tokenTicker}
                  </span>
                </div>
              </div>

              {/* Pre-Auth Notice */}
              {mode === 'CLOB_EXCHANGE' && (
                  <div className="bg-blue-900/20 border border-blue-800 p-3 rounded flex gap-2">
                      <FileSignature className="text-blue-400 shrink-0" size={16} />
                      <div className="text-[10px] text-blue-200">
                          <strong>Pre-Authorization Mode:</strong> You are signing a delegated authorization, not an immediate transaction. The Settlement Engine will execute this trade when matched.
                      </div>
                  </div>
              )}

              <div className="bg-gray-900/50 rounded p-3 text-sm space-y-2 border border-gray-800">
                  <div className="flex justify-between">
                      <span className="text-gray-500">Order Value</span>
                      <span className="text-white font-mono">${estimatedCost.toFixed(2)}</span>
                  </div>
                   <div className="flex justify-between">
                      <span className="text-gray-500">Fees (0.2%)</span>
                      <span className="text-white font-mono">${(estimatedCost * 0.002).toFixed(2)}</span>
                  </div>
              </div>
              
              <button
                onClick={handleTrade}
                disabled={isSubmitting}
                className={`w-full py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'BUY' 
                    ? 'bg-xrpl-accent hover:bg-green-400 text-black shadow-[0_0_15px_rgba(0,252,155,0.2)]' 
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                }`}
              >
                {isSubmitting ? (
                    <span className="animate-pulse">Processing...</span>
                ) : (
                    <>
                        {activeTab === 'BUY' ? 'Buy ' : 'Sell '} {project.tokenTicker}
                    </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};