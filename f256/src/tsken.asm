********************************************************************
* tsken - Texas Shitkickers: the ending's code: Boot Hill at sundown, the boot shop.
*
* A stage module (stgmod.a): F$Loaded with the stage's art, from the
* execution directory (CMDS), into the process's free 8K slot.  Its hook
* table and its stubs for the core's routines are tskhk_en.a, the core's
* constants tskcore.d (tools/stagegen.py).
********************************************************************

                    nam       tsken
                    ttl       Texas Shitkickers - the ending's code: Boot Hill at sundown, the boot shop

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

name                fcs       /tsken/
                    fcb       edition

                    use       tskhk_en.a
                    use       ending.a

                    emod
eom                 equ       *
                    end
