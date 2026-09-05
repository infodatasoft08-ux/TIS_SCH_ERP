import { lazy } from 'react';

/**
 * Intelligent wrapper around React.lazy that handles dynamic import failures.
 * Useful when new production deployments invalidate old bundle chunk hashes,
 * or when network glitches/timeouts (e.g., HTTP status 522) occur.
 *
 * @param {Function} componentImport - Function returning dynamic import e.g. () => import('./MyPage')
 * @returns {React.LazyExoticComponent}
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry_chunk_reload') || 'false'
    );

    try {
      const component = await componentImport();
      // On success, reset reload flag for future route navigations
      window.sessionStorage.removeItem('retry_chunk_reload');
      return component;
    } catch (error) {
      console.error('Dynamic module load failed:', error);

      // Retry attempt 1: wait 500ms and try once more before forcing page reload
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const component = await componentImport();
        window.sessionStorage.removeItem('retry_chunk_reload');
        return component;
      } catch (retryError) {
        console.warn('Retry 1 failed, evaluating page reload...', retryError);
      }

      // If we haven't reloaded the page yet for this session/chunk error, reload now.
      if (!pageHasBeenRefreshed) {
        window.sessionStorage.setItem('retry_chunk_reload', 'true');
        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    }
  });

export default lazyWithRetry;
