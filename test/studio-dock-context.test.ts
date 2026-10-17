import assert from 'node:assert/strict';
import test from 'node:test';
import { dockContext, proposalMatchesPage } from '../src/lib/studio/dock-context';
test('navigation gets distinct page labels and conversation keys', () => {
 const watch=dockContext('/watch','Watch & Videos | My Site','Watch');
 const growth=dockContext('/spiritual-formation','Spiritual Formation | My Site','Spiritual Formation');
 assert.equal(watch.path,'/watch');
 assert.equal(growth.page,'Spiritual Formation');
 assert.notEqual(watch.logKey,growth.logKey);
 assert.deepEqual(dockContext('/spiritual-formation/','Spiritual Formation | My Site',null),growth);
});
test('homepage and title fallback never display the site suffix as the page name', () => {
 assert.equal(dockContext('/','My Site','A tagline').page,'Homepage');
 assert.equal(dockContext('/watch','Watch & Videos | My Site',null).page,'Watch & Videos');
});
test('a proposal cannot publish after navigation to a different page', () => {
 assert.equal(proposalMatchesPage('/watch','/watch/'),true);
 assert.equal(proposalMatchesPage('/watch','/spiritual-formation'),false);
 assert.equal(proposalMatchesPage(null,'/watch'),false);
});
