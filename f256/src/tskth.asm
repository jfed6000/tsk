********************************************************************
* tskth - Texas Shitkickers: the Train Heist's code: the train, Sting.
*
* A stage module (stgmod.a): F$Loaded with the stage's art, from the
* execution directory (CMDS), into the process's free 8K slot.  Its hook
* table and its stubs for the core's routines are tskhk_th.a, the core's
* constants tskcore.d (tools/stagegen.py).
********************************************************************

                    nam       tskth
                    ttl       Texas Shitkickers - the Train Heist's code: the train, Sting

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

name                fcs       /tskth/
                    fcb       edition

                    use       tskhk_th.a
                    use       train.a
                    use       sting.a

                    emod
eom                 equ       *
                    end
