# Force bash so `set -o pipefail` works in the recipes below.
SHELL := bash
.SHELLFLAGS := -eo pipefail -c

# Root of the copy under test: the installed package after `unpack`, or
# the checkout itself (PKG_ROOT=.) for the publish gate, which runs the
# staged artifacts in place without installing anything.
PKG_ROOT ?= node_modules/ts-refine

# A target name in builder/, not a path from here.
TEST_DST := ./tests/bundled.mjs

# The workflows drive these steps in order:
#   nodejs.yml   pack bundled unpack test
#   publish.yml  bundled test-dist

# Package-side lifecycle: `pack` builds the tarball (renamed to the fixed
# packed.tgz), `unpack` installs it (--no-save also works in a checkout),
# `test` exercises it. Build `bundled` only after `pack`: npm pack runs
# prepare, whose clean wipes the generated test bundle.
all: pack

pack: clean
	cd ../.. && npm pack --pack-destination builder/pack
	mv *-*.*.*.tgz packed.tgz

bundled:
	$(MAKE) -C .. $(TEST_DST)

unpack:
	cd ../.. && npm install ./builder/pack/packed.tgz --no-audit --no-fund --no-save

test: test-bundled test-bin test-cli

# Resolves through node_modules after `unpack`; inside a checkout the
# package name self-references dist/ instead.
test-bundled:
	cd ../.. && node --test builder/tests/bundled.mjs

# npm accepts a broken bin mapping silently -- the .bin link is just
# never created -- so assert the link exists, resolves and is executable.
# Launching the file itself is test-cli's job.
test-bin:
	[ -x ../../node_modules/.bin/ts-refine ]

# The CLI end to end -- shebang, executable bit and the usage banner --
# against $(PKG_ROOT), so it also runs with no install involved.
test-cli:
	cd ../.. && ./$(PKG_ROOT)/dist/ts-refine.cli.mjs --help 2>&1 | grep "Usage: ts-refine"

# Publish gate: the same behavior checks, run against the checkout's own
# staged artifacts in place -- no tarball install involved.
test-dist:
	$(MAKE) test-bundled test-cli PKG_ROOT=.

clean:
	/bin/rm -f *.tgz

.PHONY: all pack bundled unpack test test-bundled test-bin test-cli test-dist clean
