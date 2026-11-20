import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const json = async p => JSON.parse(await readFile(new URL('../'+p, import.meta.url),'utf8'));
test('public version and source provenance stay consistent', async () => {
 const [pkg,lock,manifest,version]=await Promise.all([json('package.json'),json('package-lock.json'),json('release-manifest.json'),readFile(new URL('../VERSION',import.meta.url),'utf8')]);
 assert.equal(pkg.version,version.trim());assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);assert.equal(manifest.publicVersion,pkg.version);
 assert.match(manifest.siteSourceCommit,/^[a-f0-9]{40}$/);assert.match(manifest.publicBaseCommit,/^[a-f0-9]{40}$/);
 assert.ok(Number.isInteger(manifest.siteVersion));assert.equal(manifest.futureUpdatesRequireOwnerApproval,true);
});
test('protected public calculator boundary files retain reviewed bytes', async () => {
 const manifest=await json('release-manifest.json');
 for(const [path,expected] of Object.entries(manifest.protectedFiles)) {
  const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path);
 }
});
test('hosted release metadata remains explicit and separate from the ported checkout', async () => {
 const manifest=await json('release-manifest.json'),hosted=manifest.hostedRelease;
 assert.equal(hosted.relationship,'hosted-only');
 assert.ok(Number.isInteger(hosted.siteVersion)&&hosted.siteVersion>manifest.siteVersion);
 assert.match(hosted.siteSourceCommit,/^[a-f0-9]{40}$/);
 assert.notEqual(hosted.siteSourceCommit,manifest.siteSourceCommit);
 assert.equal(hosted.siteUrl,manifest.siteUrl);
 assert.match(hosted.deployedOn,/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(hosted.notes,'docs/HOSTED-RELEASES.md');
 const [notes,readme]=await Promise.all([readFile(new URL('../'+hosted.notes,import.meta.url),'utf8'),readFile(new URL('../README.md',import.meta.url),'utf8')]);
 for(const value of [`Site v${hosted.siteVersion}`,hosted.siteSourceCommit,hosted.deployedOn,hosted.siteUrl])assert.ok(notes.includes(value));
 assert.ok(readme.includes(`Site v${hosted.siteVersion}`)&&readme.includes(hosted.notes));
});
