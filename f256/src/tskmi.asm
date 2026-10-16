********************************************************************
* tskmi - Texas Shitkickers: the Mission's code: the siege, Bullrush.
*
* A stage module (stgmod.a): F$Loaded with the stage's art, from the
* execution directory (CMDS), into the process's free 8K slot.  Its hook
* table and its stubs for the core's routines are tskhk_mi.a, the core's
* constants tskcore.d (tools/stagegen.py).
********************************************************************

                    nam       tskmi
                    ttl       Texas Shitkickers - the Mission's code: the siege, Bullrush

                    ifp1
                    use       defsfile
                    use       tskassets.d
                    use       tskmusic.d
                    use       tskcore.d
                    endc

tylg                set       Sbrtn+Objct
atrv                set       ReEnt+rev
rev                 set       $00
edition             set       1

                    mod       eom,name,tylg,atrv,HookTab,size

                    use       data.a

name                fcs       /tskmi/
                    fcb       edition

                    use       tskhk_mi.a
                    use       mission.a
                    use       toro.a

                    emod
eom                 equ       *
                    end
