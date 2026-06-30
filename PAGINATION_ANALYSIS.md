# PAGINATION ANALYSIS REPORT

## 1. Executive Summary: Centralized vs Distributed
The pagination architecture in this application is **strictly centralized and client-side**. 

Instead of paginating data at the database level (server-side pagination), the application uses a "fetch all" strategy inside `DataContext.jsx` (fetching in chunks of 1,000 up to 50,000 records) and holds the data in client-side React state.

All table views across the application delegate their display, filtering, and pagination to a single shared component: `src/components/ui/data-table.jsx`. This component leverages `@tanstack/react-table` to automatically handle client-side pagination state (calculating total pages, current page index, and slicing the data array).

There is **zero duplicated pagination logic** across the individual page components.

---

## 2. Data Fetching & Source (Server to Client)
The data source for all paginated tables is `DataContext.jsx`. 
It implements a "fetch all" loop using `query.range()` to bypass Supabase's default limits, storing the full datasets in memory.

**Fetching implementation (`src/contexts/DataContext.jsx`):**