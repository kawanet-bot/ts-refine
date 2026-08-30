# The consumer side of the package: `pack` builds the tarball a consumer
# would receive, `unpack` installs it (--no-save keeps the manifest
# untouched, so this also works inside a checkout), `test` exercises it.
all: pack

pack:
	/bin/rm -f *.tgz
	cd ../.. && npm pack --pack-destination builder/consumer
	mv *-*.*.*.tgz packed.tgz

unpack:
	cd ../.. && npm install ./builder/consumer/packed.tgz --no-audit --no-fund --no-save

test:
	cd ../.. && node --test builder/tests/bundled.mjs
	cd ../.. && ./node_modules/.bin/ts-refine --help

.PHONY: all pack unpack test
