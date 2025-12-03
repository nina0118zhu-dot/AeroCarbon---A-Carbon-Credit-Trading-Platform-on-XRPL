

import React, { useState, useEffect } from 'react';
import { mockBackend } from '../services/mockBackend';
import { xrplApi } from '../services/xrplApi';
import { Batch, TokenState, TokenizationRequest, CarbonProject } from '../types';
import { pdfService } from '../services/pdfService';
import { ShieldCheck, ArrowRight, FileText, Lock, AlertCircle, Plus, UploadCloud, Database, Check, Loader2, Settings, UserCheck, AlertTriangle, Save, ClipboardCheck, Clock, Download, QrCode } from 'lucide-react';

export const IssuerPortal: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [projects, setProjects] = useState<CarbonProject[]>([]);
  const [view, setView] = useState<'DASHBOARD' | 'NEW_ISSUANCE' | 'CONFIG' | 'APPROVALS'>('CONFIG');
  const [isConfigured, setIsConfigured] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<TokenizationRequest[]>([]);

  // Form State
  const [formData, setFormData] = useState({
      projectName: '',
      ticker: '',
      vintage: '2024',
      totalTons: '',
      verifier: 'Verra'
  });
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'UPLOADING' | 'DONE'>('IDLE');
  const [ipfsCid, setIpfsCid] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Double Issuance Prevention State
  const [uniquenessStatus, setUniquenessStatus] = useState<'unchecked' | 'checking' | 'unique' | 'duplicate'>('unchecked');

  // Success State
  const [mintedProject, setMintedProject] = useState<{project: CarbonProject, txHash: string} | null>(null);

  useEffect(() => {
    setBatches(mockBackend.getBatches());
    // Also load projects to link to batches for PDF generation
    xrplApi.getProjects().then(setProjects);
  }, [view]);

  // Fetch requests when entering Approvals View
  useEffect(() => {
      if (view === 'APPROVALS') {
          loadApprovals();
      }
  }, [view]);

  const loadApprovals = async () => {
      const all = await xrplApi.getAllTokenizationRequests();
      setPendingRequests(all.filter(r => r.status === 'PENDING'));
  };

  const handleApproveRequest = async (reqId: string) => {
      setProcessingId(reqId);
      try {
          await xrplApi.approveTokenizationRequest(reqId);
          await loadApprovals(); // Refresh list
      } catch (e) {
          alert("Approval failed: " + e);
      } finally {
          setProcessingId(null);
      }
  };

  // Reset check when inputs change
  useEffect(() => {
      setUniquenessStatus('unchecked');
  }, [formData.ticker, formData.vintage]);

  const handleStateTransition = async (batchId: string, newState: TokenState) => {
    try {
        await mockBackend.updateBatchState(batchId, newState, "Manual issuer action via portal");
        setBatches(mockBackend.getBatches()); // Refresh
    } catch (e) {
        alert(e);
    }
  };

  const handleIssuerConfig = () => {
      // Simulate XRPL AccountSet transaction with SetFlag: 8 (asfRequireAuth)
      setTimeout(() => {
          setIsConfigured(true);
          setView('DASHBOARD');
      }, 1500);
  };

  const handleCheckUniqueness = async () => {
      if (!formData.ticker || !formData.vintage) return;
      setUniquenessStatus('checking');
      const isDuplicate = await mockBackend.checkDuplication(formData.ticker, formData.vintage);
      setUniquenessStatus(isDuplicate ? 'duplicate' : 'unique');
  };

  const handleDownloadExistingCert = (batch: Batch) => {
      // Find the project details for this batch
      const project = projects.find(p => p.tokenTicker === batch.tokenTicker);
      if (!project) {
          alert("Project metadata not found for this batch.");
          return;
      }
      pdfService.generateMintCertificate(
          project, 
          batch.batchId, 
          batch.txHash || 'PENDING_HASH'
      );
  };

  const getStateColor = (state: TokenState) => {
    switch(state) {
        case TokenState.DRAFT: return 'bg-gray-700 text-gray-300 border-gray-600';
        case TokenState.ISSUED: return 'bg-blue-900/50 text-blue-300 border-blue-800';
        case TokenState.AUTHORIZED: return 'bg-green-900/50 text-green-300 border-green-800';
        case TokenState.SUSPENDED: return 'bg-red-900/50 text-red-300 border-red-800';
        default: return 'bg-gray-800';
    }
  };

  // --- NEW ISSUANCE HANDLERS ---
  const handleUploadToIPFS = async () => {
      if (uniquenessStatus !== 'unique') return;
      setUploadStatus('UPLOADING');
      try {
          // Simulate IPFS upload of form data + mock PDF
          const cid = await mockBackend.uploadToIPFS({ ...formData, timestamp: Date.now() });
          setIpfsCid(cid);
          setUploadStatus('DONE');
      } catch (e) {
          alert("IPFS Upload Failed");
          setUploadStatus('IDLE');
      }
  };

  const handleSaveDraft = async () => {
      if (!ipfsCid) return;
      setIsSaving(true);
      try {
          const tonAmount = parseFloat(formData.totalTons);
          await xrplApi.saveDraftProject(
              formData.ticker, 
              tonAmount, 
              ipfsCid, 
              formData.projectName, 
              formData.vintage
          );
          setView('DASHBOARD');
          resetForm();
      } catch (e) {
          alert("Failed to save draft: " + e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleIssueOnChain = async () => {
      if (!ipfsCid) return;
      setIsIssuing(true);
      try {
          const tonAmount = parseFloat(formData.totalTons);
          const result = await xrplApi.issueBatchOnChain(
              formData.ticker, 
              tonAmount, 
              ipfsCid, 
              formData.projectName, 
              formData.vintage
          );
          
          if (result.project) {
              setMintedProject({ project: result.project, txHash: result.txHash });
          } else {
             setView('DASHBOARD');
             resetForm();
          }

      } catch (e) {
          alert("Chain Issuance Failed: " + e);
      } finally {
          setIsIssuing(false);
      }
  };

  const handleDownloadMintCert = () => {
      if (!mintedProject) return;
      // Generate the PDF
      pdfService.generateMintCertificate(
          mintedProject.project, 
          `${mintedProject.project.tokenTicker}-${mintedProject.project.vintage}-A`,
          mintedProject.txHash
      );
  };

  const handleFinishMinting = () => {
      setView('DASHBOARD');
      resetForm();
      setMintedProject(null);
  };

  const resetForm = () => {
      setFormData({ projectName: '', ticker: '', vintage: '2024', totalTons: '', verifier: 'Verra' });
      setUploadStatus('IDLE');
      setIpfsCid('');
      setUniquenessStatus('unchecked');
  };

  if (mintedProject) {
      return (
          <div className="max-w-xl mx-auto animate-fade-in py-12">
               <div className="bg-xrpl-card border border-green-900 rounded-xl p-8 text-center shadow-[0_0_50px_rgba(20,83,45,0.4)]">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/40">
                        <Check className="text-green-500 w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Asset Minted Successfully</h2>
                    <p className="text-gray-400 mb-8">
                        The carbon credits <strong>{mintedProject.project.tokenTicker}</strong> have been issued on the XRP Ledger.
                    </p>

                    <div className="space-y-4 mb-8">
                        <button 
                            onClick={handleDownloadMintCert}
                            className="w-full bg-white hover:bg-gray-100 text-green-900 font-bold py-4 rounded-lg flex items-center justify-center gap-3 shadow-lg"
                        >
                            <QrCode size={20} /> Download Mint Certificate (PDF)
                        </button>
                        <p className="text-xs text-gray-500">
                            *This certificate contains the QR code required for IoT Validator scanning.
                        </p>
                    </div>

                    <button 
                        onClick={handleFinishMinting}
                        className="text-gray-400 hover:text-white text-sm"
                    >
                        Return to Dashboard
                    </button>
               </div>
          </div>
      );
  }

  if (view === 'CONFIG') {
    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white">Issuer Configuration</h2>
                <p className="text-gray-400 mt-2">Before minting Regulated Real World Assets (RWA), you must configure your XRPL account.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KYC Card */}
                <div className="bg-xrpl-card border border-gray-800 rounded-xl p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/30">
                        <UserCheck className="text-blue-400 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">1. Identity Verification</h3>
                    <div className="w-full bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-800 text-left">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Legal Name</span>
                            <span className="text-white">Green Earth Foundation</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Registry ID</span>
                            <span className="text-white font-mono">US-REG-998877</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Status</span>
                            <span className="text-green-400 font-bold flex items-center gap-1">
                                <Check size={14} /> Verified
                            </span>
                        </div>
                    </div>
                    <button disabled className="text-xs text-gray-500 uppercase font-bold tracking-wide">
                        Platform Due Diligence Passed
                    </button>
                </div>

                {/* XRPL Config Card */}
                <div className="bg-xrpl-card border border-gray-800 rounded-xl p-8 flex flex-col items-center text-center relative overflow-hidden">
                    {isConfigured && (
                        <div className="absolute inset-0 bg-green-900/90 flex items-center justify-center z-10 backdrop-blur-sm animate-fade-in">
                            <div className="text-center">
                                <Check size={48} className="text-white mx-auto mb-2" />
                                <h3 className="text-xl font-bold text-white">Configured</h3>
                                <button 
                                    onClick={() => setView('DASHBOARD')}
                                    className="mt-4 bg-white text-green-900 font-bold py-2 px-6 rounded-full hover:bg-gray-100"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="w-16 h-16 bg-xrpl-accent/10 rounded-full flex items-center justify-center mb-4 border border-xrpl-accent/30">
                        <Settings className="text-xrpl-accent w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">2. Ledger Configuration</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        Enable <strong>Require Auth</strong> flag on-chain. This ensures no one can hold your Carbon Credits without your explicit TrustLine authorization (AML compliance).
                    </p>
                    <button 
                        onClick={handleIssuerConfig}
                        className="w-full bg-xrpl-accent hover:bg-green-400 text-black font-bold py-3 rounded-lg transition-colors"
                    >
                        {isConfigured ? 'Configuration Complete' : 'Enable "Require Auth"'}
                    </button>
                </div>
            </div>
        </div>
    );
  }

  if (view === 'APPROVALS') {
      return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <button onClick={() => setView('DASHBOARD')} className="text-gray-400 hover:text-white flex items-center gap-1">
                    ← Back to Dashboard
                </button>
                <h2 className="text-2xl font-bold text-white">Pending Tokenization Requests</h2>
             </div>

             <div className="bg-xrpl-card border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50 text-sm font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                    <span>Applications Queue</span>
                    <span className="text-xrpl-accent">{pendingRequests.length} Pending</span>
                </div>
                {pendingRequests.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        No pending applications found.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="p-6 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-blue-900/20 rounded-lg h-fit">
                                        <Clock className="text-blue-400" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{req.projectName}</h4>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                            <span className="font-mono bg-gray-900 px-2 py-0.5 rounded">{req.tokenTicker}</span>
                                            <span>•</span>
                                            <span>{req.amount.toLocaleString()} Tons</span>
                                            <span>•</span>
                                            <span>Vintage {req.vintage}</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 font-mono">
                                            Requester: {req.requesterAddress}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <a 
                                        href="#" 
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        title="View PDD/Docs"
                                    >
                                        <FileText size={14} /> View Docs
                                    </a>
                                    <button
                                        onClick={() => handleApproveRequest(req.id)}
                                        disabled={!!processingId}
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                                    >
                                        {processingId === req.id ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                        {processingId === req.id ? 'Minting...' : 'Approve & Mint'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        </div>
      );
  }

  if (view === 'NEW_ISSUANCE') {
      return (
          <div className="max-w-2xl mx-auto animate-fade-in">
              <button onClick={() => setView('DASHBOARD')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
                  ← Back to Dashboard
              </button>
              
              <div className="bg-xrpl-card border border-gray-800 rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <Database className="text-xrpl-accent" /> New Carbon Credit Issuance
                  </h2>

                  <div className="space-y-6">
                      {/* Step 1: Metadata */}
                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <h3 className="text-sm font-bold text-gray-500 uppercase">1. Project Metadata & Uniqueness</h3>
                              <div className="text-xs text-gray-500">
                                  Registry: <span className="text-white">Verra (VCS)</span>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                  <label className="block text-xs text-gray-400 mb-1">Project Name</label>
                                  <input 
                                      className="w-full bg-black border border-gray-700 rounded p-2 text-white" 
                                      value={formData.projectName}
                                      onChange={e => setFormData({...formData, projectName: e.target.value})}
                                      placeholder="e.g. Amazon Reforestation"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs text-gray-400 mb-1">Token Ticker (Symbol)</label>
                                  <input 
                                      className="w-full bg-black border border-gray-700 rounded p-2 text-white font-mono uppercase" 
                                      value={formData.ticker}
                                      onChange={e => setFormData({...formData, ticker: e.target.value})}
                                      placeholder="e.g. AMZ24"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs text-gray-400 mb-1">Vintage Year</label>
                                  <input 
                                      className="w-full bg-black border border-gray-700 rounded p-2 text-white" 
                                      value={formData.vintage}
                                      onChange={e => setFormData({...formData, vintage: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs text-gray-400 mb-1">Total Supply (Tons)</label>
                                  <input 
                                      type="number"
                                      className="w-full bg-black border border-gray-700 rounded p-2 text-white" 
                                      value={formData.totalTons}
                                      onChange={e => setFormData({...formData, totalTons: e.target.value})}
                                  />
                              </div>
                          </div>

                          {/* Double Issuance Check */}
                          <div className="bg-gray-900 rounded p-4 border border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-400">
                                        Prevent <strong>Double Issuance</strong> by verifying this Vintage/Project combo against the Global Registry.
                                    </div>
                                    <button
                                        onClick={handleCheckUniqueness}
                                        disabled={!formData.ticker || !formData.vintage || uniquenessStatus === 'checking'}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                            uniquenessStatus === 'unique' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                            uniquenessStatus === 'duplicate' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                            'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                                        }`}
                                    >
                                        {uniquenessStatus === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                                         uniquenessStatus === 'unique' ? 'Verified Unique ✓' : 
                                         uniquenessStatus === 'duplicate' ? 'Duplicate Detected!' : 
                                         'Check Uniqueness'}
                                    </button>
                                </div>
                                {uniquenessStatus === 'duplicate' && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-900/10 p-2 rounded">
                                        <AlertTriangle size={12} />
                                        Warning: This Ticker and Vintage combination has already been issued.
                                    </div>
                                )}
                          </div>
                      </div>

                      {/* Step 2: IPFS Upload */}
                      <div className={`border-t border-gray-800 pt-6 ${uniquenessStatus !== 'unique' ? 'opacity-50 pointer-events-none' : ''}`}>
                          <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">2. Verification Documents & Storage</h3>
                          <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-6 text-center">
                                {uploadStatus === 'IDLE' && (
                                    <div className="flex flex-col items-center">
                                        <UploadCloud className="text-gray-500 w-10 h-10 mb-2" />
                                        <p className="text-sm text-gray-400 mb-4">Upload Project Design Document (PDD) & Verification Report</p>
                                        <button 
                                            onClick={handleUploadToIPFS}
                                            disabled={!formData.ticker}
                                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
                                        >
                                            Upload Metadata to IPFS
                                        </button>
                                    </div>
                                )}
                                {uploadStatus === 'UPLOADING' && (
                                    <div className="flex flex-col items-center py-4">
                                        <Loader2 className="animate-spin text-xrpl-accent w-8 h-8 mb-2" />
                                        <p className="text-sm text-gray-400">Hashing and Pinning to IPFS...</p>
                                    </div>
                                )}
                                {uploadStatus === 'DONE' && (
                                    <div className="text-left bg-black/40 p-4 rounded border border-gray-700">
                                        <div className="flex items-center gap-2 text-green-400 mb-2 font-bold">
                                            <Check size={16} /> Metadata Anchored
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">IPFS CID:</p>
                                        <div className="font-mono text-xs text-xrpl-accent break-all bg-black p-2 rounded">
                                            {ipfsCid}
                                        </div>
                                    </div>
                                )}
                          </div>
                      </div>

                      {/* Step 3: Issuance Action */}
                      <div className={`border-t border-gray-800 pt-6 ${uploadStatus !== 'DONE' ? 'opacity-50 pointer-events-none' : ''}`}>
                          <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">3. Save or Mint</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <button
                                    onClick={handleSaveDraft}
                                    disabled={uploadStatus !== 'DONE' || isIssuing || isSaving}
                                    className="w-full py-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900/50 disabled:text-gray-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-gray-700"
                              >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={16} /> Save as Draft</>}
                              </button>

                              <button
                                    onClick={handleIssueOnChain}
                                    disabled={uploadStatus !== 'DONE' || isIssuing || isSaving}
                                    className="w-full py-4 bg-xrpl-accent hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                              >
                                    {isIssuing ? <Loader2 className="animate-spin" /> : <><Database size={16} /> Mint on XRPL</>}
                              </button>
                          </div>
                          
                          <p className="text-center text-xs text-gray-500 mt-2">
                              "Save as Draft" stores locally. "Mint on XRPL" creates the On-Chain Ledger definition immediately.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <div className="bg-xrpl-accent/10 p-3 rounded-full">
                <ShieldCheck className="text-xrpl-accent w-8 h-8" />
                </div>
                <div>
                <h2 className="text-xl font-bold text-white">Issuer Governance Portal</h2>
                <p className="text-sm text-gray-400">Manage Token Lifecycle, Metadata, and Registry Sync</p>
                </div>
            </div>
            <div className="flex gap-3">
                 <button 
                    onClick={() => setView('APPROVALS')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors relative"
                >
                    <ClipboardCheck size={18} /> Approvals
                    {/* Optional Notification Dot could go here */}
                </button>
                 <button 
                    onClick={() => setView('CONFIG')}
                    className="border border-gray-700 text-gray-300 hover:text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Settings size={18} /> Configuration
                </button>
                <button 
                    onClick={() => setView('NEW_ISSUANCE')}
                    className="bg-white hover:bg-gray-200 text-black font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> New Issuance
                </button>
            </div>
        </div>

        {/* State Machine Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map(batch => (
                <div key={batch.batchId} className="bg-xrpl-card border border-gray-800 rounded-xl p-6 relative overflow-hidden transition-all hover:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white">{batch.tokenTicker}</h3>
                            <p className="text-xs text-gray-500">{batch.batchId}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs border ${getStateColor(batch.state)}`}>
                            {batch.state}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-black/40 rounded p-3 text-sm space-y-2">
                             <div className="flex justify-between">
                                <span className="text-gray-500">Total Tons</span>
                                <span className="text-white font-mono">{batch.totalTons.toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-gray-500">Metadata CID</span>
                                <span className="text-xrpl-accent text-xs font-mono cursor-pointer hover:underline">{batch.metadataCid.substring(0,12)}...</span>
                             </div>
                        </div>

                        {/* Lifecycle Controls */}
                        <div className="pt-4 border-t border-gray-800 space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Lifecycle</p>
                                <div className="flex flex-wrap gap-2">
                                    {batch.state === TokenState.DRAFT && (
                                        <button 
                                            onClick={() => handleStateTransition(batch.batchId, TokenState.ISSUED)}
                                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded w-full justify-center font-bold"
                                        >
                                            <Database size={12} /> Publish Issuance On-Chain
                                        </button>
                                    )}
                                    {batch.state === TokenState.ISSUED && (
                                        <button 
                                            onClick={() => handleStateTransition(batch.batchId, TokenState.AUTHORIZED)}
                                            className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-2 rounded"
                                        >
                                            <FileText size={12} /> Sync Registry Authorization
                                        </button>
                                    )}
                                    {batch.state === TokenState.AUTHORIZED && (
                                        <button 
                                            onClick={() => handleStateTransition(batch.batchId, TokenState.SUSPENDED)}
                                            className="flex items-center gap-1 bg-red-900/50 hover:bg-red-900 text-red-300 border border-red-800 text-xs px-3 py-2 rounded"
                                        >
                                            <Lock size={12} /> Emergency Suspend
                                        </button>
                                    )}
                                    {batch.state === TokenState.SUSPENDED && (
                                        <button 
                                            onClick={() => handleStateTransition(batch.batchId, TokenState.AUTHORIZED)}
                                            className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded"
                                        >
                                            Re-Authorize
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Proofs</p>
                                <button 
                                    onClick={() => handleDownloadExistingCert(batch)}
                                    className="w-full bg-white hover:bg-gray-200 text-black text-xs font-bold py-2 rounded flex items-center justify-center gap-2"
                                >
                                    <QrCode size={12} /> Download Mint Cert
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg flex gap-3">
            <AlertCircle className="text-blue-400 shrink-0" />
            <div className="text-sm text-blue-200">
                <strong>Governance Note:</strong> This portal simulates the "Issuer Service". In production, transitions like 'AUTHORIZED' would be triggered automatically via the MRV Sync webhook from Verra/Gold Standard, not manual clicks.
            </div>
        </div>
    </div>
  );
};