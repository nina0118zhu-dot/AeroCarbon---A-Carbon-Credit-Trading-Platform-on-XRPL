import React, { useState, useEffect, useRef } from 'react';
import { QrPayload } from '../types';
import { xrplApi } from '../services/xrplApi';
import { getLastGeneratedQr } from '../services/pdfService';
import { auditScanResult } from '../services/geminiService';
import jsQR from 'jsqr';
import { 
  ScanLine, 
  XCircle, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Database, 
  Loader2, 
  Camera, 
  Keyboard, 
  Cpu,
  FileSearch,
  Box,
  Share2,
  Upload,
  PlayCircle
} from 'lucide-react';

interface IoTScannerProps {
  onClose: () => void;
}

export const IoTScanner: React.FC<IoTScannerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'VERIFYING' | 'RESULT'>('IDLE');
  
  // Data
  const [scannedData, setScannedData] = useState<QrPayload | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // AI State
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Manual Input State
  const [manualInput, setManualInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate AI Scan automatically when result is found
  useEffect(() => {
    if (scanState === 'RESULT' && scannedData && verificationResult) {
      runAiAudit();
    }
  }, [scanState]);

  const runAiAudit = async () => {
    setIsAiAnalyzing(true);
    const report = await auditScanResult({
        qr: scannedData,
        ledger: verificationResult
    });
    setAiReport(report);
    setIsAiAnalyzing(false);
  };

  // --- FILE UPLOAD HANDLING ---
  const handleFileUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setScanState('SCANNING');

      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              if (!context) return;

              canvas.width = img.width;
              canvas.height = img.height;
              context.drawImage(img, 0, 0);
              
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              // Decode QR
              const code = jsQR(imageData.data, imageData.width, imageData.height);

              if (code) {
                  try {
                      const payload = JSON.parse(code.data);
                      processScan(payload);
                  } catch (err) {
                      alert("Invalid QR Data: Not a valid JSON payload.");
                      setScanState('IDLE');
                  }
              } else {
                  alert("No QR Code found in image. Please try a clearer image.");
                  setScanState('IDLE');
              }
          };
          img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
  };

  // --- SIMULATION ---
  const simulateScan = async () => {
    setScanState('SCANNING');
    
    // Simulate camera delay/focus
    setTimeout(async () => {
      // 1. Try to get generated QR from session
      const mockData = getLastGeneratedQr();
      
      if (!mockData) {
         setScanState('IDLE');
         alert("DEMO MODE: No certificate generated yet. \n\nPlease go to 'Issuer Portal' to Mint or 'Portfolio' to Retire a credit first to generate a QR code.");
         return;
      }

      processScan(mockData);
    }, 1500);
  };

  const handleManualVerify = async () => {
      if(!manualInput) return;
      setScanState('VERIFYING');
      
      // In a real app, we would fetch the TX from XRPL by hash.
      // For demo, we try to match it against the last generated one or mock it.
      const mockData = getLastGeneratedQr();
      
      // Fallback mock if manual input doesn't match session (just to show flow)
      const payload = mockData && (mockData.data.tokenId === manualInput || mockData.data.txHash === manualInput)
          ? mockData 
          : {
            type: 'MINT_CERT',
            version: '1.0',
            contract: 'XRPL',
            network: 'TESTNET',
            data: {
                tokenId: manualInput.substring(0,4).toUpperCase(),
                amount: 100,
                txHash: manualInput,
                timestamp: new Date().toISOString(),
                status: 'ISSUED'
            }
          } as QrPayload;

      processScan(payload);
  };

  const processScan = async (payload: QrPayload) => {
      setScannedData(payload);
      setScanState('VERIFYING');

      try {
        const result = await xrplApi.verifyQrData(payload);
        setVerificationResult(result);
        setScanState('RESULT');
      } catch (e) {
        alert("Verification Error: " + e);
        setScanState('IDLE');
      }
  };

  const reset = () => {
      setScanState('IDLE');
      setScannedData(null);
      setVerificationResult(null);
      setAiReport('');
      setManualInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in font-sans">
       
       <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
       />

       {/* Close Button */}
       <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white flex items-center gap-2 group transition-colors">
           <span className="text-sm font-mono group-hover:text-red-400">TERMINATE_SESSION</span>
           <XCircle className="group-hover:text-red-400" />
       </button>

       <div className="max-w-4xl w-full flex flex-col md:flex-row gap-8 items-start">
           
           {/* LEFT PANEL: SCANNER VIEW */}
           <div className="w-full md:w-1/2 flex flex-col gap-4">
               
               {/* Mode Switcher */}
               <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-800">
                   <button 
                       onClick={() => setActiveTab('CAMERA')}
                       disabled={scanState !== 'IDLE'}
                       className={`flex-1 py-2 text-sm font-bold rounded flex items-center justify-center gap-2 transition-all ${
                           activeTab === 'CAMERA' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                       }`}
                   >
                       <Camera size={16} /> Scan QR
                   </button>
                   <button 
                       onClick={() => setActiveTab('MANUAL')}
                       disabled={scanState !== 'IDLE'}
                       className={`flex-1 py-2 text-sm font-bold rounded flex items-center justify-center gap-2 transition-all ${
                           activeTab === 'MANUAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                       }`}
                   >
                       <Keyboard size={16} /> Manual Input
                   </button>
               </div>

               {/* Viewfinder / Main Area */}
               <div className="relative aspect-square bg-gray-950 border-2 border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center group">
                   
                   {/* Decorative Corner Markers */}
                   <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-blue-500/50 rounded-tl"></div>
                   <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-blue-500/50 rounded-tr"></div>
                   <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-blue-500/50 rounded-bl"></div>
                   <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-500/50 rounded-br"></div>

                   {/* Grid Overlay */}
                   <div className="absolute inset-0 bg-[linear-gradient(rgba(0,100,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,100,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                   {/* STATE: IDLE (CAMERA) */}
                   {scanState === 'IDLE' && activeTab === 'CAMERA' && (
                       <div className="z-10 w-full h-full flex flex-col items-center justify-center space-y-4">
                           {/* Upload Button */}
                           <div 
                               onClick={handleFileUploadClick}
                               className="flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform p-8 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-900/50 hover:bg-gray-800/50 w-3/4 aspect-square max-h-[60%]"
                           >
                               <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                   <Upload className="text-blue-400 w-8 h-8" />
                               </div>
                               <h3 className="text-white font-bold text-lg">Upload QR Image</h3>
                               <p className="text-gray-400 text-xs text-center mt-2">
                                   Click to upload <br/> Certificate PDF/Image
                               </p>
                           </div>

                           {/* Simulate Link */}
                           <button 
                                onClick={simulateScan}
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-xrpl-accent transition-colors"
                           >
                               <PlayCircle size={14} /> Run Demo Simulation
                           </button>
                       </div>
                   )}

                   {/* STATE: IDLE (MANUAL) */}
                   {scanState === 'IDLE' && activeTab === 'MANUAL' && (
                       <div className="z-10 w-3/4 space-y-4">
                           <div className="text-center mb-4">
                               <h3 className="text-white font-bold">Manual Verification</h3>
                               <p className="text-gray-500 text-xs">Enter Asset ID or Transaction Hash</p>
                           </div>
                           <input 
                               type="text"
                               value={manualInput}
                               onChange={e => setManualInput(e.target.value)}
                               placeholder="e.g. TOKEN-XYZ... or TX-123..."
                               className="w-full bg-black/80 border border-gray-700 rounded-lg p-3 text-white font-mono text-sm focus:border-blue-500 outline-none"
                           />
                           <button 
                               onClick={handleManualVerify}
                               disabled={!manualInput}
                               className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg"
                           >
                               Verify ID
                           </button>
                       </div>
                   )}

                   {/* STATE: SCANNING */}
                   {scanState === 'SCANNING' && (
                       <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                            <div className="w-full h-1 bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,1)] absolute top-1/2 animate-[scan_1.5s_ease-in-out_infinite]"></div>
                            <p className="text-blue-400 font-mono text-xs mt-32 bg-black/60 px-2 py-1 rounded animate-pulse">
                                ACQUIRING OPTICAL DATA...
                            </p>
                       </div>
                   )}

                   {/* STATE: VERIFYING */}
                   {scanState === 'VERIFYING' && (
                       <div className="z-20 text-center">
                           <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                           <h3 className="text-white font-bold">Querying Ledger</h3>
                           <p className="text-xs text-blue-300 font-mono mt-2">Node: wss://s.altnet.rippletest.net</p>
                       </div>
                   )}

                   {/* STATE: RESULT (Mini Summary) */}
                   {scanState === 'RESULT' && scannedData && (
                       <div className="z-20 flex flex-col items-center animate-fade-in">
                           <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-4 ${
                               scannedData.data.status === 'ISSUED' ? 'border-green-500 bg-green-900/20' : 'border-orange-500 bg-orange-900/20'
                           }`}>
                               {scannedData.data.status === 'ISSUED' ? (
                                   <CheckCircle className="text-green-500 w-10 h-10" />
                               ) : (
                                   <Box className="text-orange-500 w-10 h-10" />
                               )}
                           </div>
                           <h3 className={`font-bold text-xl ${
                               scannedData.data.status === 'ISSUED' ? 'text-green-400' : 'text-orange-400'
                           }`}>
                               {scannedData.data.status}
                           </h3>
                           <p className="text-gray-400 text-xs mt-1">
                               {scannedData.data.status === 'ISSUED' ? 'Active Asset' : 'Retired & Burned'}
                           </p>
                       </div>
                   )}

               </div>
           </div>

           {/* RIGHT PANEL: DATA & AI */}
           <div className="w-full md:w-1/2 flex flex-col h-[450px]">
               <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full flex flex-col shadow-2xl overflow-hidden relative">
                   
                   {/* Background Tech Elements */}
                   <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                       <Cpu size={64} className="text-white" />
                   </div>

                   <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                       <Database className="text-blue-500" size={20} /> Audit Results
                   </h2>

                   {scanState !== 'RESULT' ? (
                       <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-50">
                           <FileSearch size={48} />
                           <p className="text-sm">Waiting for scan data...</p>
                       </div>
                   ) : (
                       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                           
                           {/* 1. Core Data */}
                           <div className="space-y-3">
                               <h4 className="text-xs font-bold text-gray-500 uppercase">Ledger Data</h4>
                               <div className="bg-black/40 rounded-lg p-4 border border-gray-800 space-y-2 font-mono text-sm">
                                   <div className="flex justify-between">
                                       <span className="text-gray-500">Asset</span>
                                       <span className="text-white">{scannedData?.data.tokenId}</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span className="text-gray-500">Amount</span>
                                       <span className="text-white">{scannedData?.data.amount} Tons</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span className="text-gray-500">Hash</span>
                                       <span className="text-blue-400 text-xs truncate w-32" title={scannedData?.data.txHash}>
                                           {scannedData?.data.txHash}
                                       </span>
                                   </div>
                               </div>
                           </div>

                           {/* 2. AI Analysis */}
                           <div className="space-y-3">
                               <div className="flex justify-between items-center">
                                   <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                       <Cpu size={12} /> Gemini AI Compliance Node
                                   </h4>
                                   {isAiAnalyzing && <span className="text-[10px] text-blue-400 animate-pulse">Analyzing...</span>}
                               </div>
                               
                               <div className="bg-gradient-to-br from-blue-900/10 to-purple-900/10 rounded-lg p-4 border border-blue-500/20 relative">
                                   {isAiAnalyzing ? (
                                       <div className="flex gap-2 items-center text-gray-400 text-sm">
                                           <Loader2 className="animate-spin w-4 h-4" /> Verifying against registry...
                                       </div>
                                   ) : aiReport ? (
                                       <div className="text-sm text-gray-300 leading-relaxed">
                                           <div dangerouslySetInnerHTML={{ __html: aiReport.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-300">$1</strong>') }} />
                                       </div>
                                   ) : (
                                       <p className="text-xs text-gray-500">AI Audit failed to initialize.</p>
                                   )}
                                   
                                   {/* Decorative corner */}
                                   <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500/30"></div>
                                   <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-blue-500/30"></div>
                               </div>
                           </div>

                       </div>
                   )}

                   {/* Footer Actions */}
                   {scanState === 'RESULT' && (
                       <div className="pt-4 mt-2 border-t border-gray-800 flex gap-3">
                           <button onClick={reset} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg text-sm transition-colors">
                               New Scan
                           </button>
                           <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                               <Share2 size={16} /> Export Report
                           </button>
                       </div>
                   )}
               </div>
           </div>

       </div>
    </div>
  );
};