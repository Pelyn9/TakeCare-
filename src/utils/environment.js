// Inspection Guard - Disable DevTools inspection in production
const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1');

if (isProduction) {
  // Disable right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable keyboard shortcuts for dev tools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
  });

  // Block debugger in production
  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
    get: () => undefined,
    set: () => {},
    configurable: false
  });

  // Disable console in production (optional - comment out if you need console for debugging)
  // console.log = () => {};
  // console.warn = () => {};
  // console.error = () => {};
}

export const isDevEnvironment = !isProduction;
