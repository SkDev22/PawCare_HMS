import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  items: SearchResultItem[];
}

interface SearchResponse {
  query: string;
  groups: SearchGroup[];
}

export function useGlobalSearch(query: string) {
  const q = query.trim();
  return useQuery<SearchResponse>({
    queryKey: ['global-search', q],
    queryFn: () => api.get('/search', { params: { q } }).then((r) => r.data),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
