-- MAME autoboot script for the showreel: the title, then each stage with the autopilot (unhurtable), recorded whole
-- (-aviwrite); reel/frames.txt logs when each run starts, so tools/reel.sh can cut the best windows out of it.
local runs = { {"tsk", 15}, {"tsk bg", 30}, {"tsk mkbg", 22}, {"tsk hkbg", 22}, {"tsk cbg", 24}, {"tsk tbg", 32}, {"tsk ikbg", 22}, {"tsk nkbg", 16} }
local script, t = { {720, "chd /dd/TSK\r"} }, 900
local log = io.open(os.getenv("REELDIR") .. "/frames.txt", "w")
for i, r in ipairs(runs) do
  table.insert(script, {t, r[1] .. "\r", i})
  t = t + r[2] * 60
  table.insert(script, {t, "q"})
  t = t + 240
end
local queue, nextkey, last = {}, 0, t + 60
frames = 0
sub = emu.add_machine_frame_notifier(function()
  frames = frames + 1
  for _, e in ipairs(script) do
    if frames == e[1] then
      for c in e[2]:gmatch('.') do table.insert(queue, c) end
      if e[3] then log:write(string.format("run %d %s %d\n", e[3], runs[e[3]][1], frames)); log:flush() end
    end
  end
  if #queue > 0 and frames >= nextkey then manager.machine.natkeyboard:post(table.remove(queue, 1)); nextkey = frames + 6 end
  if frames > 900 and frames % 15 == 0 then manager.machine.video:snapshot() end
  if frames == last then log:close(); manager.machine:exit() end
end)
