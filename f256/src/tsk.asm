********************************************************************
* tsk - Texas Shitkickers (NitrOS-9 Level 2, Wildbits F256, 6809)
*
* The game, translated by hand from the browser prototype
* (game/js/brawler.js), which stays the reference for behaviour and
* numbers.  The art comes only through the exporter (tools/export.py ->
* assets/*.bin + tskassets.d).  The plan is docs/port-plan.md.
*
*   tsk        play (arrows move, Z or space jump, X kick, C side kick,
*              T taunt, Q quit; back + X is the side kick too)
*   tsk d      the demo: a scripted input sequence
*   tsk b      the autopilot fights (the MAME test path for combat)
*   tsk g      nothing hurts him (with b: tsk bg)
*
* Run from the asset directory: chd /dd/TSK ; tsk
*
* Files: data.a (the data area), platform.a (start-up, loading, the
* display, the frame loop, input, pause, exit), hero.a (the Shitkickers),
* enemy.a (the skeleton gunslingers, combat, particles, the autopilot),
* draw.a (camera, display list, sprite records), tsktabs.a (generated:
* the hero's attack boxes).
********************************************************************

                    nam       tsk
                    ttl       Texas Shitkickers

                    ifp1
                    use       defsfile
                    use       tskassets.d
                    use       tskmusic.d
                    endc

tylg                set       Prgrm+Objct
atrv                set       ReEnt+rev
rev                 set       $00
edition             set       1

                    mod       eom,name,tylg,atrv,start,size

                    use       data.a

name                fcs       /tsk/
                    fcb       edition

                    use       platform.a
                    use       hero.a
                    use       enemy.a
                    use       stage.a
                    use       hud.a
                    use       pickup.a
                    use       intro.a
                    use       boss.a
                    use       snd.a
                    use       title.a
                    use       amb.a
                    use       draw.a
                    use       tsktabs.a

                    emod
eom                 equ       *
                    end
