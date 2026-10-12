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
*   tsk d      the demo: a scripted input sequence (the MAME test path)
*
* Run from the asset directory: chd /dd/TSK ; tsk
*
* Files: data.a (the data area), platform.a (start-up, loading, the
* display, the frame loop, input, pause, exit), hero.a (the Shitkickers),
* draw.a (camera, display list, sprite records).
********************************************************************

                    nam       tsk
                    ttl       Texas Shitkickers

                    ifp1
                    use       defsfile
                    use       tskassets.d
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
                    use       draw.a

                    emod
eom                 equ       *
                    end
