import assert from "node:assert/strict";
import test from "node:test";
import { allDirectoryPages, directoryTree, filterDirectoryPages, navigationLabels, pageEditHref, type DirectoryPage } from "../src/lib/studio/directory";
const page = (path: string, title: string, extra = {}): DirectoryPage => ({ path, title, previewImage: "", status: "live", ...extra });
test("one row per route, builder wins and Homepage comes before alphabetical pages", () => {
 const result = allDirectoryPages([page('/z', 'Zebra', {slug:'zebra'}), page('/a', 'Apple', {slug:'apple'})], [page('/z', 'Old title'), page('/', 'Homepage'), page('/b', 'Banana')]);
 assert.deepEqual(result.map(p=>p.path), ['/', '/a', '/b', '/z']);
 assert.equal(result[3].slug, 'zebra');
});
test("search and publication filters work together, independent of menu placement", () => {
 const pages = [page('/a', 'Apple'), page('/draft', 'Apple draft', {status:'draft'}), page('/b', 'Banana', {description:'Apple information'})];
 assert.deepEqual(filterDirectoryPages(pages,' APPLE ','live').map(p=>p.path), ['/a','/b']);
 assert.deepEqual(filterDirectoryPages(pages,'','draft').map(p=>p.path), ['/draft']);
 assert.deepEqual(filterDirectoryPages(pages,'/b','all').map(p=>p.path), ['/b']);
});
test("navigation shows all placements including dropdowns and highlighted button", () => {
 const nav = {groups:[{label:'About',href:'/about',items:[{label:'Staff',href:'/staff'}]},{label:'Team',href:'/staff',items:[]}],cta:{label:'Visit',href:'/visit'}};
 assert.deepEqual(navigationLabels('/staff', nav), ['About','Team']);
 assert.deepEqual(navigationLabels('/visit', nav), ['Header button']);
 assert.deepEqual(navigationLabels('/other', nav), []);
});
test("Edit explicitly asks the on-page editor to open", () => {
 assert.equal(pageEditHref('/watch'), '/watch?edit=1');
});

test('missing parents and malformed duplicate menu links never drop or duplicate pages', () => {
 const pages=[page('/staff','Staff'),page('/a','A'),page('/b','B')];
 const nav={groups:[{label:'A',href:'/a',items:[{label:'A',href:'/a'},{label:'B',href:'/b'}]},{label:'B',href:'/b',items:[{label:'A',href:'/a'}]}],cta:{label:'',href:''}};
 const tree=directoryTree(pages,nav);
 assert.equal(tree.length,3); assert.equal(new Set(tree.map(p=>p.path)).size,3);
 assert.equal(tree.find(p=>p.path==='/staff')?.depth,0);
});

test('highlighted header button is a top-level page after header groups', () => {
 const pages=[page('/about','About'),page('/connect','Connect'),page('/other','A different page'),page('/watch','Watch')];
 const nav={groups:[{label:'About',href:'/about',items:[{label:'Connect',href:'/connect'}]},{label:'Watch',href:'/watch',items:[]}],cta:{label:'Get in touch',href:'/connect'}};
 assert.deepEqual(directoryTree(pages,nav).map(p=>[p.path,p.depth]),[['/about',0],['/watch',0],['/connect',0],['/other',0]]);
});

test('a dropdown reference cannot reorder a later header group', () => {
 const pages=[page('/about','About'),page('/services','Services'),page('/watch','Watch')];
 const nav={groups:[{label:'About',href:'/about',items:[{label:'Watch',href:'/watch'}]},{label:'Services',href:'/services',items:[]},{label:'Watch',href:'/watch',items:[]}],cta:{label:'Watch',href:'/watch'}};
 assert.deepEqual(directoryTree(pages,nav).map(p=>p.path),['/about','/services','/watch']);
});
