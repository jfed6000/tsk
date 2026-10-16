local script = { {720, "chd /dd/TSK\r"}, {900, "tsk bgs\r"}, {4500, "q"} }
local queue, nextkey = {}, 0
frames = 0
sub = emu.add_machine_frame_notifier(function()
  frames = frames + 1
  for _, e in ipairs(script) do
    if frames == e[1] then for c in e[2]:gmatch('.') do table.insert(queue, c) end end
  end
  if #queue > 0 and frames >= nextkey then manager.machine.natkeyboard:post(table.remove(queue, 1)); nextkey = frames + 6 end
  if frames >= 1300 and frames <= 4400 and frames % 10 == 0 then manager.machine.video:snapshot() end
  if frames == 4600 then manager.machine:exit() end
end)
