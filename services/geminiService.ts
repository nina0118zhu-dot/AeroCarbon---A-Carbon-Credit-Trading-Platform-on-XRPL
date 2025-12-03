import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: In a real production app, ensure API_KEY is set in environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeProject = async (
  projectContext: string,
  userQuery: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `You are an expert Carbon Credit Auditor and XRPL Blockchain Analyst. 
    You are assisting a user on the "XRPL CarbonConnect" platform.
    
    Your role is to:
    1. Analyze carbon project metadata for "Greenwashing" risks.
    2. Explain XRPL technical concepts (Trustlines, Tokenization, IOUs) simply.
    3. Verify if a project meets standards like Verra or Gold Standard based on the provided context.
    
    Context about the specific project being viewed:
    ${projectContext}
    
    Keep responses concise, professional, and data-driven. Use Markdown for formatting.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Low temperature for factual/analytical responses
      }
    });

    return response.text || "I could not generate an analysis at this time.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Audit Assistant Error: Unable to connect to the AI verification node. Please check your API key.";
  }
};

export const auditScanResult = async (scanData: any): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are an IoT Verification Node for the EcoLedger Blockchain.
    Input: JSON data scanned from a physical QR code on a Carbon Credit Certificate.
    Task: Verify the logical consistency of the data and provide a "Compliance Status" summary.
    
    Rules:
    - If status is 'ISSUED', confirm the asset is active.
    - If status is 'RETIRED', confirm it is burned and cannot be traded.
    - Check if the vintage looks reasonable (e.g. not in the future).
    - Provide a "Risk Score" (Low/Medium/High).
    
    Output Format: Short paragraph, bold key findings.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: `Scan Data: ${JSON.stringify(scanData)}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      }
    });

    return response.text || "AI Verification failed.";
  } catch (error) {
    return "AI Node Offline: Could not perform deep audit.";
  }
};