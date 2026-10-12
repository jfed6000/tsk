-- MAME autoboot script for tskview: type the commands after boot, press keys, take snapshots, quit.
-- Frame numbers at 60 Hz. Keys go one every 6 frames (faster drops keys).
local script = {
  {720,  "chd /dd/TSK\r"},
  {900,  "tskview\r"},
  {1500, "s"},          -- start the camera panning
  {1900, "f"},          -- lightning
  {1960, "h"},          -- hit flash on the skeleton
  {2100, "l"},          -- flip both characters
  {2400, "n"},          -- the hero's next move
  {2700, "q"},          -- quit
}
local shots = {1200, 1450, 1800, 1906, 1912, 1918, 1924, 1930, 1970, 2200, 2500, 2900}
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
  for _, t in ipairs(shots) do if frames == t then manager.machine.video:snapshot() end end
  if frames == 3000 then manager.machine:exit() end
end)
