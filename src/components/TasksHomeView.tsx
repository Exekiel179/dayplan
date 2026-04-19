import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Task, TaskExecutionMode } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FocusCheckin = {
  summary: string;
  suggested_action: 'continue' | 'rest' | 'pause';
  reason: string;
  reply_prompt: string;
  created_at: number;
  paused_task_ids: string[];
  primary_task_id: string | null;
  status: 'pending' | 'resolved';
  resolved_action?: 'continue' | 'rest' | 'pause';
};

type TaskLineRow = {
  id: string;
  mode: TaskExecutionMode;
  tasks: Task[];
};

type DragZone = 'before' | 'after' | 'overlap' | null;
type HomeSurface = 'line' | 'map';
type EnergyElevatorLevel = 'sprint' | 'steady' | 'easy';

type ElevatorDisplayGroup = {
  key: string;
  parallel: boolean;
  tasks: Task[];
};

type EnergyElevatorGroup = {
  level: EnergyElevatorLevel;
  label: string;
  hint: string;
  tasks: Task[];
  displayGroups: ElevatorDisplayGroup[];
};

type TaskCardTone = 'focus' | 'standby' | 'today' | 'blocked';
type TaskLineEmphasis = 'default' | 'standby';

type TasksHomeViewProps = {
  homeSurface: HomeSurface;
  setHomeSurface: React.Dispatch<React.SetStateAction<'status' | 'line' | 'map'>>;
  renderInlineEnergyBar: (contextKey: string) => React.ReactNode;
  currentPrimaryTask: Task | null;
  currentPrimaryTasks: Task[];
  currentPrimaryIsParallel: boolean;
  setIsTaskListOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDesignPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddTask: () => void;
  draggedLineTaskId: string | null;
  setPrimaryTaskId: React.Dispatch<React.SetStateAction<string>>;
  clearTaskDragState: () => void;
  renderTaskCard: (task: Task, options: { laneLabel: string; tone: TaskCardTone }) => React.ReactNode;
  requestHourlyFocusCheckin: () => void;
  isGeneratingFocusCheckin: boolean;
  runningTasks: Task[];
  focusCheckin: FocusCheckin | null;
  focusCheckinError: string;
  respondToFocusCheckin: (action: 'continue' | 'rest' | 'pause') => void;
  homeLineTasks: Task[];
  homeLineRows: TaskLineRow[];
  moveTaskToLine: (
    taskId: string,
    targetTaskId: string | null,
    taskIds: string[],
    targetMode: TaskExecutionMode
  ) => void;
  renderTaskLine: (
    task: Task,
    options: {
      emphasis?: TaskLineEmphasis;
      laneMode?: TaskExecutionMode;
      taskIds?: string[];
      rowTaskCount?: number;
      surface?: 'line' | 'primary';
    }
  ) => React.ReactNode;
  mergeTaskIntoParallel: (taskId: string, targetTaskId: string, taskIds: string[]) => void;
  setDragOverLineTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverLineZone: React.Dispatch<React.SetStateAction<DragZone>>;
  energyMapTasks: Task[];
  energyElevatorGroups: EnergyElevatorGroup[];
  dragOverLineTaskId: string | null;
  moveTaskToElevatorLevel: (
    taskId: string,
    targetLevel: EnergyElevatorLevel,
    targetTaskId: string | null,
    taskIds: string[]
  ) => void;
  endTaskDrag: () => void;
  startTaskDrag: (event: React.DragEvent<HTMLElement>, taskId: string) => void;
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>;
  quadrantRef: React.RefObject<HTMLDivElement | null>;
  handleQuadrantClick: (event: React.MouseEvent) => void;
  isPlacementMode: boolean;
  mousePos: { x: number; y: number } | null;
  renderDependencyLines: () => React.ReactNode;
  renderTaskPoint: (task: Task) => React.ReactNode;
  activeTasks: Task[];
  archivedTasks: Task[];
};

function TaskLineSurface({
  renderInlineEnergyBar,
  currentPrimaryTasks,
  currentPrimaryIsParallel,
  setIsTaskListOpen,
  setIsDesignPanelOpen,
  handleAddTask,
  draggedLineTaskId,
  setPrimaryTaskId,
  clearTaskDragState,
  homeLineTasks,
  homeLineRows,
  moveTaskToLine,
  renderTaskLine,
  mergeTaskIntoParallel,
  setDragOverLineTaskId,
  setDragOverLineZone,
}: Omit<
  TasksHomeViewProps,
  | 'homeSurface'
  | 'setHomeSurface'
  | 'energyMapTasks'
  | 'energyElevatorGroups'
  | 'dragOverLineTaskId'
  | 'moveTaskToElevatorLevel'
  | 'endTaskDrag'
  | 'startTaskDrag'
  | 'setSelectedTask'
  | 'quadrantRef'
  | 'handleQuadrantClick'
  | 'isPlacementMode'
  | 'mousePos'
  | 'renderDependencyLines'
  | 'renderTaskPoint'
  | 'activeTasks'
  | 'archivedTasks'
>) {
  const homeLineTaskIds = homeLineTasks.map((item) => item.id);

  return (
    <section className="mx-4 mt-4 sm:mx-6 home-stage rounded-[1.9rem] border border-white/10 bg-[linear-gradient(160deg,rgba(6,17,29,0.96),rgba(9,25,37,0.88))] p-5 shadow-[0_26px_64px_rgba(2,8,18,0.34)] sm:p-6">
      <div className="home-stage-header">
        <div className="home-stage-title-wrap min-w-0">
          <div className="home-line-title-row">
            <h3 className="text-[clamp(1.42rem,2.6vw,2.2rem)] font-semibold leading-tight text-white text-safe-wrap">
              任务线
            </h3>
            {renderInlineEnergyBar('line-title')}
          </div>
        </div>
      </div>

      <div className="home-stage-body">
        <div className="home-focus-column">
          <div className="home-focus-shell">
            <div className="home-focus-meta">
              <div>
                <h4 className="text-[1.05rem] font-semibold leading-6 text-white text-safe-wrap">当前主线</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskListOpen(true)}
                  className="home-open-list rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
                >
                  打开清单
                </button>
                <button
                  type="button"
                  onClick={() => setIsDesignPanelOpen(true)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
                >
                  AI设计
                </button>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
                >
                  新建任务
                </button>
              </div>
            </div>

            <div
              className="home-focus-card-wrap"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const droppedTaskId = draggedLineTaskId || event.dataTransfer.getData('text/plain');
                if (!droppedTaskId) return;
                const primaryAnchorTaskId = currentPrimaryTasks[0]?.id;
                if (primaryAnchorTaskId && droppedTaskId !== primaryAnchorTaskId) {
                  mergeTaskIntoParallel(droppedTaskId, primaryAnchorTaskId, homeLineTaskIds);
                  setPrimaryTaskId(primaryAnchorTaskId);
                } else {
                  setPrimaryTaskId(droppedTaskId);
                }
                clearTaskDragState();
              }}
            >
              {currentPrimaryTasks.length > 0 ? (
                currentPrimaryIsParallel ? (
                  <div className="current-primary-group-shell">
                    <div className={cn(
                      "current-primary-group-grid",
                      currentPrimaryTasks.length >= 3
                        ? "xl:grid-cols-3"
                        : currentPrimaryTasks.length === 2
                          ? "md:grid-cols-2"
                          : "grid-cols-1"
                    )}>
                      {currentPrimaryTasks.map((task) => (
                        <React.Fragment key={task.id}>
                          {renderTaskLine(task, {
                            laneMode: 'parallel',
                            taskIds: homeLineTaskIds,
                            rowTaskCount: currentPrimaryTasks.length,
                            surface: 'primary',
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ) : renderTaskLine(currentPrimaryTasks[0], {
                    laneMode: 'serial',
                    taskIds: homeLineTaskIds,
                    rowTaskCount: 1,
                    surface: 'primary',
                  })
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm leading-6 text-slate-400">
                  拖一个任务到这里。
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="home-side-column">
          <section className="home-stack-card">
            <div className="home-stack-head">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">任务排布</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span>{homeLineTasks.length} 项</span>
              </div>
            </div>
            <div className="home-stack-body custom-scrollbar space-y-3">
              {homeLineRows.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-400">
                  空
                </div>
              ) : (
                homeLineRows.map((row) => (
                  <div
                    key={row.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDragOverLineTaskId(null);
                      setDragOverLineZone(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedTaskId = draggedLineTaskId || event.dataTransfer.getData('text/plain');
                      if (!droppedTaskId) return;
                      moveTaskToLine(droppedTaskId, row.tasks[0]?.id || null, homeLineTaskIds, row.mode);
                      clearTaskDragState();
                    }}
                    className={cn(
                      "rounded-[1rem] border px-3 py-3",
                      row.mode === 'parallel'
                        ? "parallel-row-shell border-sky-200/40 bg-sky-500/[0.05]"
                        : "border-white/10 bg-white/[0.03]"
                    )}
                  >
                    <div className={cn(
                      "grid gap-3",
                      row.mode === 'parallel'
                        ? row.tasks.length >= 3
                          ? "md:grid-cols-2 xl:grid-cols-3"
                          : row.tasks.length === 2
                            ? "md:grid-cols-2"
                            : "grid-cols-1"
                        : "grid-cols-1"
                    )}>
                      {row.tasks.map((task) => renderTaskLine(task, {
                        emphasis: row.mode === 'parallel' ? 'standby' : 'default',
                        laneMode: row.mode,
                        taskIds: homeLineTaskIds,
                        rowTaskCount: row.tasks.length,
                      }))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function TaskMapSurface({
  renderInlineEnergyBar,
  quadrantRef,
  handleQuadrantClick,
  isPlacementMode,
  mousePos,
  renderDependencyLines,
  renderTaskPoint,
  activeTasks,
  archivedTasks,
  handleAddTask,
}: Omit<
  TasksHomeViewProps,
  | 'homeSurface'
  | 'setHomeSurface'
  | 'currentPrimaryTasks'
  | 'currentPrimaryIsParallel'
  | 'currentPrimaryTask'
  | 'setIsTaskListOpen'
  | 'setIsDesignPanelOpen'
  | 'setPrimaryTaskId'
  | 'clearTaskDragState'
  | 'renderTaskCard'
  | 'requestHourlyFocusCheckin'
  | 'isGeneratingFocusCheckin'
  | 'runningTasks'
  | 'focusCheckin'
  | 'focusCheckinError'
  | 'respondToFocusCheckin'
  | 'homeLineTasks'
  | 'homeLineRows'
  | 'moveTaskToLine'
  | 'renderTaskLine'
  | 'mergeTaskIntoParallel'
  | 'setDragOverLineZone'
>) {
  return (
    <section className="mx-4 mt-4 sm:mx-6 home-stage rounded-[1.9rem] border border-white/10 bg-[linear-gradient(160deg,rgba(6,17,29,0.96),rgba(9,25,37,0.88))] p-5 shadow-[0_26px_64px_rgba(2,8,18,0.34)] sm:p-6">
      <div className="home-stage-header">
        <div className="home-stage-title-wrap min-w-0">
          <div className="home-line-title-row">
            <h3 className="text-[clamp(1.42rem,2.6vw,2.2rem)] font-semibold leading-tight text-white text-safe-wrap">
              任务地图
            </h3>
            {renderInlineEnergyBar('map-title')}
          </div>
        </div>
      </div>

      <div className="home-map-single-column">
        <section className="home-focus-shell home-map-surface-card home-map-focus-shell">
            <div className="home-stack-head">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">四象限地图</p>
              </div>
              <span>{activeTasks.length} 点</span>
            </div>
            <div
              ref={quadrantRef}
              onClick={handleQuadrantClick}
              className={cn(
                "quadrant-board home-map-quadrant-board relative quadrant-grid aspect-square w-full overflow-hidden rounded-[1.8rem] border border-white/10 transition-all duration-500",
                isPlacementMode ? "cursor-crosshair bg-teal-50/30 ring-4 ring-inset ring-teal-500/20" : "cursor-default"
              )}
            >
              <div className="pointer-events-none absolute inset-0 z-0 quadrant-tints">
                <div className="quadrant-tint quadrant-tint-nw" />
                <div className="quadrant-tint quadrant-tint-ne" />
                <div className="quadrant-tint quadrant-tint-sw" />
                <div className="quadrant-tint quadrant-tint-se" />
              </div>
              <div className="pointer-events-none absolute inset-0 z-[2]">
                <div className="quadrant-axis-line quadrant-axis-line-vertical absolute left-1/2 top-0 h-full w-px" />
                <div className="quadrant-axis-line quadrant-axis-line-horizontal absolute left-0 top-1/2 h-px w-full" />

                <div className="quadrant-caption quadrant-caption-nw" data-zone="quick">
                  <strong>快清区</strong>
                </div>
                <div className="quadrant-caption quadrant-caption-ne" data-zone="focus">
                  <strong>主战区</strong>
                </div>
                <div className="quadrant-caption quadrant-caption-sw" data-zone="release">
                  <strong>回收区</strong>
                </div>
                <div className="quadrant-caption quadrant-caption-se" data-zone="build">
                  <strong>积累区</strong>
                </div>
              </div>

              <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <marker id="dependency-arrow-blocked" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
                  </marker>
                  <marker id="dependency-arrow-ready" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L8,4 L0,8 z" fill="#22c55e" />
                  </marker>
                </defs>
                {renderDependencyLines()}
              </svg>

              {isPlacementMode && mousePos && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                  style={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl border-2 border-dashed border-teal-400 bg-teal-50/50 animate-pulse">
                    <Plus className="h-4 w-4 text-teal-400" />
                  </div>
                </div>
              )}

              {activeTasks.map((task) => renderTaskPoint(task))}

              {activeTasks.length === 0 && archivedTasks.length === 0 && !isPlacementMode && (
                <div className="pointer-events-none absolute inset-0 z-[4] flex flex-col items-center justify-center p-5 sm:p-8">
                  <div className="quadrant-empty max-w-md text-center">
                    <p className="quadrant-empty-kicker">矩阵已清空</p>
                    <h3 className="quadrant-empty-title">先把第一个任务放进四象限，再决定今天的路线</h3>
                    <p className="quadrant-empty-copy">
                      点一下坐标区就能落点。越靠右越重要，越靠上越紧急。
                    </p>
                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="pointer-events-auto mt-4 rounded-xl border border-teal-300/30 bg-teal-500/15 px-4 py-2 text-sm font-bold text-teal-100 transition-colors hover:bg-teal-500/25"
                    >
                      新建第一个任务
                    </button>
                  </div>
                </div>
              )}
            </div>
        </section>
      </div>
    </section>
  );
}

export default function TasksHomeView(props: TasksHomeViewProps) {
  const {
    homeSurface,
    setHomeSurface,
  } = props;

  return (
    <>
      <button
        type="button"
        onClick={() => setHomeSurface('line')}
        disabled={homeSurface === 'line'}
        className={cn(
          "surface-edge-button surface-edge-button-left",
          homeSurface === 'line' ? "surface-edge-button-active" : "surface-edge-button-idle"
        )}
        aria-label="切换到任务线"
      >
        <span className="surface-edge-button-icon">
          <ChevronLeft className="h-4.5 w-4.5" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => setHomeSurface('map')}
        disabled={homeSurface === 'map'}
        className={cn(
          "surface-edge-button surface-edge-button-right",
          homeSurface === 'map' ? "surface-edge-button-active" : "surface-edge-button-idle"
        )}
        aria-label="切换到任务地图"
      >
        <span className="surface-edge-button-icon">
          <ChevronRight className="h-4.5 w-4.5" />
        </span>
      </button>

      {homeSurface === 'line' && <TaskLineSurface {...props} />}
      {homeSurface === 'map' && <TaskMapSurface {...props} />}
    </>
  );
}
