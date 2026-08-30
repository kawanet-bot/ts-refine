# Force bash so `set -o pipefail` works in the recipes below.
SHELL := bash
.SHELLFLAGS := -eo pipefail -c

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

test: test-bundled test-bin

# Resolves through node_modules after `unpack`; inside a checkout the
# package name self-references dist/ instead.
test-bundled:
	cd ../.. && node --test builder/tests/bundled.mjs

test-bin:
	cd ../.. && ./node_modules/.bin/ts-refine --help 2>&1 | grep "Usage: ts-refine"

clean:
	/bin/rm -f *.tgz

.PHONY: all pack bundled unpack test test-bundled test-bin clean
