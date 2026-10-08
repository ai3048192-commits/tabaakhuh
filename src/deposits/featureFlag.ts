/**
 * Custom-order deposits (specs/066, specs/068) are built but switched off:
 * every order is paid on delivery for now. This hides the deposits entry
 * points; the backend flag is DEPOSITS_ENABLED. Flip both to bring it back.
 */
export const DEPOSITS_ENABLED = false;
