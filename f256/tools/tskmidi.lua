-- MAME autoboot script: the title screen and its music. Starts "tsk" (the title), logs every byte written to the
-- SAM2695's FIFO ($FF31) as "frame byte" lines to mame/midi.log (tools/midicap.py --log turns it into a .mid),
-- snapshots the title, presses space (jump) to start a game, snapshots the opening, quits.
local script = {
  {720,  "chd /dd/TSK\r"},
  {900,  "tsk\r"},
  {2100, " "},          -- jump: the game starts (the opening, Boot Hill's theme)
  {2700, "q"},
}
local queue, nextkey = {}, 0
frames = 0
local log = io.open(os.getenv("TSKMIDILOG") or "midi.log", "w")
local space = manager.machine.devices[":maincpu"].spaces["program"]
tap = space:install_write_tap(0xff31, 0xff31, "midi", function(offset, data, mask)
  log:write(frames, " ", data & 0xff, "\n")
  return data
end)
sub = emu.add_machine_frame_notifier(function()   -- keep the subscription in a global
  frames = frames + 1
  for _, e in ipairs(script) do
    if frames == e[1] then for c in e[2]:gmatch('.') do table.insert(queue, c) end end
  end
  if #queue > 0 and frames >= nextkey then
    manager.machine.natkeyboard:post(table.remove(queue, 1)); nextkey = frames + 6
  end
  if (frames >= 1000 and frames <= 2680 and frames % 30 == 0) then manager.machine.video:snapshot() end
  if frames == 2800 then log:close(); manager.machine:exit() end
end)
