import { v2 as cloudinary } from "cloudinary";
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_MIME_TYPES } from "@shared/constants";

export const isValidImageMime = (mime?: string) => {
  if (!mime) return false;
  return ALLOWED_IMAGE_MIME_TYPES.includes(mime.toLowerCase());
};

export const isUnderMaxSize = (size: number) => {
  return size <= MAX_IMAGE_SIZE;
};

export const bufferToDataUri = (
  buffer: ArrayBuffer,
  mime = "application/octet-stream"
) => {
  const b64 = Buffer.from(buffer).toString("base64");
  return `data:${mime};base64,${b64}`;
};

export const uploadImageToCloudinary = async (
  dataUri: string,
  folder = "uploads"
) => {
  const resp = await cloudinary.uploader.upload(dataUri, { folder });
  return resp.secure_url || resp.url;
};

export default {
  isValidImageMime,
  isUnderMaxSize,
  bufferToDataUri,
  uploadImageToCloudinary,
};
