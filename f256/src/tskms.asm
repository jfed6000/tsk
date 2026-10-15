********************************************************************
* tskms - Texas Shitkickers: Main Street's code: Big Shell Dillon.
*
* A stage module (stgmod.a): F$Loaded with the stage's art, from the
* execution directory (CMDS), into the process's free 8K slot.  Its hook
* table and its stubs for the core's routines are tskhk_ms.a, the core's
* constants tskcore.d (tools/stagegen.py).
********************************************************************

                    nam       tskms
                    ttl       Texas Shitkickers - Main Street's code: Big Shell Dillon

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

name                fcs       /tskms/
                    fcb       edition

                    use       tskhk_ms.a
                    use       dillon.a

                    emod
eom                 equ       *
                    end
