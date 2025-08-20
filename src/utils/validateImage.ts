import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE } from "@shared/constants";

export type ValidateResult = { mime: string; size: number };

const parseDataUri = (dataUri: string) => {
  const match = dataUri.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URI");
  return { mime: match[1], base64: match[2] };
};

const base64Size = (base64: string) => {
  // each 4 chars represent 3 bytes
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.ceil((base64.length * 3) / 4) - padding;
};

export const validateImage = async (input: {
  file?: any;
  dataUri?: string;
}): Promise<ValidateResult> => {
  if (input.file) {
    const file = input.file as any;
    const mime = file.type || "";
    const size =
      file.size ??
      (file.arrayBuffer ? (await file.arrayBuffer()).byteLength : 0);
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime))
      throw new Error("Invalid image type");
    if (size > MAX_IMAGE_SIZE) throw new Error("Image size exceeds limit");
    return { mime, size };
  }

  if (input.dataUri) {
    const { mime, base64 } = parseDataUri(input.dataUri);
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime))
      throw new Error("Invalid image type");
    const size = base64Size(base64);
    if (size > MAX_IMAGE_SIZE) throw new Error("Image size exceeds limit");
    return { mime, size };
  }

  throw new Error("No image provided");
};

export default validateImage;
