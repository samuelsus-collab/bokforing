interface PaginateArgs {
  where?: object
  select?: object
  include?: object
  orderBy?: object | object[]
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    pageCount: number
  }
}

export async function paginate<T>(
  model: { findMany: (args: any) => Promise<T[]>; count: (args: any) => Promise<number> },
  args: PaginateArgs,
  page: number,
  pageSize: number
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * pageSize
  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take: pageSize }),
    model.count({ where: args.where }),
  ])
  return {
    data,
    meta: { total, page, pageSize, pageCount: Math.ceil(total / pageSize) },
  }
}
