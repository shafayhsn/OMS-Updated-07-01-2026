
import { GoogleGenAI } from "@google/genai";

export const askGemini = async (prompt: string, context?: string): Promise<string> => {
  try {
    // Initialize the client inside the function to ensure process.env is ready and prevent load-time crashes
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `You are Nizamia Intelligence, an expert AI assistant for a Garment Merchandising application.
    Your tone is professional, concise, and helpful.
    You have knowledge about fabric, trims, production cycles (knitting, dyeing, cutting, sewing, finishing), logistics, and costing.
    
    Context provided by the app: ${context || 'None'}
    `;

    const response = await ai.models.generateContent({
      // Fix: Use the recommended gemini-3-flash-preview model for basic text tasks
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
      }
    });
    
    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request. Please check your API Key configuration.";
  }
};

export const askGeminiSystem = async (prompt: string, systemInstruction: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      // Fix: Use the recommended gemini-3-flash-preview model for basic text tasks
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error (System):", error);
    return "Error processing request. Please try again.";
  }
};

export const generateCostingEstimate = async (details: string): Promise<string> => {
  const prompt = `Provide a detailed costing breakdown estimation for a garment with these details: ${details}.
  Include estimated fabric consumption, trim costs, CM (Cost of Making), and overheads. Output as a clean Markdown list.`;
  
  return askGemini(prompt);
};
