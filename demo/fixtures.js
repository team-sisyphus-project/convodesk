// Every JSON file captured by demo/capture.mjs, keyed by the path it came from.
const modules = import.meta.glob('./fixtures/*.json', { eager: true });

const byPath = new Map();
for (const mod of Object.values(modules)) {
  const fixture = mod.default ?? mod;
  byPath.set(fixture.path, fixture);
}

export const fixtureFor = path => byPath.get(path)?.body;

export const fixtureForPathname = pathname => {
  const candidates = [pathname, `${pathname}/`];
  for (const [path, fixture] of byPath) {
    if (candidates.includes(path.split('?')[0])) return fixture.body;
  }
  return undefined;
};
