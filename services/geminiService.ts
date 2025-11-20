import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AuditResult, CoverData } from "../types";

// Constants for Model Names based on requirements
const MODEL_TEXT = 'gemini-2.5-flash';
const MODEL_IMAGE = 'gemini-2.5-flash-image'; 

// Helper to ensure API Key exists
const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is set.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates text content using Gemini 2.5 Flash
 */
export const generateStoryContent = async (prompt: string, context?: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const fullPrompt = context 
      ? `CONTEXT FROM PREVIOUS SCENES:\n${context}\n\nCURRENT TASK:\n${prompt}`
      : prompt;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: fullPrompt,
      config: {
        systemInstruction: "You are an expert children's book author and creative writing assistant. Write engaging, age-appropriate content.",
      }
    });
    return response.text || "No content generated.";
  } catch (error) {
    console.error("Error generating story:", error);
    throw error;
  }
};

/**
 * Audits content for repetition and consistency
 */
export const generateAuditReport = async (chapterText: string, metadata: { age: string, tone: string }): Promise<AuditResult> => {
  const ai = getAIClient();
  const prompt = `
    Analyze the following story chapter text for a target audience of ${metadata.age} with a ${metadata.tone} tone.
    
    TEXT TO ANALYZE:
    "${chapterText}"

    Return a valid JSON object (NO MARKDOWN FORMATTING) with the following structure:
    {
      "score": number (0-100 based on quality),
      "status": "pass" | "warning" | "fail",
      "repetitions": ["list", "of", "repetitive", "phrases"],
      "consistency": ["list", "of", "logic", "or", "character", "issues"],
      "suggestions": ["list", "of", "specific", "improvements"]
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as AuditResult;
  } catch (error) {
    console.error("Error auditing story:", error);
    // Return a fallback error result
    return {
      score: 0,
      status: 'fail',
      repetitions: [],
      consistency: ['AI Analysis failed'],
      suggestions: ['Please try again']
    };
  }
};

/**
 * Generates Book Cover concepts (titles, blurbs, image prompts)
 */
export const generateCoverIdeas = async (storyContext: string, metadata: { genre: string, audience: string }): Promise<CoverData> => {
  const ai = getAIClient();
  const prompt = `
    Based on the following story summary/context, generate book cover concepts.
    
    STORY CONTEXT:
    "${storyContext}"
    
    METADATA:
    Genre: ${metadata.genre}
    Audience: ${metadata.audience}
    
    Return a valid JSON object (NO MARKDOWN FORMATTING) with this structure:
    {
      "titles": ["Title Idea 1", "Title Idea 2", "Title Idea 3"],
      "subtitle": "A catchy subtitle",
      "tagline": "A short hook",
      "backCoverBlurb": "Engaging summary for the back cover",
      "frontCoverImagePrompt": "Detailed visual description for the front cover illustration (NanoBanana prompt)",
      "backCoverImagePrompt": "Detailed visual description for the back cover illustration"
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as CoverData;
  } catch (error) {
    console.error("Error generating cover ideas:", error);
    throw error;
  }
};

/**
 * Generates an image using Gemini 2.5 Flash Image (Nano Banana)
 */
export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: prompt,
    });

    // Iterate to find the image part
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

/**
 * Edits an existing image using text prompt via Gemini 2.5 Flash Image
 */
export const editImage = async (imageBase64: string, editInstruction: string): Promise<string> => {
  const ai = getAIClient();
  try {
    // Construct the multipart request: Image + Text Instruction
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: 'image/png', // Assuming PNG, usually safe for GenAI outputs
            },
          },
          {
            text: editInstruction,
          },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
              return part.inlineData.data;
          }
        }
      }
      throw new Error("No edited image data found in response");

  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};