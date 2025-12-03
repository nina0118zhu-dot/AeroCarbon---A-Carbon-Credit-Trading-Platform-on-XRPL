

// Data Models based on the Carbon Credit Lifecycle

declare global {
  interface Window {
    xrpl: any;
  }
}

export enum VerificationStandard {
  VERRA = 'Verra VCS',
  GOLD_STANDARD = 'Gold Standard',
  GCC = 'GCC',
  ACR = 'American Carbon Registry'
}

export enum IssuerName {
  TOUCAN = 'Toucan Protocol',
  FLOWCARBON = 'Flowcarbon',
  KLIMA = 'KlimaDAO',
  MOSS = 'Moss.Earth',
  CELO = 'Celo Carbon'
}

// --- TOKEN LIFECYCLE STATES (State Machine) ---
export enum TokenState {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED', // On-chain but not active
  AUTHORIZED = 'AUTHORIZED', // Registry confirmed, tradeable
  SUSPENDED = 'SUSPENDED', // Frozen by registry
  LOCKED = 'LOCKED', // Reserved for retirement
  RETIRED = 'RETIRED', // Burned
  REVOKED = 'REVOKED' // Governance action
}

export interface Batch {
  batchId: string;
  projectId: string; // Links to CarbonProject
  tokenTicker: string;
  totalTons: number;
  issuedTons: number;
  state: TokenState;
  metadataCid: string; // IPFS CID
  mrvReports: string[]; // Links to docs
  created: Date;
  txHash?: string; // Chain Transaction Hash for PDF Proof
}

export interface CarbonProject {
  id: string;
  name: string;
  description: string;
  location: string;
  vintage: number;
  standard: VerificationStandard;
  issuer: IssuerName;
  issuerAddress: string; // XRPL Address of the issuer
  tokenTicker: string;
  pricePerTon: number;
  availableSupply: number;
  imageUrl: string;
  trustlineRequired: boolean;
}

export interface WalletPortfolioItem {
  ticker: string;
  amount: number;
  avgBuyPrice: number;
  currentValue: number;
}

export interface OpenOrder {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  remaining: number;
  timestamp: Date;
}

// --- PRE-AUTH SETTLEMENT ---
export interface PreAuthOrder {
  id: string;
  userId: string;
  ticker: string;
  side: 'BUY' | 'SELL';
  amount: number;
  limitPrice: number;
  expiry: Date;
  signature: string; // Delegated signature simulation
  status: 'ACTIVE' | 'FILLED' | 'REVOKED';
}

// --- RETIREMENT & PROOFS ---
export interface RetirementRecord {
  certificateId: string;
  txHash: string;
  batchId: string;
  holderAddress: string;
  amount: number;
  purpose: string;
  timestamp: Date;
  merkleRoot: string; // Anchor to Arweave/IPFS
  ipfsCid: string; // Link to PDF/JSON
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: string; // e.g., 'ISSUANCE', 'STATE_CHANGE', 'RETIREMENT'
  entityId: string; // BatchID or TxHash
  payloadHash: string; // Immutable chain hash
  description: string;
}

export interface WalletInfo {
  address: string;
  xrpBalance: number;
  assets: WalletPortfolioItem[];
  trustlines: string[];
  transactions: Transaction[];
  openOrders: OpenOrder[];
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL' | 'RETIRE' | 'TRUSTLINE_SET' | 'RECEIVE' | 'CANCEL_ORDER';
  ticker: string;
  amount?: number;
  price?: number;
  hash: string;
  timestamp: Date;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  memo?: any; // Parsed JSON memo
}

export interface Order {
  id: string;
  price: number;
  amount: number;
  total: number;
  type: 'buy' | 'sell';
}

export interface TokenizationRequest {
    id: string;
    requesterAddress: string;
    issuerName: IssuerName;
    projectName: string;
    vintage: string;
    amount: number;
    tokenTicker: string;
    documentsCid: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    timestamp: Date;
}

export type TabView = 'MARKETPLACE' | 'PORTFOLIO' | 'ISSUER_PORTAL' | 'COMPLIANCE' | 'AUDIT';
export type TradeMode = 'AMM_SWAP' | 'CLOB_EXCHANGE';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// --- PDF & QR Payload Types ---
export type QrType = 'MINT_CERT' | 'RETIREMENT_CERT';

export interface QrPayload {
  type: QrType;
  version: string;
  contract: 'XRPL';
  network: 'TESTNET';
  data: {
    tokenId: string; // Ticker
    batchId?: string;
    amount: number;
    txHash: string;
    timestamp: string;
    status: 'ISSUED' | 'RETIRED';
    meta?: any;
  }
}