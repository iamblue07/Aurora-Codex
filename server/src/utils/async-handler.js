/**
 * Wraps an async Express handler so rejected promises reach the error middleware
 * (Express 4 does not do this on its own).
 */
const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

/** Wraps every function of a controller object with {@link asyncHandler}. */
export const wrapController = (controller) =>
    Object.fromEntries(Object.entries(controller).map(([name, fn]) => [name, asyncHandler(fn)]));

export default asyncHandler;
