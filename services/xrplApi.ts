

import { CarbonProject, WalletInfo, Transaction, VerificationStandard, IssuerName, Order, OpenOrder, TokenState, TokenizationRequest, QrPayload } from '../types';
import { mockBackend } from './mockBackend';

// MOCK DATA for static display when not connected or for demoing marketplace projects
// NOTE: All issuerAddress values must be valid Base58 (no 0, O, I, l)
const MOCK_PROJECTS: CarbonProject[] = [
  {
    id: '1',
    name: 'Amazonas Rainforest Conservation',
    description: 'REDD+ project avoiding unplanned deforestation in the Amazon basin.',
    location: 'Brazil',
    vintage: 2021,
    standard: VerificationStandard.VERRA,
    issuer: IssuerName.MOSS,
    issuerAddress: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe', // Valid
    tokenTicker: 'MCO2',
    pricePerTon: 14.50,
    availableSupply: 500000,
    imageUrl: 'https://picsum.photos/seed/rainforest/400/300',
    trustlineRequired: true
  },
  {
    id: '2',
    name: 'Gujarat Wind Power Project',
    description: 'Renewable energy generation via wind power in Gujarat, India.',
    location: 'India',
    vintage: 2022,
    standard: VerificationStandard.GOLD_STANDARD,
    issuer: IssuerName.TOUCAN,
    issuerAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', // Valid (Genesis)
    tokenTicker: 'TCO2',
    pricePerTon: 8.20,
    availableSupply: 120000,
    imageUrl: 'https://picsum.photos/seed/wind/400/300',
    trustlineRequired: true
  },
  {
    id: '3',
    name: 'Clean Cookstoves in Kenya',
    description: 'Renewable energy generation via wind power in Gujarat, India.',
    location: 'Kenya',
    vintage: 2023,
    standard: VerificationStandard.GOLD_STANDARD,
    issuer: IssuerName.FLOWCARBON,
    issuerAddress: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1', // Replaced invalid address
    tokenTicker: 'GNT',
    pricePerTon: 22.00,
    availableSupply: 50000,
    imageUrl: 'https://picsum.photos/seed/fire/400/300',
    trustlineRequired: true
  },
  {
    id: '4',
    name: 'Delta Blue Carbon Mangrove',
    description: 'Restoration of mangrove forests in the Indus Delta.',
    location: 'Pakistan',
    vintage: 2020,
    standard: VerificationStandard.VERRA,
    issuer: IssuerName.KLIMA,
    issuerAddress: 'rLHzPsX6oXkzU2qL12kHCH8G8cnZv1rBJh', // Replaced invalid address
    tokenTicker: 'BCT',
    pricePerTon: 35.00,
    availableSupply: 15000,
    imageUrl: 'https://picsum.photos/seed/water/400/300',
    trustlineRequired: true
  }
];

// Mock wallet for fallback
let mockWallet: WalletInfo = {
  address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  xrpBalance: 2450.00, 
  assets: [
      { ticker: 'MCO2', amount: 100, avgBuyPrice: 14.50, currentValue: 14.50 },
      { ticker: 'TCO2', amount: 50, avgBuyPrice: 8.20, currentValue: 8.20 }
  ],
  trustlines: ['MCO2', 'TCO2'],
  transactions: [],
  openOrders: []
};

// State for REAL connection
let realClient: any = null;
let realWallet: any = null; // Stores the xrpl.Wallet object

// NEW: Local simulation state for Real Mode to handle Testnet liquidity gaps
// This ensures user sees balance increase even if DEX offer doesn't fill immediately
const simulatedRealBalances: Record<string, number> = {};

// Initialize Mock Backend
mockBackend.initBatches(MOCK_PROJECTS);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create Standardized JSON Memo
const createJsonMemo = (data: any) => {
    return {
        type: 'application/json',
        data: JSON.stringify(data)
    };
};

// --- Currency Helpers ---
// Converts currency code to Hex if length != 3 (Required by XRPL)
const getCurrency = (ticker: string) => {
    if (ticker.length === 3) return ticker;
    // For tokens > 3 chars (e.g. MCO2), convert to 160-bit Hex
    if (window.xrpl) {
        return window.xrpl.convertStringToHex(ticker).padEnd(40, '0');
    }
    return ticker;
};

// Parses Hex currency back to string
const parseCurrency = (currency: string) => {
    if (currency.length === 40 && window.xrpl) {
        try {
            // Convert hex to string and remove null bytes
            const decoded = window.xrpl.convertHexToString(currency).replace(/\0/g, '');
            if(decoded) return decoded;
        } catch(e) {}
    }
    return currency;
}

export const xrplApi = {
  
  getProjects: async (): Promise<CarbonProject[]> => {
    await delay(600);
    // Combine static mocks with dynamic public projects from backend
    const publicDynamic = mockBackend.getPublicProjects();
    return [...MOCK_PROJECTS, ...publicDynamic];
  },

  // --- REAL WALLET CONNECTION METHODS ---

  connectRealWallet: async (seed: string): Promise<boolean> => {
    if (!window.xrpl) {
      console.error("XRPL library not loaded");
      return false;
    }
    try {
      if (!realClient) {
        realClient = new window.xrpl.Client('wss://s.altnet.rippletest.net:51233');
        await realClient.connect();
      }
      
      const wallet = window.xrpl.Wallet.fromSeed(seed);
      realWallet = wallet;
      console.log("Connected to Real Wallet:", wallet.address);
      return true;
    } catch (e) {
      console.error("Failed to connect real wallet", e);
      return false;
    }
  },

  generateFundedWallet: async (): Promise<{address: string, seed: string}> => {
    if (!window.xrpl) throw new Error("XRPL Lib missing");
    
    // Connect first if needed
    if (!realClient) {
        realClient = new window.xrpl.Client('wss://s.altnet.rippletest.net:51233');
        await realClient.connect();
    }

    // Use built-in Faucet funder
    const { wallet, balance } = await realClient.fundWallet();
    return {
        address: wallet.address,
        seed: wallet.seed
    };
  },

  enableMockMode: async () => {
      await xrplApi.disconnect(); // Clear any real connection
      console.log("Switched to Mock Mode");
      return true;
  },

  disconnect: async () => {
      if (realClient) {
          try {
              await realClient.disconnect();
          } catch(e) { console.error(e); }
      }
      realClient = null;
      realWallet = null;
      // Clear simulated balances
      Object.keys(simulatedRealBalances).forEach(key => delete simulatedRealBalances[key]);
  },

  getWalletInfo: async (): Promise<WalletInfo> => {
    // If real wallet is connected, fetch from Testnet
    if (realWallet && realClient) {
        try {
            // 1. Get XRP Balance
            const balanceResponse = await realClient.request({
                command: "account_info",
                account: realWallet.address,
                ledger_index: "validated"
            });
            const xrpBalance = parseFloat(window.xrpl.dropsToXrp(balanceResponse.result.account_data.Balance));

            // 2. Get Trustlines/Assets
            const linesResponse = await realClient.request({
                command: "account_lines",
                account: realWallet.address
            });
            
            // Map Trustlines to Portfolio Items
            const assets = linesResponse.result.lines.map((line: any) => {
                const ticker = parseCurrency(line.currency);
                const chainBalance = parseFloat(line.balance);
                // Combine Real Chain Balance + Simulated Balance (from demo trades)
                const simBalance = simulatedRealBalances[ticker] || 0;
                
                return {
                    ticker: ticker,
                    amount: chainBalance + simBalance, 
                    avgBuyPrice: 0, 
                    currentValue: 10 // Mock value
                };
            });

            // Ensure assets in simulated balances that might not have a trustline (edge case) or 0 balance line are included
            Object.keys(simulatedRealBalances).forEach(simTicker => {
                if (!assets.find((a: any) => a.ticker === simTicker)) {
                     assets.push({
                        ticker: simTicker,
                        amount: simulatedRealBalances[simTicker],
                        avgBuyPrice: 0,
                        currentValue: 10
                     });
                }
            });

            const trustlines = linesResponse.result.lines.map((line: any) => parseCurrency(line.currency));

            // 3. Transactions (Simplified fetch)
            const txResponse = await realClient.request({
                command: "account_tx",
                account: realWallet.address,
                limit: 10
            });
            
            const transactions = txResponse.result.transactions.map((txData: any) => {
                const tx = txData.tx;
                const isBuy = tx.Account === realWallet.address && tx.TransactionType === 'Payment'; 
                
                let ticker = 'XRP';
                let amount = 0;

                if (typeof tx.Amount === 'object') {
                    ticker = parseCurrency(tx.Amount.currency);
                    amount = parseFloat(tx.Amount.value);
                } else if (tx.Amount) {
                    amount = parseFloat(window.xrpl.dropsToXrp(tx.Amount));
                }

                // Handle TrustSet currency
                if (tx.TransactionType === 'TrustSet') {
                    ticker = parseCurrency(tx.LimitAmount.currency);
                    amount = parseFloat(tx.LimitAmount.value);
                }

                return {
                    id: tx.hash,
                    type: tx.TransactionType === 'TrustSet' ? 'TRUSTLINE_SET' : (isBuy ? 'SELL' : 'RECEIVE'), 
                    ticker: ticker,
                    amount: amount,
                    hash: tx.hash,
                    timestamp: new Date((tx.date + 946684800) * 1000), // Ripple Epoch
                    status: 'COMPLETED'
                };
            });

            return {
                address: realWallet.address,
                xrpBalance,
                assets: assets.filter((a: any) => a.amount > 0), // Filter out 0 balances unless simulated
                trustlines,
                transactions,
                openOrders: [] 
            };
        } catch (e) {
            console.error("Error fetching real wallet info", e);
            // Fallback to empty real wallet struct if fetch fails
            return {
                address: realWallet.address,
                xrpBalance: 0,
                assets: [],
                trustlines: [],
                transactions: [],
                openOrders: []
            };
        }
    }

    // Fallback to MOCK if no real wallet connected
    await delay(400);
    return { ...mockWallet };
  },

  getOrderBook: async (ticker: string): Promise<{ bids: Order[], asks: Order[] }> => {
    // For demo purposes, we still show mock orderbook unless we have a specific market on testnet
    await delay(500);
    const publicDynamic = mockBackend.getPublicProjects();
    const allProjects = [...MOCK_PROJECTS, ...publicDynamic];
    return generateMockOrders(allProjects.find(p => p.tokenTicker === ticker)?.pricePerTon || 10);
  },

  setTrustline: async (ticker: string): Promise<boolean> => {
    // REAL MODE
    if (realWallet && realClient) {
        try {
            // Find issuer from mock data
            const publicDynamic = mockBackend.getPublicProjects();
            const allProjects = [...MOCK_PROJECTS, ...publicDynamic];
            const project = allProjects.find(p => p.tokenTicker === ticker);
            if (!project) throw new Error("Unknown Token Issuer");

            const currencyHex = getCurrency(ticker);

            const trustSet = {
                TransactionType: "TrustSet",
                Account: realWallet.address,
                LimitAmount: {
                    currency: currencyHex,
                    issuer: project.issuerAddress, 
                    value: "1000000000"
                }
            };
            
            // Auto-fill and Sign
            const tsPrepared = await realClient.autofill(trustSet);
            const signed = realWallet.sign(tsPrepared);
            const result = await realClient.submitAndWait(signed.tx_blob);
            
            if (result.result.meta.TransactionResult === "tesSUCCESS") {
                return true;
            } else {
                throw new Error("Tx Failed: " + result.result.meta.TransactionResult);
            }
        } catch (e: any) {
            console.error("Real trustline failed", e);
            throw e; // Rethrow to show in UI
        }
    }

    // MOCK MODE
    await delay(1500); 
    if (!mockWallet.trustlines.includes(ticker)) {
      mockWallet.trustlines = [...mockWallet.trustlines, ticker];
      
      const memo = createJsonMemo({ action: "TRUST_SET", ticker });

      mockWallet.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: 'TRUSTLINE_SET',
        ticker: ticker,
        hash: Math.random().toString(36).substring(7).toUpperCase(),
        timestamp: new Date(),
        status: 'COMPLETED',
        memo
      });
      mockWallet.xrpBalance -= 0.000012; 
      
      mockBackend.logEvent('TRUSTLINE', mockWallet.address, `Trustline established for ${ticker}`);
      
      return true;
    }
    return false;
  },

  saveDraftProject: async (
      ticker: string, 
      totalTons: number, 
      metadataCid: string, 
      projectName: string, 
      vintage: string
  ) => {
      await delay(1000);
      const newProject: CarbonProject = {
            id: `draft-${Date.now()}`,
            name: projectName,
            description: `Draft Project (Vintage: ${vintage})`,
            location: 'Global',
            vintage: parseInt(vintage || '2024'),
            standard: VerificationStandard.VERRA,
            issuer: IssuerName.CELO,
            issuerAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
            tokenTicker: ticker,
            pricePerTon: 10.00,
            availableSupply: totalTons,
            imageUrl: 'https://picsum.photos/seed/draft/400/300',
            trustlineRequired: true
      };
      // Save to backend as DRAFT
      await mockBackend.saveProject(newProject, TokenState.DRAFT);
      return true;
  },

  issueBatchOnChain: async (ticker: string, totalTons: number, metadataCid: string, projectName?: string, vintage?: string) => {
    await delay(2000);
    const txHash = Math.random().toString(36).substring(7).toUpperCase();
    
    // Add to Dynamic Projects List for Marketplace visibility (State: ISSUED)
    let finalProject = null;

    if (projectName) {
        const newProject: CarbonProject = {
            id: `dyn-${Date.now()}`,
            name: projectName,
            description: `Minted via Issuer Portal. Vintage: ${vintage}`,
            location: 'Global',
            vintage: parseInt(vintage || '2024'),
            standard: VerificationStandard.VERRA,
            issuer: IssuerName.CELO, // Defaulting for demo
            issuerAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', // Using Genesis for demo validity
            tokenTicker: ticker,
            pricePerTon: 10.00,
            availableSupply: totalTons,
            imageUrl: 'https://picsum.photos/seed/new/400/300',
            trustlineRequired: true
        };
        
        await mockBackend.saveProject(newProject, TokenState.ISSUED);
        finalProject = newProject;
    } else {
        // Legacy call support (just updates batch)
        await mockBackend.createBatch({
            tokenTicker: ticker,
            totalTons: totalTons,
            metadataCid: metadataCid,
            batchId: `${ticker}-${vintage || 'GEN'}-A`,
            state: TokenState.ISSUED
        });
    }

    return { txHash, project: finalProject };
  },

  cancelOrder: async (orderId: string): Promise<boolean> => {
    await delay(1000);
    const index = mockWallet.openOrders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      const order = mockWallet.openOrders[index];
      if (order.type === 'BUY') mockWallet.xrpBalance += (order.remaining * order.price);
      else {
        const asset = mockWallet.assets.find(a => a.ticker === order.ticker);
        if (asset) asset.amount += order.remaining;
      }
      mockWallet.openOrders.splice(index, 1);
      return true;
    }
    return false;
  },

  /**
   * Retire Tokens (Burn)
   */
  retireToken: async (ticker: string, amount: number, purpose: string) => {
    
    // REAL MODE
    if (realWallet && realClient) {
        // Send to Blackhole address
        const BLACKHOLE = "rrrrrrrrrrrrrrrrrrrrrhoLvTp";
        const publicDynamic = mockBackend.getPublicProjects();
        const allProjects = [...MOCK_PROJECTS, ...publicDynamic];
        const project = allProjects.find(p => p.tokenTicker === ticker);
        if (!project) throw new Error("Unknown Token");

        // Check if we are retiring "Simulated" tokens (tokens bought in demo but not on chain)
        const simBalance = simulatedRealBalances[ticker] || 0;
        
        // If we have enough Simulated balance, we "Burn" that first (without on-chain tx if real balance is 0)
        // This is a Demo-specific concession to allow the full flow
        if (simBalance >= amount) {
            simulatedRealBalances[ticker] -= amount;
            // Generate a mock certificate anchored to a fake tx
            const txHash = "SIMULATED_BURN_" + Math.random().toString(36).substring(7).toUpperCase();
             const certificate = await mockBackend.anchorRetirement(
                txHash, 
                `${ticker}-REAL`, 
                amount, 
                realWallet.address, 
                purpose
            );
            return certificate;
        }

        // If not simulated, try Real On-Chain Burn
        const currencyHex = getCurrency(ticker);

        const payment = {
            TransactionType: "Payment",
            Account: realWallet.address,
            Destination: BLACKHOLE,
            Amount: {
                currency: currencyHex,
                value: amount.toString(),
                issuer: project.issuerAddress 
            },
            Memos: [
                {
                    Memo: {
                        MemoType: window.xrpl.convertStringToHex("CarbonRetirement"),
                        MemoData: window.xrpl.convertStringToHex(purpose)
                    }
                }
            ]
        };

        const prepared = await realClient.autofill(payment);
        const signed = realWallet.sign(prepared);
        const result = await realClient.submitAndWait(signed.tx_blob);

        if (result.result.meta.TransactionResult !== "tesSUCCESS") {
            throw new Error("Retirement TX Failed: " + result.result.meta.TransactionResult);
        }

        const txHash = result.result.hash;
        // Anchor to mock backend for certificate generation
        const certificate = await mockBackend.anchorRetirement(
            txHash, 
            `${ticker}-REAL`, 
            amount, 
            realWallet.address, 
            purpose
        );
        return certificate;
    }

    // MOCK MODE
    await delay(2000);
    const assetIdx = mockWallet.assets.findIndex(a => a.ticker === ticker);
    if (assetIdx === -1 || mockWallet.assets[assetIdx].amount < amount) {
        throw new Error("Insufficient balance to retire");
    }

    mockWallet.assets[assetIdx].amount -= amount;
    if (mockWallet.assets[assetIdx].amount <= 0) mockWallet.assets.splice(assetIdx, 1);

    const txHash = Math.random().toString(36).substring(7).toUpperCase();
    const batchId = `${ticker}-2024-A`; 

    const memoData = {
        action: "RETIRE",
        batch_id: batchId,
        amount: amount,
        purpose: purpose,
        request_id: `req-${Date.now()}`
    };
    
    const memo = createJsonMemo(memoData);

    mockWallet.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: 'RETIRE',
        ticker,
        amount,
        hash: txHash,
        timestamp: new Date(),
        status: 'COMPLETED',
        memo
    });

    const certificate = await mockBackend.anchorRetirement(
        txHash, 
        batchId, 
        amount, 
        mockWallet.address, 
        purpose
    );

    return certificate;
  },

  executeTrade: async (
    ticker: string, 
    type: 'BUY' | 'SELL', 
    amount: number, 
    price: number,
    orderType: 'market' | 'limit' = 'market'
  ) => {
    // REAL MODE 
    if (realWallet && realClient) {
        const publicDynamic = mockBackend.getPublicProjects();
        const allProjects = [...MOCK_PROJECTS, ...publicDynamic];
        const project = allProjects.find(p => p.tokenTicker === ticker);
        if(!project) throw new Error("Unknown token");
        
        const currencyHex = getCurrency(ticker);
        const tokenAmount = { currency: currencyHex, issuer: project.issuerAddress, value: amount.toString() };
        const xrpAmount = window.xrpl.xrpToDrops(amount * price);

        const offer = {
            TransactionType: "OfferCreate",
            Account: realWallet.address,
            TakerPays: type === 'BUY' ? tokenAmount : xrpAmount,
            TakerGets: type === 'BUY' ? xrpAmount : tokenAmount
        };

        try {
            const prepared = await realClient.autofill(offer);
            const signed = realWallet.sign(prepared);
            const result = await realClient.submitAndWait(signed.tx_blob);
            
            if (result.result.meta.TransactionResult === "tesSUCCESS") {
                 
                 // DEMO FIX: Since Testnet DEX has low liquidity, we simulate a successful fill
                 // so the user can proceed to 'Retire' step in the flow.
                 if (type === 'BUY') {
                     simulatedRealBalances[ticker] = (simulatedRealBalances[ticker] || 0) + amount;
                 } else if (type === 'SELL') {
                     if (simulatedRealBalances[ticker] >= amount) {
                         simulatedRealBalances[ticker] -= amount;
                     }
                 }

                 return {
                    id: result.result.hash,
                    hash: result.result.hash,
                    type,
                    ticker,
                    amount,
                    price,
                    timestamp: new Date(),
                    status: 'COMPLETED'
                 };
            } else {
                 throw new Error(result.result.meta.TransactionResult);
            }
        } catch (e: any) {
            throw new Error("Trade Failed (likely no liquidity on Testnet): " + e.message);
        }
    }

    await delay(1000); 

    // --- MARKET SWAP (AMM) MOCK ---
    if (type === 'BUY') {
      const cost = amount * price;
      if (mockWallet.xrpBalance < cost) throw new Error('Insufficient XRP');
      mockWallet.xrpBalance -= cost;
      
      const asset = mockWallet.assets.find(a => a.ticker === ticker);
      if (asset) asset.amount += amount;
      else mockWallet.assets.push({ ticker, amount, avgBuyPrice: price, currentValue: price });
    } else {
      const assetIdx = mockWallet.assets.findIndex(a => a.ticker === ticker);
      if (assetIdx === -1 || mockWallet.assets[assetIdx].amount < amount) throw new Error('Insufficient funds');
      mockWallet.assets[assetIdx].amount -= amount;
      if (mockWallet.assets[assetIdx].amount <= 0) mockWallet.assets.splice(assetIdx, 1);
      mockWallet.xrpBalance += (amount * price);
    }

    const memo = createJsonMemo({ action: "SWAP", ticker, type, amount, price });

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      type: type,
      ticker: ticker,
      amount: amount,
      price: price,
      hash: Math.random().toString(36).substring(7).toUpperCase(),
      timestamp: new Date(),
      status: 'COMPLETED',
      memo
    };
    
    mockWallet.transactions.unshift(tx);
    return tx;
  },

  // --- TOKENIZATION API ---
  submitTokenizationRequest: async (
      requesterAddress: string,
      issuerName: IssuerName,
      projectName: string,
      vintage: string,
      amount: number,
      tokenTicker: string,
      documentsCid: string
  ): Promise<TokenizationRequest> => {
      await delay(1500);
      const req: TokenizationRequest = {
          id: `REQ-${Date.now()}`,
          requesterAddress,
          issuerName,
          projectName,
          vintage,
          amount,
          tokenTicker,
          documentsCid,
          status: 'PENDING',
          timestamp: new Date()
      };
      return await mockBackend.saveTokenizationRequest(req);
  },

  getTokenizationRequests: async (address: string): Promise<TokenizationRequest[]> => {
      await delay(500);
      return mockBackend.getTokenizationRequests(address);
  },

  // New: For Issuer Portal to see all
  getAllTokenizationRequests: async (): Promise<TokenizationRequest[]> => {
      await delay(500);
      return mockBackend.getAllTokenizationRequests();
  },

  approveTokenizationRequest: async (requestId: string): Promise<boolean> => {
      await delay(2000); // Simulate processing
      
      const req = await mockBackend.approveRequest(requestId);
      
      // 1. Trigger Issuance (Creates Project)
      await xrplApi.issueBatchOnChain(
          req.tokenTicker, 
          req.amount, 
          req.documentsCid, 
          req.projectName, 
          req.vintage
      );

      // 2. Simulate Deposit (Credit User Balance)
      if (realWallet && realClient) {
          simulatedRealBalances[req.tokenTicker] = (simulatedRealBalances[req.tokenTicker] || 0) + req.amount;
      } else {
          // Mock Mode
          const asset = mockWallet.assets.find(a => a.ticker === req.tokenTicker);
          if (asset) {
              asset.amount += req.amount;
          } else {
              mockWallet.assets.push({
                  ticker: req.tokenTicker,
                  amount: req.amount,
                  avgBuyPrice: 0,
                  currentValue: 10
              });
          }
          
          mockWallet.transactions.unshift({
              id: `tx-mint-${Date.now()}`,
              type: 'RECEIVE',
              ticker: req.tokenTicker,
              amount: req.amount,
              hash: Math.random().toString(36).substring(7).toUpperCase(),
              timestamp: new Date(),
              status: 'COMPLETED',
              memo: createJsonMemo({ action: "MINT_DEPOSIT", requestId })
          });
      }
      return true;
  },

  // --- IOT SCANNER VERIFICATION ---
  verifyQrData: async (data: QrPayload) => {
      await delay(800);
      if (data.contract !== 'XRPL') throw new Error("Invalid Certificate Chain");
      
      const publicDynamic = mockBackend.getPublicProjects();
      const allProjects = [...MOCK_PROJECTS, ...publicDynamic];
      const project = allProjects.find(p => p.tokenTicker === data.data.tokenId);

      if (!project) return { valid: false, message: 'Project/Asset not found on Ledger' };

      // Simplified Check: In reality, check XRPL tx status
      return {
          valid: true,
          status: data.data.status, // MINTED or RETIRED
          project: project,
          tx: data.data.txHash,
          amount: data.data.amount
      };
  }
};

const generateMockOrders = (basePrice: number) => {
  const orders = { bids: [], asks: [] };
  // ... (keeping existing mock implementation if needed, though this function was not fully provided in original snippet, assuming it exists or not needed for this change)
  // Re-implementing basic generator for safety since it was referenced
  const spread = basePrice * 0.05;
  const bids: Order[] = [];
  const asks: Order[] = [];
  
  for(let i=0; i<8; i++) {
      const p = basePrice - spread - (i * (basePrice * 0.01));
      bids.push({ id: `b-${i}`, price: p, amount: Math.floor(Math.random() * 500) + 50, total: 0, type: 'buy' });
  }
  for(let i=0; i<8; i++) {
      const p = basePrice + spread + (i * (basePrice * 0.01));
      asks.push({ id: `a-${i}`, price: p, amount: Math.floor(Math.random() * 500) + 50, total: 0, type: 'sell' });
  }
  return { bids, asks };
}
