function success(res, data = null, message = '操作成功', status = 200) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
    message,
  });
}

function failure(res, error, message, status = 500) {
  return res.status(status).json({
    success: false,
    data: null,
    error,
    message,
  });
}

module.exports = { success, failure };
