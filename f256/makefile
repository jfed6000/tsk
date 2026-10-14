# Texas Shitkickers - the F256 side (NitrOS-9 Level 2, 6809)
#
#   make assets                  export the assets from the browser prototype (tools/export.py)
#   make                         build tsk (the game) and tskview (the asset viewer / graphics harness)
#   make install DSK=/abs/x.dsk  tsk and tskview to CMDS, the assets to TSK, on a disk image
#   make mame                    run the game's demo (tsk d) in the Wildbits MAME (wbjr2) headless, snapshots in mame/snap
#   make mamebot                 the autopilot fighting the skeletons (tsk b), a snapshot every 6 frames
#   make mameboss                Boot Hill's last waves and Two-Bit (tsk bg), a snapshot every 12 frames
#   make mameview                the same for tskview
#   make host                    the demo on the host 6809 (tools/hostrun.py): the hero's state, pass by pass
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
TSKSRC      = src/tsk.asm src/data.a src/platform.a src/hero.a src/enemy.a src/stage.a src/hud.a src/pickup.a src/intro.a src/boss.a src/draw.a src/tskassets.d src/tsktabs.a
BUDGET      = 40192

all: tsk tskview

assets:
	python3 tools/export.py

tsk: $(TSKSRC)
	$(AS) $(AFLAGS) --list=$@.list --map=$@.map -o $@ src/tsk.asm
	@n=$$(stat -c %s $@); echo "tsk: $$n bytes of $(BUDGET)"; test $$n -le $(BUDGET) || { echo "tsk: over the module budget (port-guide section 3)"; exit 1; }
	@printf 'tsk data area: %d bytes\n' 0x$$(grep "Symbol: size " $@.map | sed 's/.*= //')

tskview: src/tskview.asm src/tskassets.d
	$(AS) $(AFLAGS) --list=$@.list --map=$@.map -o $@ src/tskview.asm
	@echo "tskview: $$(stat -c %s $@) bytes"

install: tsk tskview
	@test -n "$(DSK)" || { echo "usage: make install DSK=/absolute/path/to/image.dsk"; exit 1; }
	-os9 makdir $(DSK),TSK
	for p in tsk tskview; do os9 del $(DSK),CMDS/$$p 2>/dev/null; os9 copy -r $$p $(DSK),CMDS/$$p && os9 attr -e -pe $(DSK),CMDS/$$p || exit 1; done
	for f in $(ASSETFILES); do os9 del $(DSK),TSK/$$f 2>/dev/null; os9 copy -r assets/$$f $(DSK),TSK/$$f || exit 1; done

mame: tsk tskview
	LUA=tools/tsk.lua tools/mame.sh

mamebot: tsk tskview
	LUA=tools/tskbot.lua tools/mame.sh

mameboss: tsk tskview
	LUA=tools/tskboss.lua tools/mame.sh

mameview: tskview
	tools/mame.sh

host: tsk
	python3 tools/hostrun.py --demo --passes 1100 --every 10

clean:
	rm -f tsk tsk.list tsk.map tskview tskview.list tskview.map

.PHONY: all assets install mame mamebot mameboss mameview host clean
