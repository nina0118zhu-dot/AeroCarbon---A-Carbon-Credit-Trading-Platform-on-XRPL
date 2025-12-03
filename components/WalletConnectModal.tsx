import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { xrplApi } from '../services/xrplApi';
import { Loader2, Key, X, Zap, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';

interface WalletConnectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ onClose, onSuccess }) => {
  const [seed, setSeed] = useState('');
  const [mode, setMode] = useState<'INPUT' | 'GENERATING' | 'SUCCESS'>('INPUT');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newWalletData, setNewWalletData] = useState<{address: string, seed: string} | null>(null);

  const handleConnect = async () => {
    if (!seed.trim()) {
      setError('Please enter a valid secret.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Basic validation for seed format
      if (!seed.startsWith('s')) {
        throw new Error('Invalid Secret format. Testnet seeds usually start with "s".');
      }
      
      const success = await xrplApi.connectRealWallet(seed.trim());
      if (success) {
        onSuccess();
      } else {
        setError('Failed to connect. Check your secret.');
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setMode('GENERATING');
    setIsLoading(true);
    try {
      const wallet = await xrplApi.generateFundedWallet();
      setNewWalletData({
        address: wallet.address,
        seed: wallet.seed
      });
      setMode('SUCCESS');
      // Auto connect
      await xrplApi.connectRealWallet(wallet.seed);
    } catch (e: any) {
      setMode('INPUT');
      setError('Faucet generation failed: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockMode = async () => {
      setIsLoading(true);
      await xrplApi.enableMockMode();
      setIsLoading(false);
      onSuccess();
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-xrpl-card border border-gray-700 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-xrpl-accent/10 rounded-full flex items-center justify-center border border-xrpl-accent/20">
            <Key className="text-xrpl-accent w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Connect XRPL Testnet</h2>
            <p className="text-xs text-gray-400">Real blockchain interaction</p>
          </div>
        </div>

        {mode === 'INPUT' && (
          <div className="space-y-4">
             <div className="bg-blue-900/20 border border-blue-800 p-3 rounded flex gap-2">
                <AlertTriangle className="text-blue-400 shrink-0 w-4 h-4 mt-0.5" />
                <p className="text-xs text-blue-200">
                   Enter your <strong>Testnet Secret</strong> (starts with 's'). <br/>
                   Your keys are only used locally to sign transactions and are never sent to a backend.
                </p>
             </div>

             <div>
                <label className="block text-xs text-gray-400 mb-1">Wallet Secret (Seed)</label>
                <input 
                  type="password"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="sEd..."
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white font-mono focus:border-xrpl-accent focus:outline-none"
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
             </div>

             <button 
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full bg-xrpl-accent hover:bg-green-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
             >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Connect Existing Wallet'}
             </button>

             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-800"></div>
                <span className="flex-shrink-0 mx-4 text-gray-600 text-xs uppercase">Or</span>
                <div className="flex-grow border-t border-gray-800"></div>
             </div>

             <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-700"
             >
                <Zap size={16} className="text-yellow-400" /> Generate New Funded Wallet
             </button>

             {/* MOCK MODE TOGGLE */}
             <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                 <button 
                    onClick={handleMockMode}
                    className="group flex items-center justify-center gap-2 mx-auto text-gray-500 hover:text-white transition-colors text-xs"
                 >
                     <PlayCircle size={14} className="group-hover:text-xrpl-accent" />
                     <span>Testnet unstable? <span className="underline decoration-dotted">Skip to Demo Mode</span></span>
                 </button>
             </div>
          </div>
        )}

        {mode === 'GENERATING' && (
           <div className="text-center py-10">
              <Loader2 className="w-12 h-12 text-xrpl-accent animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">Creating Account...</h3>
              <p className="text-sm text-gray-400 mt-2">Requesting funds from XRPL Testnet Faucet.</p>
              <p className="text-xs text-gray-500 mt-1">This may take 10-15 seconds.</p>
           </div>
        )}

        {mode === 'SUCCESS' && newWalletData && (
          <div className="space-y-4">
             <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg text-center">
                <CheckCircle className="text-green-400 w-12 h-12 mx-auto mb-2" />
                <h3 className="text-white font-bold">Wallet Created & Funded!</h3>
             </div>

             <div className="space-y-2">
               <div>
                  <label className="text-xs text-gray-500 block mb-1">Public Address</label>
                  <div className="bg-black p-2 rounded text-xs font-mono text-gray-300 break-all select-all">
                    {newWalletData.address}
                  </div>
               </div>
               <div>
                  <label className="text-xs text-red-400 block mb-1 font-bold">SECRET KEY (SAVE THIS!)</label>
                  <div className="bg-red-900/10 border border-red-900/30 p-2 rounded text-xs font-mono text-red-200 break-all select-all">
                    {newWalletData.seed}
                  </div>
               </div>
             </div>

             <button 
                onClick={onSuccess}
                className="w-full bg-xrpl-accent hover:bg-green-400 text-black font-bold py-3 rounded-lg mt-4"
             >
                Continue to Dashboard
             </button>
          </div>
        )}

      </div>
    </div>
  , document.body);
};