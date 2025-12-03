

import { Batch, TokenState, AuditLogEntry, RetirementRecord, PreAuthOrder, CarbonProject, TokenizationRequest } from '../types';

/**
 * MOCK BACKEND SERVICE
 * 
 * Simulates the microservices described in the architecture:
 * 1. Issuer Service (Batch/State mgmt)
 * 2. Audit/Compliance Service (Log hash chaining)
 * 3. Retirement Service (Merkle Anchoring)
 * 4. Settlement Engine (Pre-Auth Order holding)
 * 5. IPFS Storage Service
 */

// --- IN-MEMORY DB SIMULATION ---
let batches: Batch[] = [];
// Store full project metadata here for dynamic creations
let dynamicProjects: { project: CarbonProject; state: TokenState }[] = []; 

let auditLog: AuditLogEntry[] = [];
let retirements: RetirementRecord[] = [];
let preAuthOrders: PreAuthOrder[] = [];
let tokenizationRequests: TokenizationRequest[] = [];

// Helper to create a fake hash
const sha256 = async (msg: string) => {
    const msgBuffer = new TextEncoder().encode(msg);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const mockBackend = {
    // --- 0. IPFS STORAGE SERVICE ---
    
    uploadToIPFS: async (data: any): Promise<string> => {
        // Simulate upload latency
        await new Promise(resolve => setTimeout(resolve, 1500));
        const content = JSON.stringify(data);
        const hash = await sha256(content + Date.now().toString());
        return `Qm${hash.substring(0, 44)}`; // Simulate CID format
    },

    // --- 1. ISSUER SERVICE / REGISTRY SYNC ---
    
    // Initialize mock batches based on the projects config
    initBatches: (projects: CarbonProject[]) => {
        if (batches.length > 0) return; // Already init
        batches = projects.map(p => ({
            batchId: `${p.tokenTicker}-2024-A`,
            projectId: p.id,
            tokenTicker: p.tokenTicker,
            totalTons: p.availableSupply,
            issuedTons: 0,
            state: TokenState.AUTHORIZED, // Start in AUTHORIZED for demo cleanliness
            metadataCid: `QmMockHash${p.id}`,
            mrvReports: [`https://registry.verra.org/${p.id}/report.pdf`],
            created: new Date(),
            txHash: 'E5C38' + Math.random().toString(36).substring(2, 12).toUpperCase() + '...' // Fake Initial Hash
        }));
    },

    getBatches: () => [...batches],

    // Prevent Double Issuance Check
    checkDuplication: async (ticker: string, vintage: string): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate DB Query
        // Check if a batch with same ticker and vintage exists
        const exists = batches.some(b => 
            b.tokenTicker === ticker || 
            (b.batchId.includes(vintage) && b.tokenTicker === ticker)
        );
        return exists;
    },

    createBatch: async (batchData: Partial<Batch>) => {
        const newBatch: Batch = {
            batchId: batchData.batchId || `NEW-${Date.now()}`,
            projectId: batchData.projectId || 'proj-new',
            tokenTicker: batchData.tokenTicker || 'TKN',
            totalTons: batchData.totalTons || 0,
            issuedTons: 0,
            state: batchData.state || TokenState.ISSUED, // Default to ISSUED if not specified
            metadataCid: batchData.metadataCid || '',
            mrvReports: [],
            created: new Date(),
            txHash: batchData.txHash || ('MINT-' + Math.random().toString(36).substring(2, 15).toUpperCase())
        };
        batches.unshift(newBatch);
        await mockBackend.logEvent('ISSUANCE', newBatch.batchId, `Created new batch ${newBatch.batchId} [${newBatch.state}]`);
        return newBatch;
    },

    // New: Store Dynamic Project Metadata
    saveProject: async (project: CarbonProject, state: TokenState) => {
        // Check if exists, update if so
        const idx = dynamicProjects.findIndex(p => p.project.id === project.id);
        if (idx >= 0) {
            dynamicProjects[idx] = { project, state };
        } else {
            dynamicProjects.push({ project, state });
        }
        
        // Also ensure a batch exists for it
        const batchExists = batches.find(b => b.tokenTicker === project.tokenTicker);
        if (!batchExists) {
            await mockBackend.createBatch({
                tokenTicker: project.tokenTicker,
                totalTons: project.availableSupply,
                state: state,
                metadataCid: `CID-${project.id}`,
                projectId: project.id
            });
        } else {
            // Update existing batch state
            batchExists.state = state;
        }
    },

    // New: Get only projects that are NOT drafts (for Marketplace)
    getPublicProjects: () => {
        return dynamicProjects
            .filter(item => item.state !== TokenState.DRAFT)
            .map(item => item.project);
    },

    updateBatchState: async (batchId: string, newState: TokenState, reason: string) => {
        const batch = batches.find(b => b.batchId === batchId);
        if (!batch) throw new Error("Batch not found");
        
        const oldState = batch.state;
        batch.state = newState;
        
        // Also update the project state in dynamicProjects if applicable
        const dynProj = dynamicProjects.find(dp => dp.project.tokenTicker === batch.tokenTicker);
        if (dynProj) {
            dynProj.state = newState;
        }

        // Log to Audit Chain
        await mockBackend.logEvent('STATE_CHANGE', batchId, `Batch ${batchId} moved from ${oldState} to ${newState}. Reason: ${reason}`);
        
        return batch;
    },

    // --- 2. AUDIT / COMPLIANCE SERVICE ---
    
    logEvent: async (eventType: string, entityId: string, description: string) => {
        const prevHash = auditLog.length > 0 ? auditLog[0].payloadHash : 'GENESIS_HASH';
        const payload = JSON.stringify({ eventType, entityId, description, prevHash, ts: new Date().toISOString() });
        const newHash = await sha256(payload);

        const entry: AuditLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date(),
            eventType,
            entityId,
            payloadHash: newHash, // Immutable link
            description
        };
        
        auditLog.unshift(entry); // Newest first
    },

    getAuditLog: () => [...auditLog],

    getRetirements: () => [...retirements],

    // --- 3. RETIREMENT SERVICE (MERKLE ANCHORING) ---
    
    anchorRetirement: async (txHash: string, batchId: string, amount: number, holder: string, purpose: string) => {
        // 1. Generate fake Certificate ID
        const certId = `CERT-${Date.now().toString().slice(-6)}`;
        
        // 2. Simulate Merkle Tree Generation
        // In a real app, we'd take all pending retirements, hash them into a tree.
        // Here we just hash the individual record to simulate a "Leaf".
        const leafData = `${txHash}:${batchId}:${amount}:${holder}`;
        const merkleRoot = `ar://${await sha256(leafData)}`; // Simulate Arweave link

        const record: RetirementRecord = {
            certificateId: certId,
            txHash,
            batchId,
            holderAddress: holder,
            amount,
            purpose,
            timestamp: new Date(),
            merkleRoot,
            ipfsCid: `ipfs://${await sha256(certId)}` // Fake IPFS link
        };

        retirements.unshift(record);
        await mockBackend.logEvent('RETIREMENT_ANCHORED', certId, `Retirement of ${amount} tons anchored to Arweave. Root: ${merkleRoot.substring(0,10)}...`);
        
        return record;
    },

    // --- 4. SETTLEMENT ENGINE (PRE-AUTH) ---

    submitPreAuth: async (order: Omit<PreAuthOrder, 'id' | 'status'>) => {
        const newOrder: PreAuthOrder = {
            ...order,
            id: `preauth-${Date.now()}`,
            status: 'ACTIVE'
        };
        preAuthOrders.push(newOrder);
        
        await mockBackend.logEvent('PREAUTH_RECEIVED', newOrder.id, `Received delegated auth for ${order.side} ${order.amount} ${order.ticker}`);
        
        // Simulate "Matching Engine" picking it up after 3 seconds
        setTimeout(() => {
            mockBackend.fillPreAuth(newOrder.id);
        }, 3000);

        return newOrder;
    },

    fillPreAuth: async (id: string) => {
        const idx = preAuthOrders.findIndex(o => o.id === id);
        if (idx === -1) return;
        
        preAuthOrders[idx].status = 'FILLED';
        await mockBackend.logEvent('SETTLEMENT_EXECUTED', id, `Pre-Auth Order ${id} successfully settled on XRPL via Settlement Service.`);
    },

    // --- 5. TOKENIZATION REQUESTS ---

    saveTokenizationRequest: async (req: TokenizationRequest) => {
        tokenizationRequests.push(req);
        await mockBackend.logEvent('TOKEN_REQUEST', req.id, `Received tokenization request for ${req.amount} ${req.tokenTicker} from ${req.requesterAddress}`);
        return req;
    },

    getTokenizationRequests: (address: string) => {
        return tokenizationRequests.filter(req => req.requesterAddress === address);
    },

    // New: Issuer needs to see ALL requests
    getAllTokenizationRequests: () => {
        return [...tokenizationRequests];
    },

    approveRequest: async (requestId: string) => {
        const reqIndex = tokenizationRequests.findIndex(r => r.id === requestId);
        if (reqIndex === -1) throw new Error("Request not found");
        
        tokenizationRequests[reqIndex].status = 'APPROVED';
        const req = tokenizationRequests[reqIndex];
        
        await mockBackend.logEvent('TOKEN_APPROVED', req.id, `Issuer ${req.issuerName} approved tokenization. Ready for minting.`);
        return req;
    }
};