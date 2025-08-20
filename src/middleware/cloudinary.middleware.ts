import { v2 as cloudinary } from "cloudinary";
import { createMiddleware } from "hono/factory";

export const cloudinaryMiddleware = createMiddleware(async (_c, next) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  await next();
});

export default cloudinaryMiddleware;
