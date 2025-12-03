
import React, { useState, useEffect } from 'react';
import { mockBackend } from '../services/mockBackend';
import { AuditLogEntry, RetirementRecord } from '../types';
import { ScrollText, Hash, CheckCircle, ExternalLink } from 'lucide-react';

export const ComplianceDashboard: React.FC = () => {
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [retirements, setRetirements] = useState<RetirementRecord[]>([]);

    useEffect(() => {
        setAuditLog(mockBackend.getAuditLog());
        setRetirements(mockBackend.getRetirements());
        
        const interval = setInterval(() => {
             setAuditLog(mockBackend.getAuditLog());
             setRetirements(mockBackend.getRetirements());
        }, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in h-[calc(100vh-140px)]">
            
            {/* Left: Immutable Audit Log */}
            <div className="bg-xrpl-card border border-gray-800 rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Hash className="text-xrpl-accent" size={18} />
                        Immutable Audit Trail
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">SHA-256 Chained</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {auditLog.length === 0 && <div className="text-gray-500 text-sm text-center">No events logged yet.</div>}
                    {auditLog.map(entry => (
                        <div key={entry.id} className="relative pl-6 pb-2 border-l border-gray-700 last:border-0">
                            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-gray-600 border-2 border-gray-900"></div>
                            <div className="text-xs text-gray-500 font-mono mb-1">{entry.timestamp.toLocaleTimeString()}</div>
                            <div className="bg-gray-800/50 rounded p-3 border border-gray-700/50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xrpl-accent font-bold text-xs">{entry.eventType}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{entry.entityId}</span>
                                </div>
                                <p className="text-sm text-gray-300">{entry.description}</p>
                                <div className="mt-2 text-[10px] text-gray-600 font-mono truncate">
                                    Hash: {entry.payloadHash}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Global Retirement Registry */}
            <div className="bg-xrpl-card border border-gray-800 rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={18} />
                        Global Retirement Registry
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900/50 text-gray-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-4">Certificate ID</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Beneficiary</th>
                                <th className="p-4">Merkle Proof</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {retirements.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No retirements recorded.</td></tr>
                            )}
                            {retirements.map(rec => (
                                <tr key={rec.certificateId} className="hover:bg-gray-800/30">
                                    <td className="p-4 font-mono text-xrpl-accent text-xs">
                                        {rec.certificateId}
                                        <div className="text-[10px] text-gray-500">{rec.batchId}</div>
                                    </td>
                                    <td className="p-4 text-white font-bold">{rec.amount} t</td>
                                    <td className="p-4">
                                        <div className="text-xs text-white">{rec.purpose}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">{rec.holderAddress.substring(0,8)}...</div>
                                    </td>
                                    <td className="p-4">
                                        <a href="#" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                            {rec.merkleRoot.substring(0,8)}... <ExternalLink size={10} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
