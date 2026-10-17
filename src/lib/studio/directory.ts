// Pure directory helpers shared by the Studio views and their tests.
export type DirectoryPage = {
	path: string; title: string; previewImage: string; status: "draft" | "live";
	slug?: string; description?: string; mounted?: boolean;
};
export type DirectoryNav = {
	groups: { label: string; href: string; items: { label: string; href: string }[] }[];
	cta: { label: string; href: string };
};

export function allDirectoryPages(builder: DirectoryPage[], site: DirectoryPage[]): DirectoryPage[] {
	const pages = new Map(site.map((page) => [page.path, page]));
	for (const page of builder) pages.set(page.path, page);
	return [...pages.values()].sort((a, b) => a.path === "/" ? -1 : b.path === "/" ? 1 : a.title.localeCompare(b.title) || a.path.localeCompare(b.path));
}

export function filterDirectoryPages<T extends DirectoryPage>(pages: T[], query: string, status: "all" | "live" | "draft") {
	const needle = query.trim().toLowerCase();
	return pages.filter((page) => (status === "all" || page.status === status)
		&& (!needle || `${page.title} ${page.path} ${page.description || ""}`.toLowerCase().includes(needle)));
}

export function navigationLabels(path: string, nav: DirectoryNav | null): string[] {
	if (!nav) return [];
	const labels = nav.groups.filter((group) => [group.href, ...group.items.map((item) => item.href)].includes(path)).map((group) => group.label);
	if (nav.cta.href === path) labels.push("Header button");
	return [...new Set(labels)];
}

export function pageEditHref(path: string): string {
	return `${path}${path.includes("?") ? "&" : "?"}edit=1`;
}

// Content relationships for routes whose URLs do not encode their parent.
// Add entries like '/team': '/about' so the Studio page list nests a page
// under its parent when the URL doesn't already show it.
const CONTENT_PARENTS: Record<string, string> = {};
export type DirectoryTreePage = DirectoryPage & { depth: number; parentTitle?: string };

export function directoryTree(pages: DirectoryPage[], nav: DirectoryNav | null): DirectoryTreePage[] {
 const byPath = new Map(pages.map(p => [p.path, p]));
 const parents = new Map<string, string>();
 const order = new Map<string, number>();
 const top = new Set([...(nav?.groups.map(g => g.href) || []), ...(nav ? [nav.cta.href] : [])]);
 let position = 0;
 for (const group of nav?.groups || []) {
  order.set(group.href, position++);
  for (const item of group.items) {
   if (!order.has(item.href)) order.set(item.href, position++);
   if (byPath.has(group.href) && !top.has(item.href) && !parents.has(item.href)) parents.set(item.href, group.href);
  }
 }
 if (nav && !nav.groups.some(group => group.href === nav.cta.href)) order.set(nav.cta.href, position++);
 for (const page of pages) {
  if (page.path === '/' || top.has(page.path)) { parents.delete(page.path); continue; }
  if (!parents.has(page.path)) {
   const ancestor = pages.filter(p => p.path !== '/' && page.path.startsWith(p.path + '/')).sort((a,b) => b.path.length - a.path.length)[0];
   const parent = ancestor?.path || CONTENT_PARENTS[page.path];
   if (parent && byPath.has(parent)) parents.set(page.path, parent);
  }
 }
 const compare = (a: DirectoryPage, b: DirectoryPage) => a.path === '/' ? -1 : b.path === '/' ? 1
  : (order.get(a.path) ?? Infinity) - (order.get(b.path) ?? Infinity) || a.title.localeCompare(b.title) || a.path.localeCompare(b.path);
 const children = new Map<string, DirectoryPage[]>();
 for (const page of pages) {
  const parent = parents.get(page.path) || '';
  children.set(parent, [...(children.get(parent) || []), page]);
 }
 const result: DirectoryTreePage[] = [], visited = new Set<string>();
 function visit(page: DirectoryPage, depth: number, parentTitle?: string) {
  if (visited.has(page.path)) return;
  visited.add(page.path); result.push({...page, depth, parentTitle});
  for (const child of (children.get(page.path) || []).sort(compare)) visit(child, depth + 1, page.title);
 }
 for (const page of (children.get('') || []).sort(compare)) visit(page, 0);
 // Malformed saved menus must never hide pages or recurse forever.
 for (const page of [...pages].sort(compare)) if (!visited.has(page.path)) visit(page, 0);
 return result;
}
