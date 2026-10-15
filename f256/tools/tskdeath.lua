-- MAME autoboot script for the death scene: "tsk mkf" (Big Shell Dillon, frail: any hit kills, no autopilot), three deaths and game over.
-- Snapshots every 6 frames (to catch hit flashes and sparks), then Q, and one more to see the clean exit. 60 Hz frames.
local script = {
  {720,  "chd /dd/TSK\r"},
  {900,  "tsk mkf\r"},
  {3400, "q"},
}
local queue, nextkey = {}, 0
frames = 0
sub = emu.add_machine_frame_notifier(function()   -- keep the subscription in a global
  frames = frames + 1
  for _, e in ipairs(script) do
    if frames == e[1] then for c in e[2]:gmatch('.') do table.insert(queue, c) end end
  end
  if #queue > 0 and frames >= nextkey then
    manager.machine.natkeyboard:post(table.remove(queue, 1)); nextkey = frames + 6
  end
  if (frames >= 1100 and frames <= 3380 and frames % 4 == 0) or frames == 3500 then manager.machine.video:snapshot() end
  if frames == 3520 then manager.machine:exit() end
end)
