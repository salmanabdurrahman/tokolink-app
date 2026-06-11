const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1200;

function isValidMagicBytes(header: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    );
  }
  if (mimeType === "image/gif") {
    return header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46;
  }
  if (mimeType === "image/webp") {
    return (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 &&
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50
    );
  }
  return false;
}

export async function validateImage(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Format gambar harus JPEG, PNG, WebP, atau GIF" };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: "Ukuran gambar maksimal 5MB" };
  }

  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const header = new Uint8Array(buffer);
    if (!isValidMagicBytes(header, file.type)) {
      return { valid: false, error: "File bukan file gambar yang valid" };
    }
  } catch (e) {
    return { valid: false, error: "Gagal membaca file gambar" };
  }

  return { valid: true };
}

export async function compressToWebP(file: File, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = (height / width) * MAX_WIDTH;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal menginisialisasi canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Gagal mengompresi gambar"));
          }
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      reject(new Error("File gambar rusak atau tidak valid"));
    };
    img.src = URL.createObjectURL(file);
  });
}
