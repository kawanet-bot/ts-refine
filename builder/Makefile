# Force bash so `set -o pipefail` works in the recipes below.
SHELL := bash
.SHELLFLAGS := -eo pipefail -c

SRC := $(shell find ../src -name '*.ts' -not -name '*.test.ts')
TYPES := $(wildcard ../types/*.d.ts)
BUILDER_SRC := $(wildcard ./*.ts)

MJS_DST := ../dist/ts-survey.mjs
MJS_CONFIG := ./rollup-mjs.config.ts

# Public runtime named exports that must be verified in every bundle.
NAMED_EXPORTS := initProject runOrganizeImports runIndent runSemicolons runReports

# Bundle should contain only this package's own src/ — ts-morph and minimatch
# are externalized. A noticeably larger output means an accidental bundling
# of a transitive dep; fail the build so it cannot slip in.
MAX_BYTES := 35000

ALL := $(MJS_DST)

all: $(ALL)

$(MJS_DST): $(MJS_CONFIG) $(SRC) $(BUILDER_SRC)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@ls -l $@
	@test "$$(wc -c < $@)" -le $(MAX_BYTES) || { echo "ERROR: $@ exceeds $(MAX_BYTES) byte cap" >&2; exit 1; }
	@echo ""

# Verify the bundle by importing the package itself through the public
# entrypoint. This catches misconfigured `exports`/`main` paths.
smoke: $(MJS_DST)
	cd .. && node --input-type=module -e 'const m = await import("@kawanet/ts-survey"); for (const k of process.argv.slice(1)) { if (typeof m[k] !== "function") { console.error("missing MJS export:", k); process.exit(1); } console.log("MJS export OK:", k); }' $(NAMED_EXPORTS)

test: all smoke

clean:
	/bin/rm -fr $(ALL)

.PHONY: all clean test smoke
