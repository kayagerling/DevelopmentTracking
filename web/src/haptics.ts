import { hapticTrigger } from "ios-haptics";

/**
 * Ref voor een klikbaar element: geeft op iOS een haptische tik bij aanraken.
 * Op andere apparaten doet dit niets.
 */
export const haptic = (el: HTMLElement | null) => hapticTrigger(el);
