const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const isLocalHostname = (hostname = '') => {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0';
};

const isVercelInspectGuardEnabled = Boolean(
  isBrowser
  && typeof __ENABLE_VERCEL_INSPECT_GUARD__ !== 'undefined'
  && __ENABLE_VERCEL_INSPECT_GUARD__
  && !isLocalHostname(window.location.hostname)
);

if (isVercelInspectGuardEnabled) {
  try {
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      return false;
    });

    document.addEventListener('keydown', (event) => {
      const key = String(event.key || '').toLowerCase();

      if (event.keyCode === 123) {
        event.preventDefault();
        return false;
      }

      if (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) {
        event.preventDefault();
        return false;
      }

      if (event.ctrlKey && key === 'u') {
        event.preventDefault();
        return false;
      }

      return true;
    });
  } catch {
    // Keep the app running even if a browser blocks listener registration.
  }

  try {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    if (hook && typeof hook === 'object') {
      hook.inject = () => {};
      hook.on = () => {};
      hook.off = () => {};
      hook.emit = () => {};
    }
  } catch {
    // Never let inspect guard break initial render.
  }
}

export const isDevEnvironment = !isVercelInspectGuardEnabled;
export const isInspectGuardEnabled = isVercelInspectGuardEnabled;
