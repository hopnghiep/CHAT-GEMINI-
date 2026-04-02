import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatMessage, ChatNameResponse, ContentPart, TextPart } from "../types";
import { DEFAULT_MODEL } from "../constants";

// Helper function to initialize GoogleGenAI.
const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is not set. Please provide it in your environment.");
    throw new Error("Gemini API Key is not configured.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert our internal ContentPart[] to Gemini's expected format
const toGeminiContentParts = (parts: ContentPart[]) => {
  return parts.map(part => {
    if ('text' in part) {
      return { text: part.text };
    } else if ('inlineData' in part) { // ImageDataPart
      return { inlineData: part.inlineData };
    } else if ('link' in part) { // LinkPart: convert to markdown text for Gemini
      const title = part.link.title || part.link.url;
      return { text: `[${title}](${part.link.url})` };
    }
    // Fallback for any other unexpected part types
    return { text: '' };
  });
};

// ============================================================================
// Text-based Chat Functions
// ============================================================================

export async function sendMessageToGemini(
  chatHistory: ChatMessage[],
  newMessageParts: ContentPart[],
  onStreamChunk: (chunk: string) => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const ai = getGeminiClient();

    // Transform chat history for the API
    const contents = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: toGeminiContentParts(msg.editedParts || msg.parts),
    }));

    const fullHistoryWithNewMessage = [...contents, {
      role: 'user',
      parts: toGeminiContentParts(newMessageParts),
    }];

    const responseStream = await ai.models.generateContentStream({
      model: DEFAULT_MODEL,
      contents: fullHistoryWithNewMessage,
    });

    for await (const chunk of responseStream) {
      onStreamChunk(chunk.text);
    }

  } catch (error: any) {
    console.error("Gemini API error:", error);
    onError(`Failed to get response from Gemini: ${error.message || "Unknown error."}`);
  }
}

export async function generateChatName(userFirstMessageParts: ContentPart[]): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    // For chat naming, we only need the text part of the first message.
    // Concatenate all text parts if multiple, ignore image/link parts for naming.
    const userTextContent = userFirstMessageParts
      .filter((part): part is TextPart => 'text' in part)
      .map(part => part.text)
      .join(' ');

    if (!userTextContent.trim()) {
      return null; // Cannot generate name without text content
    }

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      config: {
        systemInstruction: `Bạn là một trợ lý hữu ích tạo ra các tên trò chuyện ngắn gọn, mô tả dựa trên tin nhắn đầu tiên của người dùng. Tên phải tối đa 5 từ, không có bất kỳ dấu chấm câu nào. Đầu ra phải là JSON hợp lệ với một khóa 'chatName' chứa tên đã tạo.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chatName: {
              type: Type.STRING,
              description: 'Tên ngắn gọn cho cuộc trò chuyện.',
            },
          },
          propertyOrdering: ["chatName"],
        },
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Đây là tin nhắn đầu tiên từ người dùng: "${userTextContent}"` }]
      }],
    });

    let jsonStr = response.text.trim();
    // Attempt to extract JSON from markdown if present. Models sometimes wrap JSON in markdown.
    const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }
    
    if (!jsonStr) {
      console.warn("Gemini trả về phản hồi rỗng khi đặt tên cuộc trò chuyện sau khi cắt và trích xuất markdown.");
      return null;
    }

    const chatNameResponse: ChatNameResponse = JSON.parse(jsonStr);
    return chatNameResponse.chatName;

  } catch (error: any) {
    console.error("Lỗi khi tạo tên trò chuyện với Gemini API:", error);
    return null;
  }
}

// ============================================================================
// Text-to-Speech Functions
// ============================================================================

export async function generateSpeech(text: string, voiceName: string = 'Kore', speakingRate: number = 1.0): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    
    // Sanitize text for SSML by escaping special characters.
    // This prevents user input from breaking the XML structure.
    const sanitizedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Use SSML (Speech Synthesis Markup Language) to control the speaking rate.
    const ssmlText = `<speak><prosody rate="${speakingRate}">${sanitizedText}</prosody></speak>`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: ssmlText }] }], // Pass the SSML-formatted text
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            // The `speakingRate` parameter is not valid here. It's now controlled via SSML.
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error: any) {
    console.error("Lỗi khi tạo giọng nói với Gemini TTS API:", error);
    // Explicitly check for quota error and provide a more specific message
    if (error.message && error.message.includes("You exceeded your current quota")) {
        throw new Error("API Key của bạn đã vượt quá hạn mức sử dụng cho tính năng chuyển văn bản thành giọng nói. Vui lòng kiểm tra chi tiết gói và thanh toán của bạn.");
    }
    throw error; // Re-throw other errors
  }
}