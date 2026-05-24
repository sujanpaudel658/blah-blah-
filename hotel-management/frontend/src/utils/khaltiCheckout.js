const STORAGE_KEY = 'khalti_checkout_origin';

export function rememberKhaltiCheckoutOrigin() {
  try {
    sessionStorage.setItem(STORAGE_KEY, window.location.origin);
  } catch {
    /* private mode / blocked storage */
  }
}

/** If Khalti returned on a different host than checkout, return that origin; else null. */
export function getKhaltiReturnOriginMismatch() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && stored !== window.location.origin) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearKhaltiCheckoutOrigin() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function redirectToKhaltiPayment(paymentUrl) {
  if (!paymentUrl) return;
  rememberKhaltiCheckoutOrigin();
  window.location.href = paymentUrl;
}
