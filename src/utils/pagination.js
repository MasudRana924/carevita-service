const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const buildPagination = ({ page = 1, limit = 20, total = null } = {}) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const totalCount = total == null || Number.isNaN(Number(total)) ? null : Number(total);
  const totalPages = totalCount == null ? null : Math.ceil(totalCount / pageSize) || 0;

  return {
    page: currentPage,
    limit: pageSize,
    total: totalCount,
    totalPages,
    hasNext: totalPages == null ? null : currentPage < totalPages,
    hasPrev: currentPage > 1
  };
};

module.exports = { parsePagination, buildPagination };
