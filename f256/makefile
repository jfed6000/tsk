# Texas Shitkickers - the F256 side (NitrOS-9 Level 2, 6809)
#
#   make assets                  export the assets from the browser prototype (tools/export.py)
#   make                         build tskview (the asset viewer / graphics harness)
#   make install DSK=/abs/x.dsk  copy tskview to CMDS and the assets to TSK on a disk image
#   make mame                    run tskview in the Wildbits MAME (wbjr2) headless, snapshots in mame/snap
#
# Assembles against upstream NitrOS-9 main (the Longview map); a program that only talks to grfdrv256 is
# map-independent (port-guide section 3).

NITROS9DIR ?= $(HOME)/projects/wild/main/nitros9
LWASM      ?= lwasm.orig
AS          = $(LWASM) --no-warn=ifp1 --6809 --format=os9 \
              --pragma=nosymbolcase,condundefzero,dollarnotlocal \
              --includedir=$(NITROS9DIR)/defs
AFLAGS      = -I $(NITROS9DIR)/level2/wildbits -I src -Dwildbits=1
ASSETFILES  = tiles.bin sprites.bin maps.bin frames.bin clut_spr.bin clut_tile.bin clut_flash.bin

all: tskview

assets:
	python3 tools/export.py

tskview: src/tskview.asm src/tskassets.d
	$(AS) $(AFLAGS) --list=$@.list --map=$@.map -o $@ src/tskview.asm
	@echo "tskview: $$(stat -c %s $@) bytes"

install: tskview
	@test -n "$(DSK)" || { echo "usage: make install DSK=/absolute/path/to/image.dsk"; exit 1; }
	-os9 makdir $(DSK),TSK
	-os9 del $(DSK),CMDS/tskview 2>/dev/null
	os9 copy -r tskview $(DSK),CMDS/tskview
	os9 attr -e -pe $(DSK),CMDS/tskview
	for f in $(ASSETFILES); do os9 del $(DSK),TSK/$$f 2>/dev/null; os9 copy -r assets/$$f $(DSK),TSK/$$f || exit 1; done

mame: tskview
	tools/mame.sh

clean:
	rm -f tskview tskview.list tskview.map

.PHONY: all assets install mame clean
