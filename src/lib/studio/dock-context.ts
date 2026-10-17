export function dockContext(pathname: string, title: string, heading: string | null) {
 const path = pathname.replace(/\/+$/, '') || '/';
 const page = path === '/' ? 'Homepage' : heading?.trim()
  || title.split('|')[0].trim() || path.slice(1).replace(/[/-]/g, ' ');
 return { path, page, logKey: `sd_log:${path}` };
}

export function proposalMatchesPage(proposalPath: string | null, currentPath: string) {
 return proposalPath !== null && proposalPath === (currentPath.replace(/\/+$/, '') || '/');
}
