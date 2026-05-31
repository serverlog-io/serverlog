import { createContext, useContext, useEffect, useMemo, useState } from "react";

const BreadcrumbContext = createContext({
  items: [],
  setItems: () => {},
});

export function BreadcrumbProvider({ children }) {
  const [items, setItems] = useState([]);
  const value = useMemo(() => ({ items, setItems }), [items]);
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// Pages call this with an array of { label, href? } to populate the navbar
// breadcrumb. Cleared automatically on unmount.
export function useBreadcrumb(items) {
  const { setItems } = useContext(BreadcrumbContext);
  const serialized = JSON.stringify(items || []);
  useEffect(() => {
    setItems(items || []);
    return () => setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}

export function useBreadcrumbItems() {
  return useContext(BreadcrumbContext).items;
}
