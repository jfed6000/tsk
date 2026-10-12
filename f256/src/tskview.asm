********************************************************************
* tskview - Texas Shitkickers asset viewer (NitrOS-9 Level 2, F256)
*
* The first F256 program of the port, and its graphics harness (port-guide
* section 14: convert the assets on the host, put them on the screen with a
* standalone viewer, prove every graphics primitive the design assumes
* before any game code exists).
*
* It loads what f256/tools/export.py makes from the browser prototype and
* shows Boot Hill the way the game will:
*   - three 16x16 tile maps on three layers (sky, hill, graveyard street),
*     scrolling at 1/4, 1/2 and 1x for parallax: SS.TsSet x3, SS.TmSet,
*     SS.Layer, SS.TmScrl
*   - the Shitkickers and a skeleton gunslinger, each a group of up to eight
*     32x32 sprites built every tick from the frame table (a character is a
*     metasprite), cycling through their animations: SS.SprReg, SS.SprPush
*   - mirrored frames as separate data (there is no flip bit): L
*   - CLUT tricks: lightning = the tile CLUT swapped for a washed-out copy
*     (automatic every ~8 s, or F); the skeleton's hit flash = its sprites
*     switched to CLUT 1, all white (H)
*
* Keys: S scroll on/off, L flip both characters, F lightning, H hit flash,
*       N the hero's next move, Q quit.  Run from the asset directory:
*       chd /dd/TSK ; tskview
*
* Assets live outside the 64K in blocks from SS.GfxAlloc and are loaded one
* 8K window at a time, so the program never holds more than one window.
********************************************************************

                    nam       tskview
                    ttl       Texas Shitkickers asset viewer

                    ifp1
                    use       defsfile
                    use       tskassets.d
                    endc

tylg                set       Prgrm+Objct
atrv                set       ReEnt+rev
rev                 set       $00
edition             set       1

* blocks for each asset (tskassets.d has the byte sizes)
NTilBlk             equ       (TIL.Size+$1FFF)/$2000
NSprBlk             equ       (SPR.Size+$1FFF)/$2000
NMapBlk             equ       (MAP.Size+$1FFF)/$2000

* sprite records: eight per character, hero first
NSlots              equ       8
HeroSlot            equ       0
SkelSlot            equ       8
NRecs               equ       16

* where the characters stand (screen pixels, at their feet)
HeroX               equ       110
HeroY               equ       FLOOR.Y+44
SkelX               equ       222
SkelY               equ       FLOOR.Y+30

CamMax              equ       LEVEL.W-320         the camera's right-hand stop
FlashLen            equ       8                   lightning: frames lit
HitLen              equ       12                  hit flash: frames white

                    mod       eom,name,tylg,atrv,start,size

* direct page (U = DP = the data area at entry)
sigcode             rmb       1                   last signal (0 = none)
mcrlo               rmb       1                   display mode on entry, put back on exit
mcrhi               rmb       1
gfxon               rmb       1                   1 = our display mode is on
tilblk              rmb       1                   first block of each asset (0 = none)
sprblk              rmb       1
mapblk              rmb       1
regd                rmb       1                   1 = the sprite table is registered
sprbase             rmb       3                   physical address of sprblk: hi, mid, lo
fpath               rmb       1                   LoadFile: the path
lblk                rmb       1                   LoadFile: current block
lcnt                rmb       1                   LoadFile: blocks left
loff                rmb       2                   LoadFile: offset in the current block
lmap                rmb       2                   LoadFile: where the block is mapped
tmrec               rmb       12                  SS.TmSet record
cam                 rmb       2                   camera x in the level
camdir              rmb       1                   0 = panning right, 1 = left
scrolling           rmb       1                   1 = the camera pans
ticks               rmb       2                   frames since start
lflash              rmb       1                   lightning: frames left
sflash              rmb       1                   skeleton hit flash: frames left
face                rmb       1                   0 = hero right, skeleton left; 1 = swapped
* animation state, 5 bytes a character: table entry (2), frame, ticks left, loops left
hptr                rmb       2
hfrm                rmb       1
htk                 rmb       1
hlp                 rmb       1
kptr                rmb       2
kfrm                rmb       1
ktk                 rmb       1
klp                 rmb       1
* BuildChar
bcx                 rmb       2                   the character's feet, screen x
bcy                 rmb       2                   and y
bcn                 rmb       1                   cells left in the frame
bslots              rmb       1                   sprite slots left
bctl                rmb       1                   the CTRL byte (enable, CLUT)
tsn                 rmb       1                   Display: tile set counter
dpend               equ       .
* larger buffers, reached through U
recs                rmb       NRecs*8             our sprite table, registered with the driver
frames              rmb       FRM.Size            frames.bin
clutbuf             rmb       1024                sprite CLUT, then the all-white hit-flash CLUT
tclut               rmb       1024                the tile CLUT
fclut               rmb       1024                the tile CLUT, lightning-lit
                    rmb       512                 stack
size                equ       .

name                fcs       /tskview/
                    fcb       edition

********************************************************************
* start - U/DP = the data area
********************************************************************
start               leax      ,u                  clear the direct page variables
                    ldb       #dpend
st1                 clr       ,x+
                    decb
                    bne       st1
                    leax      Icpt,pcr            signals land in sigcode
                    os9       F$Icpt
                    leax      MsgHead,pcr
                    lbsr      WriteLn
                    leax      MsgKeys,pcr
                    lbsr      WriteLn
                    clra                          remember the display mode
                    ldb       #SS.MCR
                    os9       I$GetStt            X = MCR low, Y = MCR high
                    tfr       x,d
                    stb       <mcrlo
                    tfr       y,d
                    stb       <mcrhi
                    lbsr      Alloc
                    lbcs      Fail
                    lbsr      LoadAll
                    lbcs      Fail
                    lbsr      Display
                    lbcs      Fail
                    lbsr      InitAnim

* the main loop: one pass a 60 Hz tick
Main                ldx       #2                  one tick (1 only yields)
                    os9       F$Sleep
                    tst       <sigcode
                    lbne      Quit
                    lbsr      Keys                carry = Q pressed
                    lbcs      Quit
                    lbsr      Camera
                    lbcs      Fail
                    lbsr      Weather
                    lbcs      Fail
                    lbsr      Animate
                    lbsr      Draw
                    lbcs      Fail
                    lbra      Main

Quit                lbsr      Cleanup
                    clrb
                    os9       F$Exit

Fail                pshs      b
                    lbsr      Cleanup
                    leax      MsgErr,pcr
                    lbsr      WriteLn
                    puls      b
                    os9       F$Exit

* Icpt - the signal intercept: U = the data area (as given to F$Icpt)
Icpt                stb       sigcode,u
                    rti

********************************************************************
* Alloc - the asset blocks, outside this process's address space, from
*   SS.GfxAlloc (consecutive blocks the program owns).
*   Exit: carry = error in B
********************************************************************
Alloc               ldx       #NTilBlk
                    lbsr      GfxAlloc
                    bcs       alx
                    tfr       x,d
                    stb       <tilblk
                    ldx       #NSprBlk
                    lbsr      GfxAlloc
                    bcs       alx
                    tfr       x,d
                    stb       <sprblk
                    ldx       #NMapBlk
                    lbsr      GfxAlloc
                    bcs       alx
                    tfr       x,d
                    stb       <mapblk
                    clrb
alx                 rts

* GfxAlloc - X = block count.  Exit: X = first block, carry = error in B
GfxAlloc            pshs      u
                    clra                          path 0
                    ldb       #SS.GfxAlloc
                    os9       I$SetStt
                    puls      u,pc

* GfxFree - B = first block (0 = none), A = count
GfxFree             tstb
                    beq       gf1
                    pshs      u
                    pshs      a
                    clra
                    tfr       d,x                 R$X = the first block
                    puls      b
                    clra
                    tfr       d,u                 R$U = the count
                    clra                          path 0
                    ldb       #SS.GfxFree
                    os9       I$SetStt
                    puls      u
gf1                 rts

********************************************************************
* LoadAll - every asset file.  Exit: carry = error in B
********************************************************************
LoadAll             lda       <tilblk
                    ldb       #NTilBlk
                    ldy       #0
                    leax      FTiles,pcr
                    lbsr      LoadFile
                    bcs       lax
                    lda       <sprblk
                    ldb       #NSprBlk
                    ldy       #0
                    leax      FSprites,pcr
                    lbsr      LoadFile
                    bcs       lax
                    lda       <mapblk
                    ldb       #NMapBlk
                    ldy       #0
                    leax      FMaps,pcr
                    lbsr      LoadFile
                    bcs       lax
                    leax      FFrames,pcr
                    leay      frames,u
                    ldd       #FRM.Size
                    lbsr      LoadData
                    bcs       lax
                    leax      FClutS,pcr
                    leay      clutbuf,u
                    ldd       #1024
                    lbsr      LoadData
                    bcs       lax
                    leax      FClutT,pcr
                    leay      tclut,u
                    ldd       #1024
                    lbsr      LoadData
                    bcs       lax
                    leax      FClutF,pcr
                    leay      fclut,u
                    ldd       #1024
                    lbsr      LoadData
lax                 rts

********************************************************************
* LoadFile - read a file into asset blocks, one block at a time (from
*   jstview).  Entry: X = pathname, A = first block, B = block count,
*   Y = offset into the first block.  Exit: carry = error in B; a short
*   file is not an error.  Only ever one window mapped.
********************************************************************
LoadFile            sta       <lblk
                    stb       <lcnt
                    sty       <loff
                    lda       #READ.
                    os9       I$Open
                    bcs       lfret
                    sta       <fpath
lfblk               pshs      u
                    clra
                    ldb       <lblk
                    tfr       d,x
                    ldb       #1
                    os9       F$MapBlk            U = the block in this process
                    bcs       lfmaperr
                    stu       <lmap
                    ldd       #$2000
                    subd      <loff
                    tfr       d,y                 Y = room left in the block
                    ldd       <loff
                    leax      d,u                 X = where the read goes
                    lda       <fpath
                    os9       I$Read              Y = bytes read
                    pshs      cc,b                keep the read result
                    ldu       <lmap
                    ldb       #1
                    os9       F$ClrBlk
                    puls      cc,b
                    puls      u                   the data area again
                    bcc       lfgot
                    cmpb      #E$EOF
                    beq       lfdone
                    bra       lferr
lfgot               ldd       #$2000
                    subd      <loff
                    pshs      d
                    cmpy      ,s++
                    blo       lfdone              short read: the end of the file
                    clr       <loff
                    clr       <loff+1
                    inc       <lblk
                    dec       <lcnt
                    bne       lfblk
lfdone              lda       <fpath
                    os9       I$Close
                    clrb
                    rts
lfmaperr            puls      u
lferr               pshs      b
                    lda       <fpath
                    os9       I$Close
                    puls      b
                    coma
lfret               rts

********************************************************************
* LoadData - read a small file into the data area.
*   Entry: X = pathname, Y = the buffer, D = bytes.  Exit: carry = error
********************************************************************
LoadData            pshs      y,u
                    pshs      d                   ,s = bytes, 2,s = buffer, 4,s = data area
                    lda       #READ.
                    os9       I$Open              A = the path
                    bcs       ld9
                    ldx       2,s
                    ldy       ,s
                    pshs      a
                    os9       I$Read
                    puls      a
                    pshs      cc,b
                    os9       I$Close
                    puls      cc,b
ld9                 leas      2,s                 (LEAS leaves CC alone)
                    puls      y,u,pc

********************************************************************
* Display - CLUTs, the sprite table, tile sets, tile maps, layers, and
*   the display mode.  Exit: carry = error in B
********************************************************************
Display             leax      clutbuf,u           CLUT 0: the sprite colours
                    ldy       #CLUT.Spr*256
                    ldd       #256
                    lbsr      ClutWrite
                    lbcs      dsx
* CLUT 1: every colour white, for the hit flash (entry 0 stays transparent)
                    leax      clutbuf,u
                    clr       ,x+
                    clr       ,x+
                    clr       ,x+
                    clr       ,x+
                    ldy       #255*2
                    ldd       #$FFFF
ds1                 std       ,x++
                    leay      -1,y
                    bne       ds1
                    leax      clutbuf,u
                    ldy       #CLUT.Fls*256
                    ldd       #256
                    lbsr      ClutWrite
                    lbcs      dsx
                    leax      tclut,u             CLUT 3: the tile colours
                    ldy       #CLUT.Til*256
                    ldd       #256
                    lbsr      ClutWrite
                    lbcs      dsx
* the sprites' base address, and our sprite table
                    lda       <sprblk
                    lbsr      BlkAddr
                    std       <sprbase
                    clr       <sprbase+2
                    leax      recs,u
                    pshs      u
                    ldy       #0                  R$Y = 0: the table is in our own map
                    ldu       #NRecs              R$U = the records we own
                    clra
                    ldb       #SS.SprReg
                    os9       I$SetStt
                    puls      u
                    lbcs      dsx
                    lda       #1
                    sta       <regd
                    lbsr      ClearRecs
                    lbsr      PushRecs
                    lbcs      dsx
* tile sets: set k is the 64K at tilblk + 8k (linear, CFG 0)
                    clr       <tsn
ds2                 lda       <tsn
                    lsla
                    lsla
                    lsla
                    adda      <tilblk
                    tfr       a,b
                    clra
                    tfr       d,x                 R$X = the block
                    clra
                    ldb       <tsn
                    tfr       d,y                 R$Y = CFG 0 : set k
                    pshs      u
                    ldu       #0                  R$U = offset 0
                    clra
                    ldb       #SS.TsSet
                    os9       I$SetStt
                    puls      u
                    lbcs      dsx
                    inc       <tsn
                    lda       <tsn
                    cmpa      #TIL.Sets
                    blo       ds2
* tile maps 0-2, all in one block at the offsets the exporter gave
                    ldy       #MAP0.Of
                    ldd       #MAP0.W
                    ldx       #0
                    lbsr      OneMap
                    bcs       dsx
                    ldy       #MAP1.Of
                    ldd       #MAP1.W
                    ldx       #1
                    lbsr      OneMap
                    bcs       dsx
                    ldy       #MAP2.Of
                    ldd       #MAP2.W
                    ldx       #2
                    lbsr      OneMap
                    bcs       dsx
* layers: 0 is in front.  The street (map 2) leads, the sky (map 0) trails.
                    ldx       #0
                    ldy       #6
                    lbsr      OneLayer
                    bcs       dsx
                    ldx       #1
                    ldy       #5
                    lbsr      OneLayer
                    bcs       dsx
                    ldx       #2
                    ldy       #4
                    lbsr      OneLayer
                    bcs       dsx
* graphics, tiles and sprites on; text off
                    pshs      u
                    ldx       #FX_GRF+FX_TIL+FX_SPR
                    ldy       #FT_OMIT            leave the mode byte alone
                    clra
                    ldb       #SS.MCR
                    os9       I$SetStt
                    puls      u
                    bcs       dsx
                    lda       #1
                    sta       <gfxon
                    clrb
dsx                 rts

* OneMap - X = map number, Y = offset in mapblk, D = width in tiles
OneMap              pshs      x,d                 ,s = width, 2,s = map number
                    lbsr      ClearTmRec
                    leax      tmrec,u
                    lda       #%00000001          enable, 16x16 tiles
                    sta       ,x
                    lda       <mapblk
                    sta       1,x                 the block
                    sty       2,x                 the offset in it
                    ldd       ,s
                    std       4,x                 SIZE_X
                    ldd       #MAP.H
                    std       6,x                 SIZE_Y
                    puls      d,y                 Y = the map number
                    leax      tmrec,u
* SendRec - X = the record, Y = the map number
SendRec             pshs      u
                    clra
                    ldb       #SS.TmSet
                    os9       I$SetStt
                    puls      u
                    rts

* OneLayer - X = layer 0-2, Y = source (4-6 = tile map 0-2)
OneLayer            pshs      u
                    clra
                    ldb       #SS.Layer
                    os9       I$SetStt
                    puls      u
                    rts

ClearTmRec          leax      tmrec,u
                    ldb       #12
ct1                 clr       ,x+
                    decb
                    bne       ct1
                    rts

********************************************************************
* Camera - pan back and forth across the level when scrolling, and set
*   the three maps' scroll: street 1x, hill 1/2, sky 1/4 (SS.TmScrl).
*   Exit: carry = error in B
********************************************************************
Camera              tst       <scrolling
                    beq       cm3
                    ldd       <cam
                    tst       <camdir
                    bne       cm1
                    addd      #1
                    cmpd      #CamMax
                    blo       cm2
                    inc       <camdir
                    bra       cm2
cm1                 subd      #1
                    bne       cm2
                    clr       <camdir
cm2                 std       <cam
cm3                 ldx       <cam
                    ldy       #2
                    lbsr      Scrl
                    bcs       cmx
                    ldd       <cam
                    lsra
                    rorb
                    tfr       d,x
                    ldy       #1
                    lbsr      Scrl
                    bcs       cmx
                    ldd       <cam
                    lsra
                    rorb
                    lsra
                    rorb
                    tfr       d,x
                    ldy       #0
                    lbsr      Scrl
cmx                 rts

* Scrl - Y = map number, X = X scroll (Y scroll 0)
Scrl                pshs      u
                    ldu       #0
                    clra
                    ldb       #SS.TmScrl
                    os9       I$SetStt
                    puls      u
                    rts

********************************************************************
* Weather - the tick count, lightning now and then, the flashes running
*   down.  Lightning swaps the tile CLUT for its lit copy: one
*   SS.ClutWrite, and another to put the night back.
*   Exit: carry = error in B
********************************************************************
Weather             ldd       <ticks
                    addd      #1
                    std       <ticks
                    anda      #%00000001          every 512 ticks (~8.5 s)
                    bne       we1
                    tstb
                    bne       we1
                    lbsr      Bolt
                    bcs       wex
we1                 tst       <lflash
                    beq       we2
                    dec       <lflash
                    bne       we2
                    leax      tclut,u             the night again
                    ldy       #CLUT.Til*256
                    ldd       #256
                    lbsr      ClutWrite
                    bcs       wex
we2                 tst       <sflash
                    beq       we3
                    dec       <sflash
we3                 clrb
wex                 rts

Bolt                lda       #FlashLen
                    sta       <lflash
                    leax      fclut,u
                    ldy       #CLUT.Til*256
                    ldd       #256
* ClutWrite - X = B,G,R,A entries, Y = CLUT number * 256 + first entry,
*   D = count.  Exit: carry = error in B
ClutWrite           pshs      u
                    tfr       d,u
                    clra
                    ldb       #SS.ClutWrite
                    os9       I$SetStt
                    puls      u,pc

********************************************************************
* Keys - Exit: carry set = quit
********************************************************************
Keys                lbsr      InKey               A = the key, 0 = none
                    tsta
                    beq       kyx
                    ora       #$20                lower case
                    cmpa      #'q
                    beq       kyq
                    cmpa      #'s
                    bne       ky1
                    lda       <scrolling
                    eora      #1
                    sta       <scrolling
                    bra       kyx
ky1                 cmpa      #'l
                    bne       ky2
                    lda       <face
                    eora      #1
                    sta       <face
                    bra       kyx
ky2                 cmpa      #'f
                    bne       ky3
                    lbsr      Bolt
                    bra       kyx
ky3                 cmpa      #'h
                    bne       ky4
                    lda       #HitLen
                    sta       <sflash
                    bra       kyx
ky4                 cmpa      #'n
                    bne       kyx
                    lda       #1                  end the hero's move on the next tick
                    sta       <htk
                    sta       <hlp
                    ldx       <hptr
                    lda       2,x
                    deca
                    sta       <hfrm
kyx                 clrb
                    rts
kyq                 comb
                    rts

* InKey - A = the next key from path 0, or 0 if none is waiting (jstview)
InKey               clra
                    ldb       #SS.Ready
                    os9       I$GetStt
                    bcs       ik0
                    leas      -1,s
                    clra
                    ldy       #1
                    tfr       s,x
                    pshs      u
                    os9       I$Read
                    puls      u
                    puls      a
                    bcs       ik0
                    rts
ik0                 clra
                    rts

********************************************************************
* Animation.  A table entry is 5 bytes: first frame (2), frame count,
*   ticks a frame, times to play it; $FFFF ends the table.  A character's
*   state is 5 bytes too: the entry, frame, ticks left, plays left.
********************************************************************
InitAnim            leay      hptr,u
                    leax      HeroTab,pcr
                    lbsr      AnimStart
                    leay      kptr,u
                    leax      SkelTab,pcr
* AnimStart - Y = the state, X = the entry
AnimStart           stx       ,y
                    clr       2,y
                    lda       3,x
                    sta       3,y
                    lda       4,x
                    sta       4,y
                    rts

Animate             leay      hptr,u
                    leax      HeroTab,pcr
                    lbsr      Step
                    leay      kptr,u
                    leax      SkelTab,pcr
* Step - Y = the state, X = the table (to wrap to)
Step                dec       3,y                 ticks left
                    bne       sp9
                    pshs      x
                    ldx       ,y                  the entry
                    lda       3,x
                    sta       3,y
                    inc       2,y                 next frame
                    lda       2,y
                    cmpa      2,x
                    blo       sp8
                    clr       2,y
                    dec       4,y                 played it once more
                    bne       sp8
                    leax      5,x                 next move
                    ldd       ,x
                    cmpd      #$FFFF
                    bne       sp7
                    ldx       ,s                  the end: back to the first
sp7                 lbsr      AnimStart           Y = the state, X = the new entry
sp8                 puls      x
sp9                 rts

* CurFrame - Y = the state.  Exit: D = the frame (facing right)
CurFrame            ldx       ,y
                    ldd       ,x
                    addb      2,y
                    adca      #0
                    rts

********************************************************************
* Draw - both characters into the sprite table, then one SprPush.
*   Exit: carry = error in B
********************************************************************
Draw                leay      hptr,u              the hero
                    lbsr      CurFrame
                    tst       <face
                    beq       dr1
                    addd      #HR.Mir             facing left: the mirrored copy
dr1                 pshs      d
                    ldd       #HeroX
                    std       <bcx
                    ldd       #HeroY
                    std       <bcy
                    lda       #%00000001+CLUT.Spr*2   enable, CLUT 0
                    sta       <bctl
                    puls      d
                    leax      recs+HeroSlot*8,u
                    lbsr      BuildChar
                    leay      kptr,u              the skeleton: faces left unless flipped
                    lbsr      CurFrame
                    tst       <face
                    bne       dr2
                    addd      #SK.Mir
dr2                 pshs      d
                    ldd       #SkelX
                    std       <bcx
                    ldd       #SkelY
                    std       <bcy
                    lda       #%00000001+CLUT.Spr*2
                    tst       <sflash
                    beq       dr3
                    lda       #%00000001+CLUT.Fls*2   hit: all white
dr3                 sta       <bctl
                    puls      d
                    leax      recs+SkelSlot*8,u
                    lbsr      BuildChar
PushRecs            ldy       #0
                    ldd       #NRecs
* SprPush - Y = first record, D = count
SprPush             pshs      u
                    tfr       d,u
                    clra
                    ldb       #SS.SprPush
                    os9       I$SetStt
                    puls      u,pc

********************************************************************
* BuildChar - one character as a group of 32x32 sprites.
*   Entry: X = its first record, D = the frame, bcx/bcy = its feet,
*   bctl = the CTRL byte.  Each cell of the frame (frames.bin: count,
*   then dx, dy, cell number) becomes one record:
*     ADDR = sprbase + cell * 1024,  X = feet x + dx + 32,  Y = feet y + dy + 32
*   (the visible screen starts at 32,32).  Slots the frame doesn't use
*   are switched off.
********************************************************************
BuildChar           tfr       x,y                 Y = the records
                    leax      frames,u
                    lslb
                    rola                          D = frame * 2
                    addd      #2
                    ldd       d,x                 D = the frame's offset in frames.bin
                    leax      d,x                 X = the frame
                    lda       ,x+
                    sta       <bcn
                    lda       #NSlots
                    sta       <bslots
                    tst       <bcn
                    beq       bc5
bc1                 lda       <bctl
                    sta       ,y                  CTRL
                    ldd       2,x                 the cell number
                    lslb
                    rola
                    lslb
                    rola                          cell * 4 = address bits 23:8
                    addb      <sprbase+1
                    adca      <sprbase
                    std       1,y                 ADDR hi, mid
                    clr       3,y                 ADDR lo
                    ldb       ,x                  dx
                    sex
                    addd      <bcx
                    addd      #32
                    std       4,y
                    ldb       1,x                 dy
                    sex
                    addd      <bcy
                    addd      #32
                    std       6,y
                    leax      4,x
                    leay      8,y
                    dec       <bslots
                    beq       bc9                 no slots left
                    dec       <bcn
                    bne       bc1
bc5                 clr       ,y                  the rest off
                    leay      8,y
                    dec       <bslots
                    bne       bc5
bc9                 rts

ClearRecs           leax      recs,u
                    ldb       #NRecs*8
cr1                 clr       ,x+
                    decb
                    bne       cr1
                    rts

* BlkAddr - physical address of a block: A = block -> A = hi, B = mid
BlkAddr             clrb
                    lsra
                    rorb
                    lsra
                    rorb
                    lsra
                    rorb
                    rts

********************************************************************
* Cleanup - every exit path.  Everything VICKY reads goes off BEFORE the
*   blocks are freed: it reads them by physical address and has no idea
*   this program is leaving.
********************************************************************
Cleanup             pshs      cc,d,x,y
                    tst       <regd
                    beq       cu1
                    lbsr      ClearRecs
                    lbsr      PushRecs
                    pshs      u
                    ldu       #0                  a count of 0 gives the table up
                    clra
                    ldb       #SS.SprReg
                    os9       I$SetStt
                    puls      u
                    clr       <regd
cu1                 lbsr      ClearTmRec          tile maps off
                    leax      tmrec,u
                    ldy       #0
                    lbsr      SendRec
                    leax      tmrec,u
                    ldy       #1
                    lbsr      SendRec
                    leax      tmrec,u
                    ldy       #2
                    lbsr      SendRec
                    clr       <tsn                tile sets off (block 0)
cu2                 clra
                    ldb       <tsn
                    tfr       d,y
                    pshs      u
                    ldx       #0
                    ldu       #0
                    clra
                    ldb       #SS.TsSet
                    os9       I$SetStt
                    puls      u
                    inc       <tsn
                    lda       <tsn
                    cmpa      #TIL.Sets
                    blo       cu2
                    tst       <gfxon              the display mode as it was
                    beq       cu3
                    pshs      u
                    clra
                    ldb       <mcrlo
                    tfr       d,x
                    ldb       <mcrhi
                    tfr       d,y
                    clra
                    ldb       #SS.MCR
                    os9       I$SetStt
                    puls      u
                    clr       <gfxon
cu3                 lda       #NTilBlk            and only then free the blocks
                    ldb       <tilblk
                    lbsr      GfxFree
                    lda       #NSprBlk
                    ldb       <sprblk
                    lbsr      GfxFree
                    lda       #NMapBlk
                    ldb       <mapblk
                    lbsr      GfxFree
                    clr       <tilblk
                    clr       <sprblk
                    clr       <mapblk
                    puls      cc,d,x,y,pc

* WriteLn - X = a $0D-terminated string, to path 1
WriteLn             pshs      d,x,y,u
                    lda       #1
                    ldy       #80
                    os9       I$WritLn
                    puls      d,x,y,u,pc

********************************************************************
* The animation tables: first frame, count, ticks a frame, plays
********************************************************************
HeroTab             fdb       HR.idle
                    fcb       HR.idle.N,HR.idle.T,1
                    fdb       HR.run
                    fcb       HR.run.N,HR.run.T,4
                    fdb       HR.snap
                    fcb       HR.snap.N,HR.snap.T,2
                    fdb       HR.side
                    fcb       HR.side.N,HR.side.T,1
                    fdb       HR.bike
                    fcb       HR.bike.N,HR.bike.T,3
                    fdb       HR.jump
                    fcb       HR.jump.N,20,1
                    fdb       HR.stomp
                    fcb       HR.stomp.N,20,1
                    fdb       HR.whip
                    fcb       HR.whip.N,HR.whip.T,2
                    fdb       HR.shoot
                    fcb       HR.shoot.N,8,3
                    fdb       HR.taunt
                    fcb       HR.taunt.N,HR.taunt.T,1
                    fdb       HR.hurt
                    fcb       HR.hurt.N,HR.hurt.T,2
                    fdb       $FFFF

SkelTab             fdb       SK.walk
                    fcb       SK.walk.N,SK.walk.T,3
                    fdb       SK.aim
                    fcb       SK.aim.N,30,1
                    fdb       SK.shoot
                    fcb       SK.shoot.N,12,1
                    fdb       SK.idle
                    fcb       SK.idle.N,SK.idle.T,1
                    fdb       SK.reload
                    fcb       SK.reload.N,SK.reload.T,4
                    fdb       SK.hurt
                    fcb       SK.hurt.N,20,1
                    fdb       SK.heap
                    fcb       SK.heap.N,40,1
                    fdb       SK.rise
                    fcb       SK.rise.N,SK.rise.T,1
                    fdb       SK.headless
                    fcb       SK.headless.N,SK.headless.T,4
                    fdb       $FFFF

********************************************************************
* Names and messages
********************************************************************
FTiles              fcc       /tiles.bin/
                    fcb       $0D
FSprites            fcc       /sprites.bin/
                    fcb       $0D
FMaps               fcc       /maps.bin/
                    fcb       $0D
FFrames             fcc       /frames.bin/
                    fcb       $0D
FClutS              fcc       /clut_spr.bin/
                    fcb       $0D
FClutT              fcc       /clut_tile.bin/
                    fcb       $0D
FClutF              fcc       /clut_flash.bin/
                    fcb       $0D
MsgHead             fcc       /tskview - Texas Shitkickers asset viewer/
                    fcb       $0D
MsgKeys             fcc       /S scroll  L flip  F lightning  H hit  N next  Q quit/
                    fcb       $0D
MsgErr              fcc       /tskview failed - see the error code/
                    fcb       $0D

                    emod
eom                 equ       *
                    end
