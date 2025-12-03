
import React, { useState } from 'react';
import { IssuerName } from '../types';
import { xrplApi } from '../services/xrplApi';
import { X, UploadCloud, Check, Loader2, Building2 } from 'lucide-react';
import { mockBackend } from '../services/mockBackend';

interface TokenizeModalProps {
    address: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const TokenizeModal: React.FC<TokenizeModalProps> = ({ address, onClose, onSuccess }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [issuer, setIssuer] = useState<IssuerName>(IssuerName.TOUCAN);
    const [formData, setFormData] = useState({
        projectName: '',
        vintage: '2024',
        amount: '',
        ticker: ''
    });
    const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'UPLOADING' | 'DONE'>('IDLE');
    const [cid, setCid] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpload = async () => {
        setUploadStatus('UPLOADING');
        try {
            const result = await mockBackend.uploadToIPFS({ ...formData, address, issuer });
            setCid(result);
            setUploadStatus('DONE');
        } catch (e) {
            setUploadStatus('IDLE');
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await xrplApi.submitTokenizationRequest(
                address,
                issuer,
                formData.projectName,
                formData.vintage,
                parseFloat(formData.amount),
                formData.ticker,
                cid
            );
            setStep(3);
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (e) {
            alert("Submission failed: " + e);
            setIsSubmitting(false);
        }
    };

    if (step === 3) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-xrpl-card border border-green-900 rounded-xl w-full max-w-md p-8 text-center relative shadow-2xl">
                     <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                        <Check className="text-green-500 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Request Submitted</h2>
                    <p className="text-gray-400 mb-6">
                        Your application has been sent to <strong>{issuer}</strong>. <br/>
                        You will be notified once the asset is tokenized and deposited into your wallet.
                    </p>
                    <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-xrpl-card border border-gray-800 rounded-xl w-full max-w-lg p-6 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Building2 className="text-xrpl-accent" /> Tokenize Real World Asset
                </h2>

                <div className="space-y-6">
                    {/* Step 1: Issuer Selection */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase font-bold">1. Select Trusted Issuer</label>
                        <select 
                            value={issuer}
                            onChange={(e) => setIssuer(e.target.value as IssuerName)}
                            className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-xrpl-accent outline-none"
                        >
                            {Object.values(IssuerName).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-1">
                            The selected issuer will verify your off-chain documents before minting tokens.
                        </p>
                    </div>

                    {/* Step 2: Project Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="block text-xs text-gray-400 mb-1">Project Name</label>
                             <input 
                                value={formData.projectName}
                                onChange={e => setFormData({...formData, projectName: e.target.value})}
                                className="w-full bg-black border border-gray-700 rounded p-2 text-white"
                                placeholder="e.g. Solar Farm Array 4"
                             />
                        </div>
                        <div>
                             <label className="block text-xs text-gray-400 mb-1">Vintage Year</label>
                             <input 
                                value={formData.vintage}
                                onChange={e => setFormData({...formData, vintage: e.target.value})}
                                className="w-full bg-black border border-gray-700 rounded p-2 text-white"
                             />
                        </div>
                        <div>
                             <label className="block text-xs text-gray-400 mb-1">Amount (Tons/MWh)</label>
                             <input 
                                type="number"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                                className="w-full bg-black border border-gray-700 rounded p-2 text-white"
                             />
                        </div>
                        <div className="col-span-2">
                             <label className="block text-xs text-gray-400 mb-1">Preferred Token Ticker</label>
                             <input 
                                value={formData.ticker}
                                onChange={e => setFormData({...formData, ticker: e.target.value})}
                                className="w-full bg-black border border-gray-700 rounded p-2 text-white font-mono uppercase"
                                placeholder="e.g. SLF24"
                             />
                        </div>
                    </div>

                    {/* Step 3: Document Upload */}
                    <div className="border-t border-gray-800 pt-4">
                        <label className="block text-xs text-gray-400 mb-2 uppercase font-bold">2. Upload Verification Data</label>
                        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-4 text-center">
                            {uploadStatus === 'IDLE' && (
                                <div className="flex flex-col items-center">
                                    <p className="text-xs text-gray-500 mb-3">Upload Audit Reports, PDD, and Ownership Proofs (PDF/JSON)</p>
                                    <button 
                                        onClick={handleUpload}
                                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-xs flex items-center gap-2"
                                    >
                                        <UploadCloud size={14} /> Upload to IPFS
                                    </button>
                                </div>
                            )}
                             {uploadStatus === 'UPLOADING' && (
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                    <Loader2 className="animate-spin w-4 h-4" /> Encrypting & Pinning...
                                </div>
                            )}
                            {uploadStatus === 'DONE' && (
                                <div className="flex items-center justify-center gap-2 text-xs text-green-400">
                                    <Check size={14} /> Documents Verified & Anchored ({cid.substring(0,8)}...)
                                </div>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={uploadStatus !== 'DONE' || isSubmitting || !formData.ticker}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Tokenization Request'}
                    </button>
                </div>
            </div>
        </div>
    );
};