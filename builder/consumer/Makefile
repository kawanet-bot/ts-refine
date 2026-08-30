# Verify a packed-tarball install (CI matrix lanes, artifact root, no
# checkout): the bundled suites against dist/, then the installed bin.
test:
	node --test builder/tests/bundled.mjs
	./node_modules/.bin/ts-refine --help

.PHONY: test
