-- MAME autoboot script for the autopilot: "tsk b" fights the skeletons (src/enemy.a BotStep).
-- Snapshots every 6 frames (to catch hit flashes and sparks), then Q, and one more to see the clean exit. 60 Hz frames.
local script = {
  {720,  "chd /dd/TSK\r"},
  {900,  "tsk b\r"},
  {2400, "q"},
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
  if (frames >= 1000 and frames <= 2380 and frames % 6 == 0) or frames == 2500 then manager.machine.video:snapshot() end
  if frames == 2520 then manager.machine:exit() end
end)
