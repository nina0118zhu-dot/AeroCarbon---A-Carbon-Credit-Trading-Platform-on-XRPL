import React, { useState } from 'react';
import { xrplApi } from '../services/xrplApi';
import { RetirementRecord } from '../types';
import { pdfService } from '../services/pdfService';
import { Loader2, FileCheck, X, Download, Share2 } from 'lucide-react';

interface RetirementModalProps {
    ticker: string;
    maxAmount: number;
    onClose: () => void;
    onSuccess: () => void;
}

export const RetirementModal: React.FC<RetirementModalProps> = ({ ticker, maxAmount, onClose, onSuccess }) => {
    const [amount, setAmount] = useState<string>('');
    const [purpose, setPurpose] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [certificate, setCertificate] = useState<RetirementRecord | null>(null);

    const handleRetire = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0 || val > maxAmount) {
            alert("Invalid Amount");
            return;
        }
        if (!purpose.trim()) {
            alert("Please specify a purpose (e.g. Scope 1 Offsetting)");
            return;
        }

        setIsSubmitting(true);
        try {
            const cert = await xrplApi.retireToken(ticker, val, purpose);
            setCertificate(cert);
            onSuccess(); // Refresh wallet in background
        } catch (e) {
            alert("Retirement Failed: " + e);
            setIsSubmitting(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!certificate) return;
        pdfService.generateRetirementCertificate(certificate, ticker);
    };

    if (certificate) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-xrpl-card border border-gray-700 rounded-xl w-full max-w-md p-6 relative shadow-2xl shadow-green-900/20">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                    
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                            <FileCheck className="text-green-500 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Retirement Successful</h2>
                        <p className="text-sm text-gray-400 mt-2">Your tokens have been permanently removed from circulation.</p>
                    </div>

                    <div className="bg-black/40 rounded-lg p-4 space-y-3 mb-6 border border-gray-800">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Certificate ID</span>
                            <span className="text-white font-mono">{certificate.certificateId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Merkle Root</span>
                            <span className="text-blue-400 font-mono text-xs truncate w-32">{certificate.merkleRoot}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Amount</span>
                            <span className="text-green-400 font-bold">{certificate.amount} {ticker}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={handleDownloadPdf}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-700"
                        >
                            <Download size={16} /> PDF Certificate
                        </button>
                         <button className="flex-1 bg-xrpl-accent hover:bg-green-400 text-black py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold">
                            <Share2 size={16} /> Share
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-xrpl-card border border-gray-800 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                
                <h2 className="text-xl font-bold text-white mb-1">Retire Carbon Credits</h2>
                <p className="text-sm text-gray-400 mb-6">Offset your carbon footprint by burning {ticker}.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Amount ({ticker})</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded p-3 text-white font-mono"
                                placeholder="0.00"
                            />
                            <span className="absolute right-3 top-3 text-xs text-gray-500">Max: {maxAmount}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Beneficiary / Purpose</label>
                        <textarea 
                            value={purpose}
                            onChange={e => setPurpose(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm h-20"
                            placeholder="e.g. ACME Corp 2024 Scope 3 Emissions"
                        ></textarea>
                        <p className="text-[10px] text-gray-500 mt-1">This will be permanently recorded on the XRPL Audit Log.</p>
                    </div>

                    <button 
                        onClick={handleRetire}
                        disabled={isSubmitting}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm Retirement'}
                    </button>
                </div>
            </div>
        </div>
    );
};