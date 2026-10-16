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

* the Train Heist (train.a, sting.a): Sting's states (1 approach, 4 recover, 5 stagger, 8 dizzy, 9 KO as Dillon's,
*   where boss.a's shared code tests them), his health; the tunnel's phases; the tables
SS.Intro            equ       0
SS.Appr             equ       1
SS.PinchW           equ       2
SS.Pinch            equ       3
SS.Recov            equ       4
SS.Stag             equ       5
SS.Duck             equ       6                   flat for a tunnel
SS.Retreat          equ       7                   scuttling back to throw
SS.Daze             equ       8
SS.Ko               equ       9
SS.WindUp           equ       10                  the tail cocked
SS.Sting            equ       11
SS.Stuck            equ       12                  the sting stuck in the roof: open
SS.Light            equ       13
SS.Toss             equ       14
StHp                equ       56
TN.Warn             equ       1
TN.Mouth            equ       2
TN.Inside           equ       3
TN.Exit             equ       4
NProp               equ       2
PR.On               equ       0
PR.X                equ       1                   screen x, 12.4
PR.Size             equ       3
NStk                equ       6                   sticks of dynamite at once
SK.On               equ       0
SK.Kick             equ       1                   1 = kicked: sliding down the lane
SK.Fuse             equ       2                   passes to the bang
SK.X                equ       3
SK.Z                equ       5
SK.H                equ       7
SK.VX               equ       9
SK.VZ               equ       11
SK.VH               equ       13
SK.Size             equ       15
NBoom               equ       4
BM.T                equ       0                   passes since the bang (0 = free; it starts at 1)
BM.X                equ       1
BM.Z                equ       3
BM.Size             equ       5

* the Mission (mission.a, toro.a): El Toro's states (1 approach, 4 recover, 5 stagger, 8 stuck - Dillon's dizzy: half
*   again damage - and 9 KO as Dillon's, where boss.a's shared code tests them), his health; the doors; the dust walls
TS.Intro            equ       0                   through the side gate at a charge: "SAY YER PRAYERS, BOOTS!"
TS.Appr             equ       1
TS.HookW            equ       2                   head down to scoop
TS.Hook             equ       3                   the horns flung up: tossed
TS.Recov            equ       4
TS.Stag             equ       5
TS.Paw              equ       6                   pawing the dirt, lining up on your lane
TS.Charge           equ       7
TS.Stuck            equ       8                   horns in the wall or the doors: open
TS.Ko               equ       9
TS.Back             equ       10                  backing off for a run at you
TS.Rear             equ       11                  up on his hooves
TS.Stomp            equ       12                  and down: a wall of dust rolls out
ToroHp              equ       60
DoorHp              equ       30
NShk                equ       2
SH.On               equ       0
SH.X                equ       1                   where it started, 12.4
SH.Z                equ       3
SH.R                equ       5                   how far it's rolled, 12.4
SH.Hit              equ       7                   who it's hit: a bit a slot, bit 7 the hero
SH.Size             equ       8

* High Noon (diamond.a): Diamondback's states (1 approach, 4 recover, 5 stagger, 8 open - stretched out after a missed
*   strike, or dizzy after the duel: Dillon's dizzy, half again damage - and 9 KO as Dillon's), his health; the
*   ending's steps (ending.a)
DK.Duel             equ       0                   the standoff at the clock tower (not hittable)
DK.Appr             equ       1
DK.Draw             equ       2                   the gun up
DK.Fan              equ       3                   fanning the hammer
DK.Recov            equ       4
DK.Stag             equ       5
DK.Reload           equ       6
DK.Coil             equ       7                   drawn back, rattling: the strike coming
DK.Open             equ       8                   stretched out (dbstun 0) or dizzy (1): open
DK.Ko               equ       9
DK.Strike           equ       10
DK.Whip             equ       11
DbHp                equ       64
EQ.Walk             equ       0                   the ending: up to Ringo's grave
EQ.Stand            equ       1
EQ.Tip              equ       2                   the hat tip
EQ.Leave            equ       3                   off into the sunset
EQ.TheEnd           equ       4
EQ.Shop             equ       5                   the boot shop (the bitmap)
