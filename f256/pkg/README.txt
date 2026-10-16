TEXAS SHITKICKERS
for the Wildbits F256 (NitrOS-9 Level 2)

Ringo was in the way. The Diamondback Gang gunned him down and buried
him on Boot Hill with his boots on. Ringo stayed dead. His boots didn't.

A side-scrolling brawler in 6809 assembly: seven stages, seven bosses,
SAM2695 music. Tested on the F256K2.


WHAT'S IN THE ZIP

  CMDS/tsk     the game (an OS-9 module)
  TSK/         its stage modules, graphics and music

(The game's in CMDS/ so the zip unpacks on a case-insensitive disk, like
macOS's or Windows', where a file "tsk" and a folder "TSK" would clash.)
  install.sh   optional: installs onto a disk image with ToolShed
  README.txt   this file


INSTALLING

1. Copy  CMDS/tsk  to your CMDS directory and make it executable:

       copy tsk /dd/CMDS/tsk
       attr /dd/CMDS/tsk e pe

2. Copy the TSK folder to the root of your drive, as /dd/TSK, with
   all 78 files in it. The seven stage modules need the execute bit:

       makdir /dd/TSK
       (copy every file from TSK/ into /dd/TSK)
       chd /dd/TSK
       attr tskms tskgt tskcd tskth tskmi tskhn tsken e pe

   With ToolShed on a PC, install.sh does both steps on a disk image:

       sh install.sh /path/to/your.dsk


PLAYING

       chd /dd/TSK
       tsk

The game must run from inside the TSK folder: it loads its stages and
graphics from the current directory.

  Arrows        move (up and down move along the street)
  Space or Z    jump
  X             kick (tap for a combo; back + X is the side kick)
  C             side kick
  X on a weapon picks it up
  T             taunt
  Q             quit

Your hat is your life. Lose them all and it's back to Boot Hill. Win
more every 30,000 points, and one is hidden somewhere on every stage.
Look for something at the back of the street that glints, and kick it.

It needs about 1.7 MB of free memory for its graphics and music (an
F256K2 has room). If there isn't enough, it says so and stops: close
other programs or windows, or reboot, and try again.

In MAME, the F256's synth isn't emulated: run fluidsynth as a MIDI
decoder to hear the music and the sound effects. See the note at the
top of https://github.com/rlucente-retro/mame
