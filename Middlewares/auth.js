import { ErrorHandler } from "../utils/error.js";
import JWT from "jsonwebtoken";
export const auth = async (req, res, next) => {
  try {
    const token = req.cookies["token"];

    if (!token) {
      return next(new ErrorHandler("Please Login , Token is Invalid", 400));
    }
    const decode = await JWT.verify(token, process.env.SECRETE_KEY);

    req.user = decode.id;
    next();
  } catch (error) {
    return next(error);
  }
};
