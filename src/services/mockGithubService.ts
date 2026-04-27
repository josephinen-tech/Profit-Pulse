import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateMockCommits(projectName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 realistic GitHub commit messages for a project named "${projectName}". 
      The messages should sound technical and professional. 
      Return them as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return ["Initial commit", "Update README.md", "Fix minor bugs"];
    
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Error generating mock commits:", error);
    return [
      "Initial commit",
      "Setup project structure",
      "Implement core functionality",
      "Refactor for performance",
      "Finalize version 1.0"
    ];
  }
}
