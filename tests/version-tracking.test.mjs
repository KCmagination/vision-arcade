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
