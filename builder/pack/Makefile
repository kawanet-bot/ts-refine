# Package-side lifecycle: `all` builds the payloads (pack first -- npm
# pack's prepare wipes generated files, so the test bundle is built
# after), then `unpack` installs packed.tgz and `test` exercises it.
# unpack uses --no-save, so the flow also works inside a checkout.
all: pack bundled

pack:
	/bin/rm -f *.tgz
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
