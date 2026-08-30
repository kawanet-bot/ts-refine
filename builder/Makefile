# Force bash so `set -o pipefail` works in the recipes below.
SHELL := bash
.SHELLFLAGS := -eo pipefail -c

SRC := $(shell find ../src -name '*.ts' -not -name '*.test.ts')
TYPES := $(wildcard ../types/*.d.ts)
BUILDER_SRC := $(wildcard ./*.ts)

MJS_DST := ../dist/ts-refine.mjs
MJS_CONFIG := ./rollup-mjs.config.ts

CLI_DST := ../dist/ts-refine.cli.mjs
CLI_CONFIG := ./rollup-cli.config.ts

TEST_SRC := $(shell find ../src -name '*.test.ts')
TESTS_DST := ./tests/bundled.mjs
TESTS_CONFIG := ./rollup-tests.config.ts

# Same purpose as the caps above: a jump past this means the test bundle
# accidentally inlined library sources or a dependency.
TEST_MAX_BYTES := 120000

# Staging area for the CI test matrix: the packed tarball plus everything
# a runtime lane needs to test it without a checkout.
STAGE_DIR := ./stage

# Public runtime named exports the smoke target must find in the bundle.
# Derived from `export declare function <name>(...)` lines in the
# published .d.ts so adding a new entry there is enough — no parallel
# update here.
NAMED_EXPORTS := $(shell sed -nE 's/^export declare function ([a-zA-Z_$$]+).*/\1/p' $(TYPES))

# Bundle should contain only this package's own src/ — typescript (the one
# runtime dep) is externalized; bundling it would add megabytes. A noticeably
# larger output means an accidental bundling of a transitive dep; fail the build
# so it cannot slip in. This cap is not a minifier target: raise it for real
# feature growth, and keep source code readable.
#
# The mjs bundle carries the src/bridge compat layer. The CLI bundle imports
# the library through ../index.ts, which the CLI rollup config aliases to the
# external "ts-refine", so it stays small and never re-bundles the bridge.
MJS_MAX_BYTES := 250000
CLI_MAX_BYTES := 60000

ALL := $(MJS_DST) $(CLI_DST) $(TESTS_DST)

# Build/test paths require Node's native TypeScript type-strip (default on
# Node 22.18+). Older runtimes (e.g. Node 20) report BUILDABLE=NO and can
# still verify pre-built bundles via `make smoke`.
BUILDABLE := $(shell node -e 'console.log(process.features.typescript ? "YES" : "NO")')

####

# Build all artifacts.
all: is-buildable $(ALL)

# Gate that fails loudly when type-strip is unavailable; consumed by `all`
# and by `npm prepack` to refuse packaging on a non-buildable runtime.
is-buildable:
	@ [ "$(BUILDABLE)" = "YES" ]

# Inverse gate used by `npm prepare` to short-circuit on a non-buildable
# runtime so consumer install on Node 20 silently skips build/test.
is-not-buildable:
	@ [ "$(BUILDABLE)" = "NO" ]

$(MJS_DST): $(MJS_CONFIG) $(SRC) $(BUILDER_SRC)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@ls -l $@
	@test "$$(wc -c < $@)" -le $(MJS_MAX_BYTES) || { echo "ERROR: $@ exceeds $(MJS_MAX_BYTES) byte cap" >&2; exit 1; }
	@echo ""

$(CLI_DST): $(CLI_CONFIG) $(SRC) $(BUILDER_SRC) $(MJS_DST)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	chmod a+x $@
	@ls -l $@
	@test "$$(wc -c < $@)" -le $(CLI_MAX_BYTES) || { echo "ERROR: $@ exceeds $(CLI_MAX_BYTES) byte cap" >&2; exit 1; }
	@echo ""

$(TESTS_DST): $(TESTS_CONFIG) $(SRC) $(TEST_SRC) $(BUILDER_SRC) $(MJS_DST)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@ls -l $@
	@test "$$(wc -c < $@)" -le $(TEST_MAX_BYTES) || { echo "ERROR: $@ exceeds $(TEST_MAX_BYTES) byte cap" >&2; exit 1; }
	@echo ""

# Verify the bundle by importing the package itself through the public
# entrypoint. This catches misconfigured `exports`/`main` paths. An
# empty NAMED_EXPORTS would let smoke silently pass even when the .d.ts
# regex stops matching, so guard against it explicitly.
smoke: $(MJS_DST)
	@test -n "$(NAMED_EXPORTS)" || { echo "ERROR: NAMED_EXPORTS empty — check the sed pattern against $(TYPES)" >&2; exit 1; }
	cd .. && node --input-type=module -e 'const m = await import("ts-refine"); for (const k of process.argv.slice(1)) { if (typeof m[k] !== "function") { console.error("missing MJS export:", k); process.exit(1); } console.log("MJS export OK:", k); }' $(NAMED_EXPORTS)

# Consumer `npm install` skips the heavy test-full step to keep install fast.
# `npm pack` re-runs prepare for a fresh build; tests are skipped there too
# because CI and the stage target run them explicitly, while `npm publish`
# reports npm_command=publish and still gets the full run.
test:
	@case "$$npm_command" in \
		install|ci|pack) echo "npm $$npm_command detected: skipping full tests." ;; \
		*) $(MAKE) test-full ;; \
	esac

test-full: smoke test-quick
	cd .. && node --test 'src/**/*.test.ts'
	cd .. && node --test builder/tests/bundled.mjs

test-quick: all
	cd .. && ./node_modules/.bin/tsc --noEmit
	cd .. && node dist/ts-refine.cli.mjs imports --check
	cd .. && node dist/ts-refine.cli.mjs format --check

# Assemble the artifact consumed by the CI test matrix: the packed tarball,
# the bundled suites, their fixtures, and the consumer manifest whose npm
# scripts drive the matrix-side run. `npm pack` triggers prepare (a clean
# build) itself, so everything is copied afterwards, freshly rebuilt.
stage:
	rm -rf $(STAGE_DIR) ../ts-refine-*.tgz
	cd .. && npm pack
	mkdir -p $(STAGE_DIR)/builder/tests
	mv ../ts-refine-*.tgz $(STAGE_DIR)/
	cp ./consumer/package.json $(STAGE_DIR)/package.json
	cp $(TESTS_DST) $(STAGE_DIR)/builder/tests/bundled.js
	cp -r ../sample $(STAGE_DIR)/sample
	@ls -l $(STAGE_DIR)

clean:
	/bin/rm -fr $(ALL) $(STAGE_DIR)

.PHONY: all clean test smoke stage is-buildable is-not-buildable
