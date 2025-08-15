import { IPaginationResponse } from "@middleware/pagination";

export interface ApiResponse<T = any> {
  success: true;
  message: string;
  data: T;
  timestamp: string | null;
  path?: string;
  pagination?: IPaginationResponse;
}

export interface ResponderOptions {
  message?: string;
  path?: string;
  timestamp?: boolean;
}

/**
 * Memory-optimized and API-standard responder
 */
const responder = <T>(
  data: T,
  options?: ResponderOptions,
  pagination?: IPaginationResponse
): ApiResponse<T> => {
  const res: ApiResponse<T> = {
    success: true,
    message: options?.message ?? "Success",
    data,
    timestamp: options?.timestamp ? new Date().toISOString() : null,
  };

  if (options?.path) res.path = options.path;
  if (pagination) res.pagination = pagination;

  return res;
};

export default responder;
