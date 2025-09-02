"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const getAiResult = async (
  prompt: string,
  base64string: string,
  mimeType: string
) => {
  try {
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "file", data: base64string, mediaType: mimeType },
          ],
        },
      ],
    });
    
    // Return only serializable data
    return {
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
    };
  } catch (error) {
    console.error("AI generation error:", error);
    throw new Error("Failed to generate AI response");
  }
};