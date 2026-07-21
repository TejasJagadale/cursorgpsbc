export class ApiResponse {
  static success(data, message = 'Success', meta = null) {
    return {
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    };
  }

  static paginated(data, pagination) {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      message: 'Success',
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
