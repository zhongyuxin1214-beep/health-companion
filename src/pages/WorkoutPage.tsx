// 仅提供关键的 UI 部分修改建议
// 找到 return 部分的代码：
  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto relative pb-40 overflow-y-auto">
      {/* 顶部标题 */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#1E293B] flex items-center gap-2">
          <Dumbbell className="w-7 h-7 text-[#10B981]" /> 健身频道
        </h1>
        {shots.length >= 2 && (
          <button onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
            className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              compareMode ? "bg-red-500 text-white" : "bg-white shadow-md text-[#1E293B]"
            }`}>
            {compareMode ? "取消" : "身材对比"}
          </button>
        )}
      </div>

      {/* 行为闭环 2：AI 训练计划置顶 */}
      <div className="mx-6 mb-6">
         <WorkoutPlanCard />
      </div>

      {/* 状态统计卡片 */}
      <div className="mx-6 mb-6 bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-[#10B981]" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">本月已打卡</p>
          <p className="text-3xl font-black text-[#1E293B]">{monthCount} <span className="text-xs">次</span></p>
        </div>
      </div>

      {/* 拍照按钮：修正白色文字看不清问题 */}
      {!compareMode && (
        <div className="px-6 mb-8">
          <button onClick={() => setShowUpload(true)}
            className="w-full h-16 bg-gradient-to-r from-[#10B981] to-[#3B82F6] text-white rounded-[24px] font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Camera className="w-5 h-5" /> 点击开始今日打卡
          </button>
        </div>
      )}

      {/* 瀑布流记录 */}
      <div className="px-6">
        <h2 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-4">打卡足迹</h2>
        {/* ... 保留原有的瀑布流渲染逻辑 ... */}
      </div>

      <BottomNav onAdd={() => navigate("/")} />
    </div>
  );
