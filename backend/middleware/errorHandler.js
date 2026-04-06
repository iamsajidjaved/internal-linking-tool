function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);
  console.error(err.stack);

  const status = err.statusCode || 500;
  res.status(status).json({
    error: true,
    message: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
