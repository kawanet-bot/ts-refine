# Package-side lifecycle: `pack` builds the tarball (renamed to the fixed
# packed.tgz), `unpack` installs it (--no-save also works in a checkout),
# `test` exercises it. Build `bundled` only after `pack`: npm pack runs
# prepare, whose clean wipes the generated test bundle.
all: pack

pack: clean
	cd ../.. && npm pack --pack-destination builder/pack
	mv *-*.*.*.tgz packed.tgz

bundled:
	$(MAKE) -C .. tests/bundled.mjs

unpack:
	cd ../.. && npm install ./builder/pack/packed.tgz --no-audit --no-fund --no-save

test:
	cd ../.. && node --test builder/tests/bundled.mjs
	cd ../.. && ./node_modules/.bin/ts-refine --help

clean:
	/bin/rm -f *.tgz

.PHONY: all pack bundled unpack test clean
