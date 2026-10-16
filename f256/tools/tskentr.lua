-- MAME autoboot script for a boss's entrance: "tsk kg" (Two-Bit; change the stage letter for another), snapshots every 20 frames
local script = { {720, "chd /dd/TSK\r"}, {900, "tsk kg\r"}, {2700, "q"} }
local queue, nextkey = {}, 0
frames = 0
sub = emu.add_machine_frame_notifier(function()
  frames = frames + 1
  for _, e in ipairs(script) do if frames == e[1] then for c in e[2]:gmatch('.') do table.insert(queue, c) end end end
  if #queue > 0 and frames >= nextkey then manager.machine.natkeyboard:post(table.remove(queue, 1)); nextkey = frames + 6 end
  if frames >= 1000 and frames <= 2600 and frames % 20 == 0 then manager.machine.video:snapshot() end
  if frames == 2800 then manager.machine:exit() end
end)
