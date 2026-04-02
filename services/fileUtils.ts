
/**
 * Converts a File object to a base64 encoded string.
 * @param file The File object to convert.
 * @returns A Promise that resolves with the base64 string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Extract only the base64 part (remove data:image/png;base64,)
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to read file as Data URL.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Reads the content of a File object as plain text.
 * @param file The File object to read.
 * @returns A Promise that resolves with the text content.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Checks if a given File object is an image file.
 * @param file The File object to check.
 * @returns True if the file is an image, false otherwise.
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Checks if a given File object is a text file.
 * @param file The File object to check.
 * @returns True if the file is a text file, false otherwise.
 */
export function isTextFile(file: File): boolean {
  return file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.md');
}
