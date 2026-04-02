import { ChatMessage, TextPart, ParsedContent, ImageDataPart, LinkPart } from '../types';

/**
 * Extracts displayable text from a ChatMessage's parts.
 * @param message The ChatMessage to process.
 * @returns A concatenated string of all text parts, and placeholder for images/links.
 */
export const getMessageDisplayContent = (message: ChatMessage): string => {
  const partsToDisplay = message.editedParts || message.parts;
  return partsToDisplay.map(part => {
    if ('text' in part) {
      return part.text;
    } else if ('inlineData' in part) { // ImageDataPart
      return `[Hình ảnh: ${part.inlineData.mimeType}]`;
    } else if ('link' in part) { // LinkPart
      const title = part.link.title || part.link.url;
      return `[${title}](${part.link.url})`; // Markdown format for display content
    }
    return ''; // Fallback for unexpected types
  }).join('\n');
};

/**
 * Parses a ChatMessage into structured content types.
 * @param message The ChatMessage to parse.
 * @returns An object containing separated text, images, and links.
 */
export const parseMessageContent = (message: ChatMessage): ParsedContent => {
  const parts = message.editedParts || message.parts;
  const result: ParsedContent = {
    text: '',
    images: [],
    links: [],
  };

  parts.forEach(part => {
    if ('text' in part) {
      result.text += (result.text ? '\n' : '') + part.text;
    } else if ('inlineData' in part) {
      result.images.push(part as ImageDataPart);
    } else if ('link' in part) {
      result.links.push(part as LinkPart);
    }
  });

  return result;
};
