import validateImage from "./validateImage";
import { bufferToDataUri, uploadImageToCloudinary } from "./image";
import { BadRequestError } from "@shared/error";

export const uploadImage = async (image: any, folder = "uploads") => {
  if (!image) throw new BadRequestError("Image is required");

  // If caller passed a data URI string
  if (typeof image === "string") {
    await validateImage({ dataUri: image });
    const url = await uploadImageToCloudinary(image, folder);
    return { secure_url: url };
  }

  // Assume a File/Blob-like object (from multipart/form-data)
  if (typeof image.arrayBuffer === "function") {
    await validateImage({ file: image });
    const buf = await image.arrayBuffer();
    const mime = image.type || "application/octet-stream";
    const dataUri = bufferToDataUri(buf, mime);
    const url = await uploadImageToCloudinary(dataUri, folder);
    return { secure_url: url };
  }

  throw new BadRequestError("Unsupported image input");
};
