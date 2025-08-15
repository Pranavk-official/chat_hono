import { Context, Next } from "hono";

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
  take: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  fields?: string[];
  search?: string;
  filter?: Record<string, any>;
};

declare module "hono" {
  interface ContextVariableMap {
    pagination: PaginationParams;
  }
}

export interface IPaginationResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedResponse<T> {
  [key: string]:
    | T[]
    | {
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        itemsPerPage: number;
        totalItems: number;
      };
}

export interface IPaginationOptions {
  defaultSize?: number;
  maxSize?: number;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  defaultFields?: string[];
  allowedSortFields?: string[];
}

export const paginationMiddleware = (options: IPaginationOptions = {}) => {
  const {
    defaultSize = 10,
    maxSize = 100,
    defaultSortBy = "createdAt",
    defaultSortOrder = "asc",
    defaultFields = [],
    allowedSortFields = [],
  } = options;

  return async function pagination(c: Context, next: Next) {
    const query = c.req.query();

    const page = parseInt(query.page as string, 10) || 1;
    const limit = Math.min(
      parseInt(query.limit as string, 10) || defaultSize,
      maxSize
    );

    const skip = (page - 1) * limit;

    const sortBy =
      query.sortBy && allowedSortFields.includes(query.sortBy as string)
        ? (query.sortBy as string)
        : defaultSortBy;
    const sortOrder = query.sortOrder ? query.sortOrder : defaultSortOrder;

    const fields = query.fields
      ? Array.isArray(query.fields)
        ? query.fields
        : [query.fields as string]
      : defaultFields;

    const search = query.search ? (query.search as string) : "";
    const filter = query.filter ? JSON.parse(query.filter as string) : {};

    c.set("pagination", {
      page,
      limit,
      take: limit,
      skip,
      sortBy,
      sortOrder,
      fields,
      search,
      filter,
    } as PaginationParams);

    await next();
  };
};

export const paginationBuilder = <T>(
  items: T[],
  count: number,
  pagination: PaginationParams,
  name: string = "data"
): IPaginatedResponse<T> => {
  const { page, limit } = pagination;
  const hasPreviousPage = page > 1;
  const hasNextPage = page * limit < count;
  const totalPages = Math.ceil(count / limit);
  return {
    [name]: items,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      totalItems: count,
      itemsPerPage: limit,
    },
  };
};
