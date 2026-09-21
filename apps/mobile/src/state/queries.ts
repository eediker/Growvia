import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApp } from './AppProvider';
import type { ContentFilter } from '../domain/models';

export function useMe() { const { gateway, scope } = useApp(); return useQuery({ queryKey: [scope, 'me'], queryFn: () => gateway.me() }); }
export function useChildren() { const { gateway, scope } = useApp(); return useQuery({ queryKey: [scope, 'children'], queryFn: () => gateway.children() }); }
export function useActiveChild() { const { activeChildId } = useApp(); const query = useChildren(); return { ...query, child: query.data?.find(c => c.id === activeChildId) ?? query.data?.[0] }; }
export function useContent(filter: ContentFilter = {}) { const { gateway, scope } = useApp(); return useQuery({ queryKey: [scope, 'content', filter], queryFn: () => gateway.content(filter) }); }
export function useClasses() { const { gateway, scope } = useApp(); return useQuery({ queryKey: [scope, 'classes'], queryFn: () => gateway.classes() }); }
export function usePosts(classId: string | undefined) {
  const { gateway, scope } = useApp();
  return useInfiniteQuery({ queryKey: [scope, 'posts', classId], queryFn: ({ pageParam }) => gateway.posts(classId!, pageParam),
    initialPageParam: 0, getNextPageParam: page => page.offset + page.items.length < page.total ? page.offset + page.limit : undefined, enabled: !!classId });
}
export function useCompletions(childId: string | undefined) { const { gateway, scope } = useApp(); return useQuery({ queryKey: [scope, 'completions', childId], queryFn: () => gateway.completions(childId!), enabled: !!childId }); }
