import { useEffect } from "react";

/**
 * Custom hook to dynamically manage the browser document title.
 *
 * @param {string} title - The title string to display.
 * @param {boolean} [revertOnUnmount=false] - Whether to revert back to previous title when unmounted.
 */
export function useDocumentTitle(title, revertOnUnmount = false) {
  useEffect(() => {
    if (!title) return;
    const prevTitle = document.title;
    document.title = title;

    return () => {
      if (revertOnUnmount && prevTitle) {
        document.title = prevTitle;
      }
    };
  }, [title, revertOnUnmount]);
}

export default useDocumentTitle;
