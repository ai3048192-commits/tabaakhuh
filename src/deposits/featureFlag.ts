/**
 * Custom-order deposits (specs/066, 068, 069) are switched on: the customer
 * transfers the deposit to the cook's own Vodafone Cash / InstaPay account
 * and the cook confirms it. This shows the deposits entry points; the
 * backend flag is DEPOSITS_ENABLED. Flip both together to turn it off.
 */
export const DEPOSITS_ENABLED = true;
