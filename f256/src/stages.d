********************************************************************
* stages.d - the stage modules' constants the core uses too (data.a
*   brings it into the core and every stage module)
********************************************************************

* Big Shell Dillon (dillon.a): his states, his health
DS.Intro            equ       0                   "THIS HERE'S MY TOWN!"
DS.Appr             equ       1
DS.Wind             equ       2
DS.Swipe            equ       3
DS.Recov            equ       4
DS.Stag             equ       5
DS.Curl             equ       6                   curling up (not hittable)
DS.Roll             equ       7                   a boulder down the lane (not hittable: kick it back)
DS.Daze             equ       8
DS.Ko               equ       9
DlnHp               equ       40

* Doc Gila (ghost.a): his states, his health
GS.Intro            equ       0                   "READ 'EM AND WEEP, BOOTS!"
GS.Appr             equ       1
GS.Deal             equ       2                   winding up a throw
GS.Flick            equ       3                   the fan of cards flies
GS.Recov            equ       4
GS.Stag             equ       5
GS.Cover            equ       6                   behind the table (not hittable)
GS.CDeal            equ       7                   dealing from behind it (not hittable)
GS.Daze             equ       8
GS.Ko               equ       9
GS.Jaws             equ       10                  the bite's wind-up
GS.Bite             equ       11
GS.CFlick           equ       12                  cards from behind the table (not hittable)
GS.Vanish           equ       13                  the card trick: gone (not drawn, not hittable)
GS.Crouch           equ       14                  about to leap
GS.Leap             equ       15                  going up off the screen (not hittable)
GS.Hang             equ       16                  up there, his shadow hunting you (not hittable)
GS.Drop             equ       17                  coming down on it (not hittable)
GS.Land             equ       18                  landed heavy: open a while, no tricks
GilaHp              equ       44

* Jackrabbit Jack (jack.a): his states, his health
JS.Intro            equ       0                   over the fence: "FINDERS KEEPERS, BOOTS!"
JS.Appr             equ       1
JS.Crouch           equ       2                   about to hop
JS.Hop              equ       3                   in the air (not hittable)
JS.Recov            equ       4
JS.Stag             equ       5
JS.Land             equ       6                   landed: open
JS.Turn             equ       7                   turning his back: the mule kick coming
JS.Daze             equ       8
JS.Ko               equ       9
JS.Kick             equ       10
JS.Spin             equ       11                  the lasso round his head
JS.Throw            equ       12
JS.Reel             equ       13                  you on the end of his rope
JackHp              equ       46

* the ride (ride.a)
RideV               equ       32                  2 px a pass
Loop                equ       640
Saddle              equ       26                  how high he sits on the steer
RdHp                equ       6
