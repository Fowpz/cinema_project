function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Передаёт ошибки асинхронных обработчиков в общий обработчик Express.
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { httpError, asyncHandler };
