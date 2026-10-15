# Texas Shitkickers - the F256 side (NitrOS-9 Level 2, 6809)
#
#   make assets                  export the assets from the browser prototype (tools/export.py) and the music (midi2tsk.py)
#   make music                   compose the music (compose.py), convert it, and render the MP3 previews (game/music)
#   make                         build tsk (the game) and tskview (the asset viewer / graphics harness)
#   make install DSK=/abs/x.dsk  tsk and tskview to CMDS, the assets to TSK, on a disk image
#   make mame                    run the game's demo (tsk d) in the Wildbits MAME (wbjr2) headless, snapshots in mame/snap
#   make mamebot                 the autopilot fighting the skeletons (tsk b), a snapshot every 6 frames
#   make mameboss                Boot Hill's last waves and Two-Bit (tsk bg), a snapshot every 12 frames
#   make mamems                  Main Street (tsk mbg) in MAME, a snapshot every 8 frames
#   make mamedillon              Big Shell Dillon (tsk mkbg) in MAME
#   make mamedeath               the death scene (tsk mkf: frail, any hit kills) in MAME
#   make mamegila                Doc Gila (tsk hkg: Ghost Town, straight to him, unhurtable) in MAME
#   make mamecattle              the Cattle Drive (tsk cbg) in MAME
#   make mametitle               the title screen and its music in MAME: the MIDI the 6809 sends, as mame/midi.mid
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
ASSETFILES  = fri.bin frr.bin frr_bh.bin frr_ms.bin frr_gt.bin sprites.bin spr_bh.bin spr_ms.bin tiles_bh.bin maps_bh.bin tiles_ms.bin maps_ms.bin frames.bin clut_spr.bin clut_tile.bin clut_flash.bin clut_dusk.bin mus_title.bin mus_boothill.bin mus_clear.bin mus_over.bin mus_boogie.bin mus_deadman.bin mus_stampede.bin spr_gt.bin tiles_gt.bin maps_gt.bin spr_cd.bin tiles_cd.bin maps_cd.bin frr_cd.bin
TSKSRC      = src/tsk.asm src/data.a src/stages.d src/platform.a src/hero.a src/enemy.a src/stage.a src/hud.a src/pickup.a src/intro.a src/boss.a src/death.a src/grab.a src/rat.a src/stgmod.a src/snd.a src/title.a src/amb.a src/draw.a src/tskassets.d src/tsktabs.a src/tskmusic.d
# The stage modules (stgmod.a): a stage's own code, F$Loaded with its art into the process's free 8K slot.
# tools/stagegen.py writes the glue (src/tskvec.d, tskhook.a, tskhk_*.a, tskcore.d) from the sources.
STAGEMODS   = tskms tskgt tskcd
STAGESRC    = src/dillon.a src/ghost.a src/ride.a src/jack.a
STAGEMAX    = 8192
# The module budget. The data area is one 8K block (the frame records and CLUTs live in graphics blocks: draw.a,
# platform.a ClutK), so of the process's eight: data 1, the music window 1 (the top block or wherever's highest:
# snd.a MusMap), one service window, the stage module 1 (stgmod.a), and the core the other 4 = 32,768 bytes.
# The data area must stay in its block with room for the parameters (DATAMAX).
BUDGET      = 32768
DATAMAX     = 7936

all: tsk $(STAGEMODS) tskview

assets:
	python3 tools/export.py
	python3 tools/midi2tsk.py

music:
	python3 tools/compose.py
	python3 tools/midi2tsk.py
	python3 tools/render.py

tsk: $(TSKSRC) $(STAGESRC)
	python3 tools/stagegen.py vec
	python3 tools/dpcheck.py
	$(AS) $(AFLAGS) --list=$@.list --map=$@.map -o $@ src/tsk.asm
	@n=$$(stat -c %s $@); echo "tsk: $$n bytes of $(BUDGET)"; test $$n -le $(BUDGET) || { echo "tsk: over the module budget (port-guide section 3)"; exit 1; }
	@d=$$((0x$$(grep "Symbol: size " $@.map | sed 's/.*= //'))); echo "tsk data area: $$d bytes of $(DATAMAX)"; test $$d -le $(DATAMAX) || { echo "tsk: the data area is over one block"; exit 1; }
	python3 tools/stagegen.py core

tskms: src/tskms.asm src/dillon.a
tskgt: src/tskgt.asm src/ghost.a
tskcd: src/tskcd.asm src/ride.a src/jack.a
$(STAGEMODS): tsk
	$(AS) $(AFLAGS) --list=$@.list --map=$@.map -o $@ src/$@.asm
	@n=$$(stat -c %s $@); echo "$@: $$n bytes of $(STAGEMAX)"; test $$n -le $(STAGEMAX) || { echo "$@: over one 8K block"; exit 1; }

tskview: src/tskview.asm src/tskassets.d
	$(AS) $(AFLAGS) --list=$@.list --map=$@.map -o $@ src/tskview.asm
	@echo "tskview: $$(stat -c %s $@) bytes"

install: tsk $(STAGEMODS) tskview
	@test -n "$(DSK)" || { echo "usage: make install DSK=/absolute/path/to/image.dsk"; exit 1; }
	-os9 makdir $(DSK),TSK
	for p in tsk $(STAGEMODS) tskview; do os9 del $(DSK),CMDS/$$p 2>/dev/null; os9 copy -r $$p $(DSK),CMDS/$$p && os9 attr -e -pe $(DSK),CMDS/$$p || exit 1; done
	for f in $(ASSETFILES); do os9 del $(DSK),TSK/$$f 2>/dev/null; os9 copy -r assets/$$f $(DSK),TSK/$$f || exit 1; done

mame: tsk $(STAGEMODS) tskview
	LUA=tools/tsk.lua tools/mame.sh

mamebot: tsk $(STAGEMODS) tskview
	LUA=tools/tskbot.lua tools/mame.sh

mameboss: tsk $(STAGEMODS) tskview
	LUA=tools/tskboss.lua tools/mame.sh

mamems: tsk $(STAGEMODS) tskview
	LUA=tools/tskms.lua tools/mame.sh

mamedillon: tsk $(STAGEMODS) tskview
	LUA=tools/tskdillon.lua tools/mame.sh

mamedeath: tsk $(STAGEMODS) tskview
	LUA=tools/tskdeath.lua tools/mame.sh

mamegila: tsk $(STAGEMODS) tskview
	LUA=tools/tskgila.lua tools/mame.sh

mamecattle: tsk $(STAGEMODS) tskview
	LUA=tools/tskcattle.lua tools/mame.sh

mametitle: tsk $(STAGEMODS) tskview
	TSKMIDILOG=$(CURDIR)/mame/midi.log LUA=tools/tskmidi.lua tools/mame.sh
	python3 tools/midicap.py --log mame/midi.log --out mame/midi.mid

mameview: tskview
	tools/mame.sh

host: tsk
	python3 tools/hostrun.py --demo --passes 1100 --every 10

clean:
	rm -f tsk tsk.list tsk.map tskview tskview.list tskview.map

.PHONY: all music assets install mame mamebot mameboss mametitle mamems mamedillon mamedeath mamegila mamecattle mameview host clean
