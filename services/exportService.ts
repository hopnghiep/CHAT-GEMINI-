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
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Helper to add a new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(chat.name, contentWidth);
  doc.text(titleLines, margin, y);
  y += (titleLines.length * 8) + 5;

  // Metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Tao luc: ${new Date(chat.createdAt).toLocaleString()}`, margin, y);
  y += 6;
  doc.text(`Cap nhat luc: ${new Date(chat.updatedAt).toLocaleString()}`, margin, y);
  y += 15;

  doc.setDrawColor(200);
  doc.line(margin, y - 5, pageWidth - margin, y - 5);

  chat.messages.forEach((message) => {
    const role = message.role === 'user' ? 'Nguoi dung' : 'Gemini';
    const timestamp = new Date(message.timestamp).toLocaleString();
    const parts = message.editedParts || message.parts;

    checkPageBreak(20);

    // Message Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (message.role === 'user') {
      doc.setTextColor(37, 99, 235); // blue-600
    } else {
      doc.setTextColor(75, 85, 99); // gray-600
    }
    doc.text(`${role}`, margin, y);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    const timeWidth = doc.getTextWidth(timestamp);
    doc.text(timestamp, pageWidth - margin - timeWidth, y);
    y += 8;

    parts.forEach((part) => {
      if ('text' in part) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        
        // Remove Vietnamese accents for PDF compatibility with standard fonts
        // This is a workaround because standard jsPDF fonts don't support Unicode
        const cleanText = part.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
        
        const lines = doc.splitTextToSize(cleanText, contentWidth - 5);
        
        lines.forEach((line: string) => {
          checkPageBreak(6);
          doc.text(line, margin + 5, y);
          y += 6;
        });
        y += 2;
      } else if ('inlineData' in part) {
        const imgData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        const imgWidth = 60;
        const imgHeight = 45; 
        
        checkPageBreak(imgHeight + 10);
        try {
          // Use JPEG if possible, or PNG
          const format = part.inlineData.mimeType.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(imgData, format, margin + 5, y, imgWidth, imgHeight);
          y += imgHeight + 10;
        } catch (e) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150);
          doc.text(`[Hinh anh: ${part.inlineData.mimeType}]`, margin + 5, y);
          y += 10;
        }
      } else if ('link' in part) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 255); // Blue for links
        const linkText = part.link.title || part.link.url;
        const cleanLinkText = linkText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
        
        checkPageBreak(6);
        doc.text(cleanLinkText, margin + 5, y);
        doc.link(margin + 5, y - 5, doc.getTextWidth(cleanLinkText), 6, { url: part.link.url });
        y += 8;
        doc.setTextColor(0);
      }
    });

    y += 5; // Space between messages
  });

  doc.save(`${chat.name.replace(/\s/g, '_')}.pdf`);
};

/**
 * Prints a chat session using the browser's print engine.
 * This is often the best way to "export" to PDF while preserving all characters and styling.
 * @param chat The ChatSession object to print.
 */
export const printChat = (chat: ChatSession): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const messagesHtml = chat.messages.map(msg => {
    const role = msg.role === 'user' ? 'Người dùng' : 'Gemini';
    const content = getMessageDisplayContent(msg);
    return `
      <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        <strong style="color: ${msg.role === 'user' ? '#2563eb' : '#4b5563'}">${role}</strong>
        <span style="font-size: 0.8em; color: #9ca3af; margin-left: 10px;">${new Date(msg.timestamp).toLocaleString()}</span>
        <div style="margin-top: 5px; white-space: pre-wrap;">${content}</div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${chat.name}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #1f2937; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          .meta { color: #6b7280; font-size: 0.9em; margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <h1>${chat.name}</h1>
        <div class="meta">
          Tạo lúc: ${new Date(chat.createdAt).toLocaleString()}<br>
          Cập nhật lúc: ${new Date(chat.updatedAt).toLocaleString()}
        </div>
        ${messagesHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};
