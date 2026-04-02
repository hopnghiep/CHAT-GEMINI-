import { ChatSession } from '../types';
import jsPDF from 'jspdf';
import { getMessageDisplayContent } from './messageUtils'; // Import the new utility

// Helper function to trigger file download
const downloadFile = (filename: string, content: BlobPart, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exports a chat session to a plain text file.
 * @param chat The ChatSession object to export.
 */
export const exportToPlainText = (chat: ChatSession): void => {
  let textContent = `Chat Title: ${chat.name}\n`;
  textContent += `Created At: ${new Date(chat.createdAt).toLocaleString()}\n`;
  textContent += `Updated At: ${new Date(chat.updatedAt).toLocaleString()}\n\n`;
  textContent += '--- Chat History ---\n\n';

  chat.messages.forEach((message) => {
    const role = message.role === 'user' ? 'Người dùng' : 'Gemini';
    const content = getMessageDisplayContent(message); // Use helper function
    const timestamp = new Date(message.timestamp).toLocaleString();
    textContent += `${role} (${timestamp}):\n${content}\n\n`;
  });

  downloadFile(`${chat.name.replace(/\s/g, '_')}.txt`, textContent, 'text/plain');
};

/**
 * Exports a chat session to a JSON file.
 * @param chat The ChatSession object to export.
 */
export const exportToJson = (chat: ChatSession): void => {
  const jsonContent = JSON.stringify(chat, null, 2); // Pretty-print JSON
  downloadFile(`${chat.name.replace(/\s/g, '_')}.json`, jsonContent, 'application/json');
};

/**
 * Exports a chat session to a PDF file.
 * Requires jspdf library.
 * @param chat The ChatSession object to export.
 */
export const exportToPdf = (chat: ChatSession): void => {
  const doc = new jsPDF();
  let y = 10; // Initial Y position

  doc.setFontSize(18);
  doc.text(`Tiêu đề Chat: ${chat.name}`, 10, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Tạo lúc: ${new Date(chat.createdAt).toLocaleString()}`, 10, y);
  y += 7;
  doc.text(`Cập nhật lúc: ${new Date(chat.updatedAt).toLocaleString()}`, 10, y);
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('--- Lịch sử Chat ---', 10, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(0); // Reset text color

  chat.messages.forEach((message) => {
    const role = message.role === 'user' ? 'Người dùng' : 'Gemini';
    const partsToDisplay = message.editedParts || message.parts;

    // Check if new page is needed for the header
    if (y + 20 > doc.internal.pageSize.height - 10) {
      doc.addPage();
      y = 10; // Reset Y for new page
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`${role}:`, 10, y);
    y += 5; // Space after role

    partsToDisplay.forEach((part) => {
      // Check if new page is needed for the part content
      if (y + 15 > doc.internal.pageSize.height - 10) { // Estimate height needed for text/image/link
        doc.addPage();
        y = 10; // Reset Y for new page
      }

      if ('text' in part) {
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(part.text, doc.internal.pageSize.width - 20); // 20mm padding
        doc.text(lines, 20, y); // Indent content a bit
        y += (lines.length * 5) + 2; // Adjust Y based on lines of text
      } else if ('inlineData' in part) { // ImageDataPart
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text(`[Hình ảnh: ${part.inlineData.mimeType}]`, 20, y);
        y += 10;
        doc.setTextColor(0); // Reset color
        doc.setFont('helvetica', 'normal');
      } else if ('link' in part) { // LinkPart
        doc.setFont('helvetica', 'normal');
        const linkText = `${part.link.title || 'Link'}: ${part.link.url}`;
        const lines = doc.splitTextToSize(linkText, doc.internal.pageSize.width - 20);
        doc.text(lines, 20, y);
        y += (lines.length * 5) + 2;
        doc.setTextColor(0); // Reset color
      }
    });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`(${new Date(message.timestamp).toLocaleString()})`, 20, y); // Timestamp below content
    y += 10; // Space after timestamp

    doc.setFontSize(10); // Reset font size for next message
    doc.setTextColor(0); // Reset text color
    y += 5; // Extra space between messages
  });

  doc.save(`${chat.name.replace(/\s/g, '_')}.pdf`);
};