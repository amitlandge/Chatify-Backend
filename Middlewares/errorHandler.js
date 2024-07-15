export const errorHandler = (err, req, res, next) => {
  err.message ||= "Internal Server Error";
  err.statusCode ||= 400;

  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate field - ${error}`;
    err.statusCode = 400;
  }

  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid Format of ${errorPath}`;
    err.statusCode = 400;
  }
  console.log(err.message);
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
