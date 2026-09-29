import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Circle,
  Clapperboard,
  Cylinder,
  Copy,
  Group,
  Lock,
  Magnet,
  Maximize2,
  MousePointer2,
  Move3d,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  StopCircle,
  Trash2,
  Ungroup,
  Unlock,
  X,
} from "lucide-react";
import {
  ArtifactStore,
  cameraArtifactReadiness,
  cameraRenderActionLabel,
  type ArtifactResolution,
  type ArtifactSnapshot,
} from "./artifacts";
import { SemanticCreateToggle } from "../renderer/src/NodeCardNext";
import { GeneratedMediaOverlay } from "../renderer/src/GeneratedMediaOverlay";
import { NodePort } from "../renderer/src/NodePort";
import { MediaOfflineState } from "../renderer/src/MediaOfflineState";

import { flushSync } from "react-dom";

import { Position } from "@xyflow/react";
import { SEMANTIC_ICONS } from "../renderer/src/iconSystem";
import {
  STORYBOARD_CAMERA_MOVEMENT_GROUPS,
  STORYBOARD_DURATION_OPTIONS,
  STORYBOARD_SHOT_SIZE_OPTIONS,
} from "./storyboardCatalogs";
import {
  CAMERA_FOCAL_LENGTHS,
  addEntity,
  addEntityAt,
  addShot,
  applyColumnResize,
  applyDimensionResize,
  applySphereRadiusResize,
  applyTransformCommit,
  authorCameraFocalLengthKeyframe,
  authorCameraMovementKeyframe,
  authorCameraTargetKeyframe,
  cameraEntityForShot,
  cameraFov,
  copySceneEntities,
  copyShot,
  createCameraDocument,
  cutSceneEntities,
  cutShot,
  deleteEntities,
  deleteShot,
  deployCameraShot,
  duplicateShot,
  duplicateShotAtBoundary,
  evaluateFrame,
  groupEntities,
  normalizeHex,
  pasteSceneEntities,
  pasteShot,
  reorderShots,
  resizeShotFrames,
  resetCameraSection,
  resetShotCameraProperty,
  resetEntityTransform,
  resetEntityRotation,
  sanitizeCameraDocument,

  setAllowBelowCanvas,
  setBoundary,
  setCameraAimMode,
  setEntityPaletteColor,
  setShotClipColor,
  setCameraLockTarget,
  setEntityLockScope,
  toggleEntityLockScope,
  toggleTimelineEditLock,
  toggleCameraSectionKeyframe,
  splitShotAtFrame,

  toggleEntityPropertyKeyframe,
  toggleShotCameraPropertyKeyframe,
  toggleEntityResizeLock,
  toggleShapeLock,
  ungroupEntities,
  updateShotCameraEntity,
  type CameraDocument,
  type EntityKind,
  type SceneClipboard,
  type SceneEntity,
  type ShotClipboard,
  type Transform,
  type Vec3,
} from "./model";
import {
  cameraHierarchySelection,
  cameraPanOwnsArrow,
  cameraInspectorHeightForKey,
  cameraInspectorSplitForPointer,
  cameraSidebarWidthForKey,
  cameraSidebarWidthForWorkspace,
  cameraTimelineHeightForKey,
  clampCameraSidebarWidth,
  sceneShortcutForEvent,
  selectAllSceneEntities,
  selectedEntityArrowTransform,
  selectedEntityOwnsArrow,
  createHeldArrowController,
  type HeldArrowController,
  type SelectedEntityArrowEvent,
  selectedShapeGroupArrowTransform,
} from "./interaction";
import { createHistory } from "./history";
import { CameraViewport, type CameraViewportHandle } from "./CameraViewport";
import {
  CameraOpticsInspector,
  CameraShotSettings,
  CameraShotTimeline,
  CameraTransformInspector,
  animateShotFlip,
  keyboardReorderDestination,
  liveMidpointOrder,
  shotRectSnapshot,
  timelineShortcutForEvent,
  type SceneMenuCommand,
  type ShotMenuCommand,
  type TimelineEditTool,
} from "./exactCanvasCamera";
import { ShotBoundaryChoice } from "../renderer/src/StoryboardSharedControls";
import {
  applyRenderMark,
  deriveRenderRange,
  sanitizeRenderMarks,
  type RenderMarks,
} from "./renderRange";
import { runCameraRender } from "./localRenderClient";
type ObjectPromptTool =
  | "Describe This Object"
  | "Ask About Object"
  | "Create Similar Object"
  | "Use As Reference"
  | "Tutorial";
import { CameraObjectCreationOwner } from "./CameraObjectCreationOwner";
import {
  evaluateStructuredObject,
  type ObjectRecipeV1,
} from "./structuredObject";
import { createLocalObjectLifecycle } from "./structuredObjectAssistant";
import { CameraSceneHierarchy } from "./CameraSceneHierarchy";

type Props = {
  nodeId: string;
  expanded: boolean;
  onOpen(): void;
  onChange?(document: CameraDocument): void;
};
function recursiveGroupEntityIds(
  document: CameraDocument,
  groupId: string,
  seen = new Set<string>(),
): string[] {
  if (seen.has(groupId)) return [];
  seen.add(groupId);
  const group = document.groups.find((item) => item.id === groupId);
  if (!group) return [];
  return [
    ...new Set(
      group.childIds.flatMap((id) =>
        document.groups.some((item) => item.id === id)
          ? recursiveGroupEntityIds(document, id, seen)
          : document.entities.some(
                (entity) => entity.id === id && entity.kind !== "camera",
              )
            ? [id]
            : [],
      ),
    ),
  ];
}
export const DEFAULT_INSPECTOR_FRACTION = 0.75;
const SCENE_ICONS = {
  human: SEMANTIC_ICONS.character,
  block: SEMANTIC_ICONS.element,
  sphere: Circle,
  column: Cylinder,
  camera: Camera,
} as const;
const timecode = (frame: number, fps: number) => {
  const totalSeconds = Math.floor(frame / fps);
  const ff = frame % fps;
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  return `${hh ? `${String(hh).padStart(2, "0")}:` : ""}${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
};

export function createLatestPreviewScheduler(
  schedule: (callback: FrameRequestCallback) => number = (callback) =>
    globalThis.requestAnimationFrame?.(callback) ?? 0,
  cancel: (id: number) => void = (id) => globalThis.cancelAnimationFrame?.(id),
) {
  let frame = 0;
  let latest: (() => void) | null = null;
  const run = () => {
    frame = 0;
    const task = latest;
    latest = null;
    task?.();
  };
  return {
    queue(task: () => void) {
      latest = task;
      if (!frame) frame = schedule(run);
    },
    flushLatestPreview() {
      if (frame) cancel(frame);
      frame = 0;
      const task = latest;
      latest = null;
      task?.();
    },
    cancelLatestPreview() {
      if (frame) cancel(frame);
      frame = 0;
      latest = null;
    },
  };
}

export type CameraDeletionRequest =
  | {
      kind: "scene";
      ids: string[];
      name?: string;
      entityKind?: EntityKind;
      initiator: HTMLElement | null;
    }
  | {
      kind: "shot";
      shotId: string;
      name: string;
      initiator: HTMLElement | null;
    }
  | {
      kind: "artifact";
      artifactId: string;
      locator: string;
      name: string;
      initiator: HTMLElement | null;
    };

export function cameraDeletionCopy(request: CameraDeletionRequest) {
  if (request.kind === "shot")
    return {
      title: `Delete ${request.name}?`,
      category: "Timeline Shot",
      message:
        "Deleting this Shot changes sequence timing and removes or shifts its keyframes according to the current sequence model.",
      confirmLabel: "Delete",
    };
  if (request.kind === "artifact")
    return {
      title: `Delete ${request.name}?`,
      category: "Rendered Video",
      message:
        "Deleting this rendered video removes the local result and may change output readiness.",
      confirmLabel: "Delete",
    };
  if (request.ids.length > 1)
    return {
      title: `Delete ${request.ids.length} selected items?`,
      category: "Scene Selection",
      message:
        "These scene items are shared across all Shots. Deleting them removes them from the scene and every Shot.",
      confirmLabel: `Delete ${request.ids.length} Items`,
    };
  const category =
    request.entityKind === "camera"
      ? "Scene Camera"
      : request.entityKind === "human"
        ? "Scene Human"
        : "Scene Object";
  return {
    title: `Delete ${request.name || "item"}?`,
    category,
    message:
      "This scene item is shared across all Shots. Deleting it removes it from the scene and every Shot.",
    confirmLabel: "Delete",
  };
}

export function CameraDeleteDialog({
  request,
  committing,
  onCancel,
  onConfirm,
}: {
  request: CameraDeletionRequest;
  committing: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const modal = useRef<HTMLElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const copy = cameraDeletionCopy(request);
  const dismiss = () => {
    if (committing) return;
    onCancel();
    requestAnimationFrame(() => request.initiator?.focus());
  };
  useEffect(() => {
    cancel.current?.focus();
  }, []);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...(modal.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled)",
      ) || []),
    ];
    if (!focusable.length) return;
    const at = focusable.indexOf(
      globalThis.document.activeElement as HTMLElement,
    );
    const next = event.shiftKey
      ? at <= 0
        ? focusable.length - 1
        : at - 1
      : at < 0 || at === focusable.length - 1
        ? 0
        : at + 1;
    event.preventDefault();
    focusable[next]?.focus();
  };
  return (
    <div
      className="modal-backdrop delete-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        ref={modal}
        className="delete-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="camera3d-delete-confirm-title"
        aria-describedby="camera3d-delete-confirm-copy"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header>
          <span>
            <Trash2 size={18} />
          </span>
          <div>
            <strong id="camera3d-delete-confirm-title">{copy.title}</strong>
            <small>{copy.category}</small>
          </div>
          <button
            title="Cancel"
            aria-label="Cancel Delete"
            disabled={committing}
            onClick={dismiss}
          >
            <X size={16} />
          </button>
        </header>
        <p id="camera3d-delete-confirm-copy">{copy.message}</p>
        <footer>
          <button ref={cancel} disabled={committing} onClick={dismiss}>
            Cancel
          </button>
          <button
            className="is-danger"
            disabled={committing}
            onClick={onConfirm}
          >
            {copy.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function CameraCompactNode({
  nodeId = "camera3d-compact",
  document,
  frozenFrame,
  artifacts,
  resolutions = {},
  onOpen,
  onSelect = () => {},
  onReveal = () => {},
  onRename = () => {},
  onFavorite = () => {},
  onDelete = () => {},
  width = 315,
}: {
  nodeId?: string;
  document: CameraDocument;
  frozenFrame: number;
  artifacts: ArtifactSnapshot;
  resolutions?: Record<string, ArtifactResolution>;
  onOpen(): void;
  onSelect?(id: string): void;
  onReveal?(id: string): void;
  onRename?(id: string): void;
  onFavorite?(id: string): void;
  onDelete?(id: string): void;
  width?: number;
}) {
  const readiness = cameraArtifactReadiness(document, artifacts, resolutions);
  const selectedIndex = Math.max(
    0,
    artifacts.artifacts.findIndex((item) => item.id === readiness.selected?.id),
  );
  const selected = readiness.selected;
  return (
    <article
      className="camera3d-node studio-node"
      aria-label="3D Camera node"
      style={{ width }}
    >
      <header className="node-header">
        <span className="node-icon">
          <Camera size={15} />
        </span>
        <div className="camera3d-header-copy">
          <strong>3D Camera</strong>
          <small>Frame {frozenFrame}</small>
        </div>
        <span
          className={`header-readiness-pill ${readiness.required ? "is-required" : "is-ready"}`}
        >
          {readiness.pill}
        </span>
      </header>
      {selected && (
        <div
          className="generator-stage generated-media-stage"
          style={{ aspectRatio: selected.width / selected.height }}
          aria-label={
            readiness.mediaUrl
              ? undefined
              : `Rendered 3D Camera output unavailable: ${selected.name}`
          }
        >
          {readiness.mediaUrl ? (
            <video
              className="node-media"
              controls
              preload="metadata"
              playsInline
              draggable={false}
              aria-label={`Rendered 3D Camera output: ${selected.name}`}
              src={readiness.mediaUrl}
            />
          ) : (
            <MediaOfflineState
              mediaFamily="video"
              state="offline"
              compact
              showFind={false}
              onFind={() => undefined}
            />
          )}
          <GeneratedMediaOverlay
            activeIndex={selectedIndex}
            total={artifacts.artifacts.length}
            favorite={selected.favorite}
            onPrevious={() =>
              onSelect(artifacts.artifacts[selectedIndex - 1]?.id)
            }
            onNext={() => onSelect(artifacts.artifacts[selectedIndex + 1]?.id)}
            onReveal={() => onReveal(selected.id)}
            onEdit={() => onRename(selected.id)}
            onFavorite={() => onFavorite(selected.id)}
            onDelete={() => onDelete(selected.id)}
          />
        </div>
      )}
      <div className="semantic-reference camera3d-create">
        <SemanticCreateToggle label="Create" onClick={onOpen} />
      </div>
      <NodePort
        id="media-out"
        type="source"
        signal="video"
        label="Output"
        position={Position.Right}
        available={readiness.outputAvailable}
        nodeId={nodeId}
      />
    </article>
  );
}

export type TimelineCommand = ShotMenuCommand | "slice";
export type CameraNodeSnapshot = {
  document: CameraDocument;
  activeShotId: string;
  frame: number;
  selectedIds: string[];
};
export function cameraDeploymentSelection(document: CameraDocument): { activeShotId: string; frame: number; selectedIds: string[] } | null {
  const shot = document.shots.at(-1);
  const cameraId = shot?.camera.activeCameraId;
  const camera = cameraId ? document.entities.find((entity) => entity.id === cameraId && entity.kind === "camera") : undefined;
  return shot && camera ? { activeShotId: shot.id, frame: shot.startFrame, selectedIds: [camera.id] } : null;
}
export function cameraSelectionAfterEntityDeletion(document: CameraDocument, priorActiveShotId: string): { activeShotId: string; frame: number } {
  const shot = document.shots.find((item) => item.id === priorActiveShotId) || document.shots[0]
  return { activeShotId: shot?.id || '', frame: shot?.startFrame || 0 }
}
export function duplicateNodeShotAtBoundary(
  history: { push(value: CameraNodeSnapshot): void },
  current: CameraNodeSnapshot,
  sourceShotId: string,
  insertionIndex: number,
): CameraNodeSnapshot {
  const result = duplicateShotAtBoundary(
    current.document,
    sourceShotId,
    insertionIndex,
    true,
  );
  if (!result.changed || !result.selectedShotId || result.playhead == null)
    return current;
  const snapshot = {
    document: result.document,
    activeShotId: result.selectedShotId,
    frame: result.playhead,
    selectedIds: [],
  };
  history.push(snapshot);
  return snapshot;
}
export function applyTimelineCommand(input: {
  document: CameraDocument;
  command: TimelineCommand;
  selectedShotId: string;
  frame: number;
  clipboard: ShotClipboard | null;
}) {
  if (input.command === "copy")
    return {
      document: input.document,
      clipboard: copyShot(input.document, input.selectedShotId),
      selectedShotId: input.selectedShotId,
      playhead: input.frame,
      historyTransactions: 0,
    };
  if (input.command === "paste-after") {
    if (!input.clipboard) return { ...input, historyTransactions: 0 };
    const result = pasteShot(
      input.document,
      input.clipboard,
      input.selectedShotId,
    );
    const shot = result.insertedShotId
      ? result.document.shots.find((item) => item.id === result.insertedShotId)
      : null;
    return {
      document: result.document,
      clipboard: input.clipboard,
      selectedShotId: result.insertedShotId || input.selectedShotId,
      playhead: shot?.startFrame ?? input.frame,
      historyTransactions: result.insertedShotId ? 1 : 0,
    };
  }
  if (input.command === "cut") {
    const result = cutShot(input.document, input.selectedShotId);
    if (!result.changed)
      return {
        document: input.document,
        clipboard: input.clipboard,
        selectedShotId: input.selectedShotId,
        playhead: input.frame,
        historyTransactions: 0,
      };
    const selected =
      result.document.shots.find(
        (shot) => input.frame >= shot.startFrame && input.frame < shot.endFrame,
      ) || result.document.shots[0];
    return {
      document: result.document,
      clipboard: result.clipboard || input.clipboard,
      selectedShotId: selected?.id || "",
      playhead: selected?.startFrame ?? 0,
      historyTransactions: 1,
    };
  }
  if (input.command === "delete") {
    const result = deleteShot(input.document, input.selectedShotId);
    return {
      document: result.document,
      clipboard: input.clipboard,
      selectedShotId: result.selectedShotId ?? input.selectedShotId,
      playhead: result.playhead ?? input.frame,
      historyTransactions: result.changed ? 1 : 0,
    };
  }
  const result = splitShotAtFrame(
    input.document,
    input.selectedShotId,
    input.frame,
  );
  return {
    document: result.document,
    clipboard: input.clipboard,
    selectedShotId: result.selectedShotId ?? input.selectedShotId,
    playhead: result.playhead ?? input.frame,
    historyTransactions: result.changed ? 1 : 0,
  };
}

export function Prism3DCameraNode({
  nodeId,
  expanded,
  onOpen,
  onChange,
}: Props) {
  const [document, setDocument] = useState(() => createCameraDocument(nodeId));
  const authoredRevision = useRef(0);
  const history = useRef(
    createHistory<CameraNodeSnapshot>(
      {
        document,
        activeShotId: document.shots[0]?.id || "",
        frame: 0,
        selectedIds: [],
      },
      128,
    ),
  );
  const viewport = useRef<CameraViewportHandle>(null);
  const artifactStore = useRef(new ArtifactStore());
  const [artifactSnapshot, setArtifactSnapshot] = useState<ArtifactSnapshot>(
    () => artifactStore.current.snapshot(),
  );
  const [artifactResolutions, setArtifactResolutions] = useState<
    Record<string, ArtifactResolution>
  >({});
  const [rendering, setRendering] = useState(false);
  const [renderMarks, setRenderMarks] = useState<RenderMarks>({
    inFrame: null,
    outMarkerFrame: null,
  });
  const renderMarksRef = useRef(renderMarks);
  const [rangeStatus, setRangeStatus] = useState("");
  const [renderProgress, setRenderProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const renderAbort = useRef<AbortController | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef(selectedIds);
  const selectionAnchor = useRef<string | null>(null);
  const previewBase = useRef<CameraDocument | null>(null);
  const previewScheduler = useRef(createLatestPreviewScheduler());
  const heldArrow = useRef<HeldArrowController | null>(null);
  const [activeShotId, setActiveShotId] = useState(document.shots[0]?.id || "");
  const [expandedShots, setExpandedShots] = useState(
    () => new Set(document.shots[0]?.id ? [document.shots[0].id] : []),
  );
  const [hierarchyDragged, setHierarchyDragged] = useState<string | null>(null);
  const [hierarchyPreviewIds, setHierarchyPreviewIds] = useState<
    string[] | null
  >(null);
  const hierarchyRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [aids, setAids] = useState({ gridSnap: false, collision: false });
  const documentRef = useRef(document);
  const aidsRef = useRef(aids);
  const frameRef = useRef(frame);
  documentRef.current = document;
  selectedIdsRef.current = selectedIds;
  aidsRef.current = aids;
  frameRef.current = frame;
  const [guides, setGuides] = useState({
    grid: true,
    cameraPath: true,
    fov: true,
    entityPaths: false,
  });
  const [alert, setAlert] = useState("");
  const [frozenFrame, setFrozenFrame] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [workspaceWidth, setWorkspaceWidth] = useState(960);
  const workspace = useRef<HTMLElement>(null);
  const sidebarResize = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const [inspectorFraction, setInspectorFraction] = useState(
    DEFAULT_INSPECTOR_FRACTION,
  );
  const sceneSplit = useRef<HTMLDivElement>(null);
  const inspectorResize = useRef(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [timelineHeight, setTimelineHeight] = useState(260);
  void cameraTimelineHeightForKey;
  const [showKeyframes, setShowKeyframes] = useState(false);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<
    string | undefined
  >();
  const [shotOverflow, setShotOverflow] = useState<{
    count: number;
    minFrame: number;
    maxFrame: number;
  } | null>(null);
  const [scaleLinked, setScaleLinked] = useState(true);
  const persistScaleLinked = (next: boolean) => {
    setScaleLinked(next);
    void window.cameraTester?.saveNodeState(nodeId, {
      document,
      frozenFrame: frame,
      timelineExpanded,
      showKeyframes,
      scaleLinked: next,
      renderMarks: renderMarksRef.current,
      artifacts: artifactStore.current.snapshot(),
    });
  };
  const [sceneClipboard, setSceneClipboard] = useState<SceneClipboard | null>(
    null,
  );
  const [shotClipboard, setShotClipboard] = useState<ShotClipboard | null>(
    null,
  );
  const [activeEditTool, setActiveEditTool] =
    useState<TimelineEditTool>("selection");
  const [timelineActive, setTimelineActive] = useState(false);
  const [selectedClipShotId, setSelectedClipShotId] = useState<string | null>(null);
  useEffect(() => {
    const clearOutsideClip = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(".camera3d-shot-block[data-shot-id]")) setSelectedClipShotId(null);
    };
    window.addEventListener("pointerdown", clearOutsideClip, true);
    return () => window.removeEventListener("pointerdown", clearOutsideClip, true);
  }, []);
  const [deleteRequest, setDeleteRequest] =
    useState<CameraDeletionRequest | null>(null);
  const [deleteCommitting, setDeleteCommitting] = useState(false);
  const [memberEditGroupId, setMemberEditGroupId] = useState<string | null>(
    null,
  );
  const [expandedGroups, setExpandedGroups] = useState(() => new Set<string>());
  const [objectCreatorOpen, setObjectCreatorOpen] = useState(false);
  const [objectPromptTool, setObjectPromptTool] = useState<ObjectPromptTool>();
  const [objectAssistantError, setObjectAssistantError] = useState("");

  const hierarchyShots = (
    hierarchyPreviewIds || document.shots.map((shot) => shot.id)
  )
    .map((id) => document.shots.find((shot) => shot.id === id)!)
    .filter(Boolean);
  const activeShot =
    document.shots.find((shot) => shot.id === activeShotId) ||
    document.shots[0];
  const selectedGroup = document.groups.find((group) => {
    const ids = recursiveGroupEntityIds(document, group.id);
    return (
      selectedIds.length === ids.length &&
      ids.every((id) => selectedIds.includes(id))
    );
  });
  const selectedShotCamera =
    selectedIds.length === 1
      ? document.shots.find((shot) => shot.camera.activeCameraId === selectedIds[0])
      : undefined;
  const selected =
    selectedIds.length === 1
      ? document.entities.find((entity) => entity.id === selectedIds[0])
 : undefined;
  const viewportDocument = document;
  const selectedObject =
    selectedIds.length === 1
      ? (document.objects || []).find((object) => object.id === selectedIds[0])
      : undefined;
  const sequenceStart = document.shots[0]?.startFrame || 0;
  const sequenceEnd = document.shots.at(-1)?.endFrame || 0;
  const effectiveSidebarWidth = cameraSidebarWidthForWorkspace(
    sidebarWidth,
    workspaceWidth,
  );

  const saveState = (
    nextDocument: CameraDocument,
    nextArtifacts = artifactStore.current.snapshot(),
    nextFrame = frame,
    nextMarks = renderMarksRef.current,
  ) =>
    void window.cameraTester?.saveNodeState(nodeId, {
      document: nextDocument,
      frozenFrame: nextFrame,
      timelineExpanded,
      showKeyframes,
      scaleLinked,
      renderMarks: nextMarks,
      artifacts: nextArtifacts,
    });
  const commit = (
    authored: CameraDocument,
    state: Partial<Omit<CameraNodeSnapshot, "document">> = {},
    persist = true,
  ) => {
    previewScheduler.current.cancelLatestPreview();
    previewBase.current = null;
    const next = sanitizeCameraDocument(authored);
    authoredRevision.current += 1;
    history.current.push({
      document: next,
      activeShotId: state.activeShotId ?? activeShotId,
      frame: state.frame ?? frame,
      selectedIds: state.selectedIds ?? selectedIds,
    });
    artifactStore.current.refreshReadiness(next);
    const nextArtifacts = artifactStore.current.snapshot();
    setArtifactSnapshot(nextArtifacts);
    setDocument(next);
    onChange?.(next);
    if (persist) saveState(next, nextArtifacts, state.frame ?? frame);
  };

  const previewTransform = (entityId: string, transform: Transform) => {
    const base = previewBase.current || document;
    if (!previewBase.current) previewBase.current = structuredClone(base);
    const preview = {
      ...base,
      entities: base.entities.map((entity) =>
        entity.id === entityId ? { ...entity, transform: structuredClone(transform) } : entity,
      ),
    };
    previewScheduler.current.queue(() => setDocument(preview));
  };
  const previewDocument = (next: CameraDocument) => {
    if (!previewBase.current) previewBase.current = structuredClone(document);
    previewScheduler.current.queue(() => setDocument(next));
  };
  const cancelPreview = () => {
    previewScheduler.current.cancelLatestPreview();
    const base = previewBase.current;
    previewBase.current = null;
    if (base) setDocument(base);
  };
  const startHeldArrow = (entityId: string, event: SelectedEntityArrowEvent) => {
    if (!heldArrow.current) {
      heldArrow.current = createHeldArrowController({
        document: documentRef.current,
        entityId,
        preview: (transform) => previewTransform(entityId, transform),
        commit: (transform) => {
          const applied = applyTransformCommit(documentRef.current, entityId, transform, { ...aidsRef.current, groundSnap: false, optionBypass: false, frame: frameRef.current });
          if (applied.ok) commit(applied.document); else cancelPreview();
        },
        restore: cancelPreview,
        scheduler: { requestFrame: (callback) => requestAnimationFrame(callback), cancelFrame: (handle) => cancelAnimationFrame(handle) },
        now: () => performance.now(),
      });
    }
    heldArrow.current.start(event);
  };
  const cancelHeldArrow = () => {
    const active = heldArrow.current;
    if (!active) return;
    active.cancel();
    heldArrow.current = null;
  };
  const restoreSnapshot = (snapshot: CameraNodeSnapshot) => {
    setDocument(snapshot.document);
    setActiveShotId(snapshot.activeShotId);
    setFrame(snapshot.frame);
    setSelectedIds(snapshot.selectedIds);
  };
  const runTimelineCommand = (
    command: TimelineCommand,
    shotId = activeShotId,
  ) => {
    if (document.timelineEditLocked && command !== "copy") {
      setTimelineActive(true);
      return;
    }
    const result = applyTimelineCommand({
      document,
      command,
      selectedShotId: shotId,
      frame,
      clipboard: shotClipboard,
    });
    const playhead = result.playhead ?? frame;
    setShotClipboard(result.clipboard);
    if (result.historyTransactions)
      commit(result.document, {
        activeShotId: result.selectedShotId,
        frame: playhead,
        selectedIds: [],
      });
    setActiveShotId(result.selectedShotId);
    setFrame(playhead);
    setSelectedIds([]);
    if (command === "delete") setSelectedClipShotId(null);
    setTimelineActive(true);
  };
  const currentInitiator = () =>
    globalThis.document.activeElement instanceof HTMLElement
      ? globalThis.document.activeElement
      : null;
  const requestSceneDeletion = (
    ids: string[],
    initiator = currentInitiator(),
  ) => {
    const entities = ids
      .map((id) => document.entities.find((item) => item.id === id))
      .filter(Boolean) as SceneEntity[];
    if (!entities.length) return;
    setDeleteRequest({
      kind: "scene",
      ids: entities.map((item) => item.id),
      name: entities.length === 1 ? entities[0].name : undefined,
      entityKind: entities.length === 1 ? entities[0].kind : undefined,
      initiator,
    });
  };
  const requestShotDeletion = (
    shotId: string,
    initiator = currentInitiator(),
  ) => {
    const shot = document.shots.find((item) => item.id === shotId);
    if (!shot) return;
    setDeleteRequest({ kind: "shot", shotId, name: shot.name, initiator });
  };
  const requestArtifactDeletion = (
    artifactId: string,
    initiator = currentInitiator(),
  ) => {
    const artifact = artifactStore.current
      .list()
      .find((item) => item.id === artifactId);
    if (!artifact) return;
    setDeleteRequest({
      kind: "artifact",
      artifactId,
      locator: artifact.locator,
      name: artifact.name,
      initiator,
    });
  };
  const confirmRequestedDeletion = async () => {
    const request = deleteRequest;
    if (!request || deleteCommitting) return;
    setDeleteCommitting(true);
    try {
      if (request.kind === "scene") {
        const next = deleteEntities(document, request.ids);
        const selection = cameraSelectionAfterEntityDeletion(next, activeShotId);
        commit(next, { ...selection, selectedIds: [] });
        setActiveShotId(selection.activeShotId);
        setFrame(selection.frame);
        setSelectedClipShotId(null);
        setSelectedIds([]);
      } else if (request.kind === "shot")
        runTimelineCommand("delete", request.shotId);
      else {
        const artifact = artifactStore.current
          .list()
          .find((item) => item.id === request.artifactId);
        if (artifact) {
          await window.cameraTester?.deleteMedia?.(
            nodeId,
            request.artifactId,
            request.locator,
          );
          artifactStore.current.delete(request.artifactId);
          const next = artifactStore.current.snapshot();
          setArtifactSnapshot(next);
          saveState(document, next);
        }
      }
      setDeleteRequest(null);
      requestAnimationFrame(() =>
        globalThis.document
          .querySelector<HTMLElement>(
            '.camera3d-sidebar [aria-selected="true"],.camera3d-node .generated-media-stage,.camera3d-workspace',
          )
          ?.focus(),
      );
    } finally {
      setDeleteCommitting(false);
    }
  };
  const updateRenderMarks = (marks: RenderMarks, announcement: string) => {
    const sanitized = sanitizeRenderMarks(marks, sequenceStart, sequenceEnd);
    renderMarksRef.current = sanitized;
    setRenderMarks(sanitized);
    setRangeStatus(announcement);
    saveState(document, artifactStore.current.snapshot(), frame, sanitized);
  };
  const markRenderRange = (command: "in" | "out") => {
    const result = applyRenderMark(
      renderMarksRef.current,
      command,
      frame,
      sequenceStart,
      sequenceEnd,
    );
    if (result.changed) updateRenderMarks(result.marks, result.announcement);
    else setRangeStatus(result.announcement);
    setTimelineActive(true);
  };
  const startLocalRender = async () => {
    const api = window.cameraTester;
    if (!api) {
      setAlert("Render failed: Camera render API unavailable.");
      return;
    }
    const invocationRange = deriveRenderRange(
      renderMarksRef.current,
      sequenceStart,
      sequenceEnd,
    );
    const controller = new AbortController();
    renderAbort.current = controller;
    setRendering(true);
    setAlert("");
    setRenderProgress({ completed: 0, total: invocationRange.frameCount });
    try {
      const result = await runCameraRender({
        nodeId,
        document,
        range: invocationRange,
        store: artifactStore.current,
        api,
        signal: controller.signal,
        onProgress: (completed, total) =>
          setRenderProgress({ completed, total }),
      });
      if (controller.signal.aborted) return;
      const next = artifactStore.current.snapshot();
      setArtifactSnapshot(next);
      setArtifactResolutions((current) => ({
        ...current,
        [result.artifact.id]: result.resolution,
      }));
      saveState(document, next);
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error as Error).message === "RENDER_CANCELLED"
      )
        setAlert("Render cancelled.");
      else
        setAlert(
          `Render failed: ${(error as Error).message.replace(/\/[^\s:]+/g, "[local path]").slice(0, 240) || "Local render failed."}`,
        );
    } finally {
      if (renderAbort.current === controller) renderAbort.current = null;
      setRendering(false);
      setRenderProgress(null);
    }
  };
  const selectEntities = (ids: string[]) => {
    const group =
      ids.length === 1
        ? document.groups.find((item) => item.childIds.includes(ids[0]))
        : undefined;
    const resolved =
      group && memberEditGroupId !== group.id ? group.childIds : ids;
    setSelectedIds(resolved);
    if (resolved.length) setTimelineActive(false);
  };
  const onRowKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    select: () => void,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadRevision = authoredRevision.current;
    void window.cameraTester?.loadNodeState(nodeId).then(async (value) => {
      const saved = value as {
        document?: CameraDocument;
        frozenFrame?: number;
        timelineExpanded?: boolean;
        showKeyframes?: boolean;
        scaleLinked?: boolean;
        renderMarks?: RenderMarks;
        artifacts?: ArtifactSnapshot;
      } | null;
      if (cancelled || !saved?.document) return;
      const clean = sanitizeCameraDocument(saved.document);
      const loadedMarks = sanitizeRenderMarks(
        saved.renderMarks,
        clean.shots[0]?.startFrame || 0,
        clean.shots.at(-1)?.endFrame || 1,
      );
      renderMarksRef.current = loadedMarks;
      const store = ArtifactStore.fromSnapshot(saved.artifacts);
      store.refreshReadiness(clean);
      const resolved: Record<string, ArtifactResolution> = {};
      for (const artifact of store.list()) {
        const resolution = (await window.cameraTester?.mediaUrl?.(
          nodeId,
          artifact.id,
          artifact.locator,
        )) || { ok: false as const, reason: "Camera media API unavailable." };
        if (cancelled) return;
        resolved[artifact.id] = resolution;
        store.resolve(artifact.id, resolution);
      }
      if (cancelled || authoredRevision.current !== loadRevision) return;
      artifactStore.current = store;
      const nextArtifacts = store.snapshot();
      setArtifactSnapshot(nextArtifacts);
      setArtifactResolutions(resolved);
      setDocument(clean);
      setActiveShotId(clean.shots[0]?.id || "");
      setExpandedShots(new Set(clean.shots[0]?.id ? [clean.shots[0].id] : []));
      setRenderMarks(loadedMarks);
      history.current = createHistory(
        {
          document: clean,
          activeShotId: clean.shots[0]?.id || "",
          frame: saved.frozenFrame || 0,
          selectedIds: [],
        },
        128,
      );
      setFrozenFrame(saved.frozenFrame || 0);
      setTimelineExpanded(saved.timelineExpanded ?? true);
      setShowKeyframes(saved.showKeyframes ?? false);
      setScaleLinked(saved.scaleLinked ?? true);
      if (JSON.stringify(clean) !== JSON.stringify(saved.document))
        saveState(clean, nextArtifacts, saved.frozenFrame || 0);
    });
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  useEffect(() => {
    requestAnimationFrame(() =>
      globalThis.document
        .querySelector<HTMLElement>('.camera3d-sidebar [aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" }),
    );
  }, [selectedIds, activeShotId]);
  useEffect(() => {
    const sanitized = sanitizeRenderMarks(
      renderMarksRef.current,
      sequenceStart,
      sequenceEnd,
    );
    if (
      sanitized.inFrame === renderMarksRef.current.inFrame &&
      sanitized.outMarkerFrame === renderMarksRef.current.outMarkerFrame
    )
      return;
    renderMarksRef.current = sanitized;
    setRenderMarks(sanitized);
    saveState(document, artifactStore.current.snapshot(), frame, sanitized);
  }, [sequenceStart, sequenceEnd]);
  useEffect(
    () => () => {
      previewScheduler.current.cancelLatestPreview();
      renderAbort.current?.abort();
    },
    [nodeId],
  );
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    let request = 0;
    const tick = (now: number) => {
      const elapsed = ((now - previous) * document.fps) / 1000;
      if (elapsed >= 1) {
        previous = now;
        setFrame((current) => {
          const next = current + Math.floor(elapsed);
          if (next >= sequenceEnd) {
            if (loop) return 0;
            setPlaying(false);
            return sequenceEnd - 1;
          }
          return next;
        });
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, loop, document.fps, sequenceEnd]);
  useEffect(() => {
    if (!expanded) {
      viewport.current?.exitCameraPilot();
      setPlaying(false);
      setFrozenFrame(frame);
    }
  }, [expanded]);
  useEffect(() => {
    const element = workspace.current;
    if (!expanded || !element) return;
    const update = () => setWorkspaceWidth(element.clientWidth || 960);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [expanded]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (deleteRequest) return;
      if (event.defaultPrevented) return;
      if (event.key === "Escape" && hierarchyDragged) {
        event.preventDefault();
        setHierarchyDragged(null);
        setHierarchyPreviewIds(null);
        return;
      }
      const target = event.target;
      const element = target instanceof Element ? target : null;
      const command = event.metaKey || event.ctrlKey;
      const shortcut = timelineShortcutForEvent(event, {
        withinTimeline: Boolean(element?.closest(".camera3d-timeline")),
        lastTimelineShotInteraction: timelineActive,
        entitySelected: selectedIds.length > 0,
        textEntry: Boolean(
          element?.closest("input,textarea,select,[contenteditable=true]"),
        ),
        menuOpen: Boolean(
          globalThis.document.querySelector(".canvas-context-menu"),
        ),
        viewportOwned: Boolean(
          element?.closest(
            ".camera3d-stage,.camera3d-sidebar,.camera3d-local-toolbar",
          ),
        ),
      });
      if (shortcut) {
        event.preventDefault();
        if (shortcut === "undo" || shortcut === "redo")
          restoreSnapshot(
            shortcut === "redo"
              ? history.current.redo()
              : history.current.undo(),
          );
        else if (shortcut === "selection" || shortcut === "slice")
          setActiveEditTool(shortcut);
        else if (shortcut === "mark-in" || shortcut === "mark-out")
          markRenderRange(shortcut === "mark-in" ? "in" : "out");
        else if (shortcut === "delete")
          requestShotDeletion(activeShotId, element as HTMLElement | null);
        else runTimelineCommand(shortcut);
        return;
      }
      const sceneShortcut = sceneShortcutForEvent(event, {
        sceneOwned:
          Boolean(
            element?.closest(
              ".camera3d-stage,.camera3d-sidebar,.camera3d-local-toolbar",
            ),
          ) ||
          (selectedIds.length > 0 && !timelineActive),
        textEntry: Boolean(
          element?.closest("input,textarea,select,[contenteditable=true]"),
        ),
        numericScrub: Boolean(
          element?.closest("[data-numeric-scrubbing=true]"),
        ),
        menuOrDialogOpen: Boolean(
          globalThis.document.querySelector(
            ".canvas-context-menu,[role=dialog],[role=alertdialog]",
          ),
        ),
        timelineOwned:
          Boolean(element?.closest(".camera3d-timeline")) || timelineActive,
      });
      if (sceneShortcut) {
        event.preventDefault();
        event.stopPropagation();
        if (sceneShortcut === "undo" || sceneShortcut === "redo")
          restoreSnapshot(
            sceneShortcut === "redo"
              ? history.current.redo()
              : history.current.undo(),
          );
        else if (sceneShortcut === "copy") {
          if (selectedIds.length)
            setSceneClipboard(
              copySceneEntities(document, selectedIds, selectedGroup?.id)
                .clipboard,
            );
        } else if (sceneShortcut === "paste") {
          if (sceneClipboard) {
            const result = pasteSceneEntities(document, sceneClipboard);
            commit(result.document, { selectedIds: result.entityIds });
            setSelectedIds(result.entityIds);
          }
        } else {
          const ids = selectAllSceneEntities(document, activeShot.entityOrder);
          setSelectedIds(ids);
          selectionAnchor.current = ids.at(-1) || null;
          setTimelineActive(false);
        }
        return;
      }
      if (
        (!selected || !selectedEntityOwnsArrow(event, {
          selectedKind: selected.kind,
          selectedCount: selectedIds.length,
          textEntry: Boolean(element?.closest("input,textarea,select,[contenteditable=true]")),
          menuOpen: Boolean(globalThis.document.querySelector(".canvas-context-menu")),
          timelineRuler: Boolean(element?.closest(".camera3d-ruler,[data-timeline-ruler]")),
          toolbar: Boolean(element?.closest("[role=toolbar],.camera3d-local-toolbar")),
          numericScrub: Boolean(element?.closest("[data-numeric-scrubbing=true]")),
        })) &&
        cameraPanOwnsArrow(event, {
          textEntry: Boolean(
            element?.closest("input,textarea,select,[contenteditable=true]"),
          ),
          menuOpen: Boolean(
            globalThis.document.querySelector(".canvas-context-menu"),
          ),
          ruler: Boolean(
            element?.closest(".camera3d-ruler,[data-timeline-ruler]"),
          ),
          toolbar: Boolean(
            element?.closest("[role=toolbar],.camera3d-local-toolbar"),
          ),
        }) &&
        element?.closest(".camera3d-stage")
      ) {
        event.preventDefault();
        event.stopPropagation();
        viewport.current?.panScreenRight(event.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (
        selectedGroup &&
        !(
          event.altKey &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.key,
        ) &&
        !event.shiftKey &&
        !(event.metaKey && event.ctrlKey) &&
        !element?.closest(
          "input,textarea,select,[contenteditable=true],[role=menu],.camera3d-ruler,[role=toolbar]",
        )
      ) {
        const result = selectedShapeGroupArrowTransform(
          document,
          selectedGroup.id,
          event,
        );
        if (result.handled) {
          event.preventDefault();
          event.stopPropagation();
          commit(result.document, { selectedIds: selectedGroup.childIds });
          return;
        }
      }
      if (
        selected &&
        selectedEntityOwnsArrow(event, {
          selectedKind: selected.kind,
          selectedCount: selectedIds.length,
          textEntry: Boolean(
            element?.closest("input,textarea,select,[contenteditable=true]"),
          ),
          menuOpen: Boolean(
            globalThis.document.querySelector(".canvas-context-menu"),
          ),
          timelineRuler: Boolean(
            element?.closest(".camera3d-ruler,[data-timeline-ruler]"),
          ),
          toolbar: Boolean(
            element?.closest("[role=toolbar],.camera3d-local-toolbar"),
          ),
          numericScrub: Boolean(
            element?.closest("[data-numeric-scrubbing=true]"),
          ),
        })
      ) {
        const result = selectedEntityArrowTransform(
          document,
          selected.id,
          event,
        );
        event.preventDefault();
        event.stopPropagation();
        if (result.blocked) {
          setAlert(
            selected.locks?.transform
              ? "Unlock Transform to edit Transform."
              : "Unlock target to rotate or move Camera laterally.",
          );
          return;
        }
        if (result.transform) startHeldArrow(selected.id, event);
        return;
      }
      if (command && event.code === "KeyD" && selectedIds.length) {
        event.preventDefault();
        let next = document;
        for (const entityId of selectedIds) {
          const entity = next.entities.find((item) => item.id === entityId);
          if (entity) {
            next = addEntity(next, entity.kind, `${entity.name} Copy`);
            const copy = next.entities[next.entities.length - 1];
            copy.color = entity.color;
            copy.transform = {
              ...structuredClone(entity.transform),
              position: [
                entity.transform.position[0] + entity.dimensions[0] + 1,
                entity.transform.position[1],
                entity.transform.position[2],
              ],
            };
          }
        }
        commit(next);
        return;
      }
      if (command && event.code === "KeyG") {
        event.preventDefault();
        if (event.shiftKey) {
          const group = document.groups.find((item) =>
            item.childIds.some((id) => selectedIds.includes(id)),
          );
          if (group) commit(ungroupEntities(document, group.id));
        } else if (selectedIds.length > 1)
          commit(groupEntities(document, selectedIds));
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((value) => !value);
        return;
      }
      if (event.key === "Escape") {
        setActiveEditTool("selection");
        setPlaying(false);
        if (memberEditGroupId) {
          const group = document.groups.find(
            (item) => item.id === memberEditGroupId,
          );
          setMemberEditGroupId(null);
          setSelectedIds(group?.childIds || []);
        } else setSelectedIds([]);
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        if (selectedIds.length) {
          event.preventDefault();
          requestSceneDeletion(selectedIds, element as HTMLElement | null);
        }
        return;
      }
      if (event.key === "ArrowLeft")
        setFrame((value) => Math.max(0, value - (event.shiftKey ? 10 : 1)));
      else if (event.key === "ArrowRight")
        setFrame((value) =>
          Math.min(sequenceEnd, value + (event.shiftKey ? 10 : 1)),
        );
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [
    document,
    selectedIds,
    sequenceEnd,
    timelineActive,
    activeShotId,
    frame,
    shotClipboard,
    sceneClipboard,
    deleteRequest,
    hierarchyDragged,
  ]);
  const deploy = (kind: EntityKind, name: string, ground: Vec3 = [0, 0, 0]) => {
    if (playing) return;
    if (kind === "camera") {
      const next = deployCameraShot(document, ground);
      const selection = cameraDeploymentSelection(next);
      if (!selection) return;
      flushSync(() => {
        commit(next, selection, false);
        setActiveShotId(selection.activeShotId);
        setFrame(selection.frame);
        setSelectedClipShotId(null);
        setSelectedIds(selection.selectedIds);
        saveState(next, artifactStore.current.snapshot(), selection.frame);
      });
      return;
    }
    const next = addEntityAt(document, kind, name, ground);
    commit(next);
    selectEntities([next.entities[next.entities.length - 1].id]);
  };
  const resizeSidebar = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = sidebarResize.current;
    if (!drag) return;
    setSidebarWidth(
      cameraSidebarWidthForWorkspace(
        clampCameraSidebarWidth(drag.startWidth + drag.startX - event.clientX),
        workspaceWidth,
      ),
    );
  };
  const resizeInspectorSplit = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!inspectorResize.current || !sceneSplit.current) return;
    const rect = sceneSplit.current.getBoundingClientRect();
    setInspectorFraction(
      cameraInspectorSplitForPointer(rect.height, event.clientY - rect.top) /
        (rect.height - 7),
    );
  };
  const transformEntity = (
    entityId: string,
    authored: Transform,
    explicitAxis: "X" | "Y" | "Z" | "XYZ" | null = null,
    optionBypass = false,
  ) => {
    const result = applyTransformCommit(document, entityId, authored, {
      ...aids,
      groundSnap: false,
      optionBypass,
      explicitAxis,
      frame,
    });
    if (!result.ok) {
      setAlert(
        result.code === "COLLISION_PREVENTED"
          ? "Collision prevented. Hold Option while dragging only bypasses Grid Snap."
          : "Transform could not be applied.",
      );
      return;
    }
    setAlert("");
    commit(result.document);
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Alt" || event.key === "Meta" || event.key === "Control")
        heldArrow.current?.modifier(event);
    };
    const keyup = (event: KeyboardEvent) => {
      const active = heldArrow.current;
      if (event.key === "Alt" || event.key === "Meta" || event.key === "Control") {
        if (active?.modifier(event)) {
          heldArrow.current = null;
          return;
        }
      }
      if (active?.keyup(event.key)) heldArrow.current = null;
    };
    const cancel = () => cancelHeldArrow();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    const removeNativeKey = window.cameraTester.onNativeKey?.((event) => {
      const active = heldArrow.current;
      if (event.type === "keyup") {
        if (event.key === "Alt" || event.key === "Meta" || event.key === "Control") {
          if (active?.modifier(event)) { heldArrow.current = null; return; }
        }
        if (active?.keyup(event.key)) heldArrow.current = null;
        return;
      }
      if (event.key === "Alt" || event.key === "Meta" || event.key === "Control") {
        active?.modifier(event);
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      const ids = selectedIdsRef.current;
      const selected = ids.length === 1 ? documentRef.current.entities.find((entity) => entity.id === ids[0]) : undefined;
      const element = globalThis.document.activeElement as HTMLElement | null;
      if (!selected || !selectedEntityOwnsArrow(event, {
        selectedKind: selected.kind,
        selectedCount: ids.length,
        textEntry: Boolean(element?.closest("input,textarea,select,[contenteditable=true]")),
        menuOpen: Boolean(globalThis.document.querySelector(".canvas-context-menu")),
        timelineRuler: Boolean(element?.closest(".camera3d-ruler,[data-timeline-ruler]")),
        toolbar: Boolean(element?.closest("[role=toolbar],.camera3d-local-toolbar")),
        numericScrub: Boolean(element?.closest("[data-numeric-scrubbing=true]")),
      })) return;
      const result = selectedEntityArrowTransform(documentRef.current, selected.id, event);
      if (!result.blocked && result.transform) startHeldArrow(selected.id, event);
    });
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("keyup", keyup);
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("keydown", keydown, true); window.removeEventListener("keyup", keyup); window.removeEventListener("keydown", escape, true); window.removeEventListener("blur", cancel); removeNativeKey?.(); cancel(); };
  }, []);
  // Selection and timeline ownership cancellation is handled by their owning transitions.
  const contextCommand = (
    command: import("./exactCanvasCamera").SceneMenuCommand,
    entityIds: string[],
    ground: Vec3,
  ) => {

    if (command === "reset-transform" && entityIds.length === 1) {
      commit(resetEntityTransform(document, entityIds[0]), {
        selectedIds: entityIds,
      });
      return;
    }
    if (command === "lock" && entityIds[0]) {
      viewport.current?.cancelDirectResize();
      commit(toggleEntityLockScope(document, entityIds[0], "all"));
      return;
    }
    if (command === "allow-below-canvas" && entityIds[0]) {
      const entity = document.entities.find((item) => item.id === entityIds[0]);
      if (entity)
        commit(
          setAllowBelowCanvas(
            document,
            { type: "entity", id: entity.id },
            !entity.allowBelowCanvas,
          ),
        );
      return;
    }
    if (command.startsWith("prompt-")) {
      const tools: Partial<Record<SceneMenuCommand, ObjectPromptTool>> = {
        "prompt-describe": "Describe This Object",
        "prompt-ask": "Ask About Object",
        "prompt-similar": "Create Similar Object",
        "prompt-reference": "Use As Reference",
        "prompt-tutorial": "Tutorial",
      };
      setObjectPromptTool(tools[command]);
      setObjectAssistantError("");
      setObjectCreatorOpen(true);
      return;
    }
    if (command === "copy") {
      setSceneClipboard(copySceneEntities(document, entityIds).clipboard);
      return;
    }
    if (command === "cut") {
      const result = cutSceneEntities(document, entityIds);
      setSceneClipboard(result.clipboard);
      commit(result.document);
      setSelectedIds([]);
      return;
    }
    if (command === "paste" && sceneClipboard) {
      const result = pasteSceneEntities(document, sceneClipboard, ground);
      commit(result.document);
      setSelectedIds(result.entityIds);
      return;
    }
    if (command === "duplicate") {
      const copied = copySceneEntities(document, entityIds);
      const result = pasteSceneEntities(document, copied.clipboard, [1, 0, 1]);
      commit(result.document);
      setSelectedIds(result.entityIds);
      return;
    }
    if (command === "delete") {
      requestSceneDeletion(entityIds);
      return;
    }
    if (command === "group") {
      commit(groupEntities(document, entityIds));
      return;
    }
    if (command === "edit-members") {
      const group = document.groups.find((item) =>
        entityIds.every((id) => item.childIds.includes(id)),
      );
      if (group && !group.shapeLocked) {
        setMemberEditGroupId(group.id);
        setSelectedIds([group.childIds[0]]);
      }
      return;
    }
    if (command === "lock-shape") {
      const group = document.groups.find((item) =>
        entityIds.every((id) => item.childIds.includes(id)),
      );
      if (group) {
        commit(toggleShapeLock(document, group.id));
        setMemberEditGroupId(null);
        setSelectedIds(group.childIds);
      }
      return;
    }
    if (command === "ungroup") {
      const group = document.groups.find((item) =>
        entityIds.every((id) => item.childIds.includes(id)),
      );
      if (group) {
        commit(ungroupEntities(document, group.id));
        setMemberEditGroupId(null);
        setSelectedIds(group.childIds);
      }
      return;
    }
    if (command === "make-active" && entityIds[0])
      commit({
        ...document,
        shots: document.shots.map((shot) =>
          shot.id === activeShot.id
            ? {
                ...shot,
                camera: { ...shot.camera, activeCameraId: entityIds[0] },
              }
            : shot,
        ),
      });
  };
  const createPromptObject = ({
    prompt,
    reference,
  }: {
    prompt: string;
    reference?: File;
  }) => {
    if (reference) {
      setObjectAssistantError(
        "This isolated camera surface accepts prompt-only local Object drafts.",
      );
      return;
    }
    const recipe: ObjectRecipeV1 = {
      schema: "prism.object-recipe",
      version: 1,
      id: "camera-object-draft",
      name: prompt.trim(),
      parts: [{
        id: "body",
        kind: "block",
        dimensions: [1, 1, 1],
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], anchor: [0, 0, 0] },
      }],
    };
    const lifecycle = createLocalObjectLifecycle(() => `object-${crypto.randomUUID()}`);
    const preview = lifecycle.send(recipe);
    if (!preview.object) return;
    const object = lifecycle.apply().object!;
    const minimum = evaluateStructuredObject(object).worldBounds.min.y;
    if (minimum < 0) object.transform.position[1] -= minimum;
    commit({
      ...document,
      objects: [...(document.objects || []), object],
      sceneTree: [...(document.sceneTree || []), object.id],
    });
    setObjectCreatorOpen(false);
  };
  const hierarchyEntityRow = (entity: SceneEntity, groupId?: string) => {
    const Icon = SCENE_ICONS[entity.kind];
    const cameraIndex = document.entities
      .filter((item) => item.kind === "camera")
      .findIndex((item) => item.id === entity.id);
    return (
      <button
        key={entity.id}
        draggable={false}

        onDragStart={(event) => event.preventDefault()}
        className={`camera3d-entity-row ${groupId ? "is-group-member" : ""} ${entity.kind === "camera" ? "is-camera" : ""} ${selectedIds.includes(entity.id) ? "is-active" : ""}`}
        role="treeitem"
        aria-selected={selectedIds.includes(entity.id)}
        onDoubleClick={() => {
          const group = groupId
            ? document.groups.find((item) => item.id === groupId)
            : undefined;
          if (group && !group.shapeLocked) {
            setMemberEditGroupId(group.id);
            setSelectedIds([entity.id]);
          }
        }}
        onClick={(event) => {
          const order = [
            ...new Set(document.shots.flatMap((shot) => shot.entityOrder)),
          ];
          const editIndex = memberEditGroupId
            ? document.groups.findIndex((item) => item.id === memberEditGroupId)
            : -1;
          const next = cameraHierarchySelection(
            order,
            selectedIds,
            selectionAnchor.current,
            entity.id,
            { shift: event.shiftKey, meta: event.metaKey || event.ctrlKey },
            document.groups,
            editIndex >= 0 ? editIndex : null,
          );
          selectionAnchor.current = next.anchor;
          selectEntities(next.selected);
        }}
      >
        <Icon size={12} />
        <span style={{ background: entity.color }} />
        {entity.kind === "camera" ? (
          <span>
            <strong>
              {String(cameraIndex + 1).padStart(2, "0")} · {entity.name}
            </strong>
            <small>
              CameraShot · {String(cameraIndex + 1).padStart(2, "0")} ·{" "}
              {entity.camera?.focalLength}mm ·{" "}
              {document.entities.filter((item) => item.kind === "camera").at(-1)
                ?.id === entity.id
                ? "End"
                : `${entity.camera?.ease}`}
            </small>
          </span>
        ) : (
          entity.name
        )}
      </button>
    );
  };
  const toggleSelectedCameraTransformLock = () => {
    if (!selected) return;
    commit(toggleEntityLockScope(document, selected.id, "transform"), { selectedIds: [selected.id] });
  };
  const toggleSelectedCameraRotationLock = () => {
    if (!selected) return;
    commit(toggleEntityLockScope(document, selected.id, "rotation"), { selectedIds: [selected.id] });
  };
  const toggleSelectedCameraSettingsLock = () => { if (selected) commit(toggleEntityLockScope(document, selected.id, "settings"), { selectedIds: [selected.id] }); };
  if (!expanded)
    return (
      <>
        <CameraCompactNode
          nodeId={nodeId}
          document={document}
          frozenFrame={frozenFrame}
          artifacts={artifactSnapshot}
          resolutions={artifactResolutions}
          onOpen={onOpen}
          onSelect={(id) => {
            artifactStore.current.select(id);
            const next = artifactStore.current.snapshot();
            setArtifactSnapshot(next);
            saveState(document, next);
          }}
          onReveal={(id) =>
            void window.cameraTester?.revealMedia?.(
              nodeId,
              id,
              artifactStore.current.list().find((item) => item.id === id)
                ?.locator || "",
            )
          }
          onRename={(id) => {
            const artifact = artifactStore.current
              .list()
              .find((item) => item.id === id);
            const name = artifact
              ? prompt("Rename Generated Media", artifact.name)
              : null;
            if (!name?.trim()) return;
            artifactStore.current.rename(id, name);
            const next = artifactStore.current.snapshot();
            setArtifactSnapshot(next);
            saveState(document, next);
          }}
          onFavorite={(id) => {
            artifactStore.current.favorite(id);
            const next = artifactStore.current.snapshot();
            setArtifactSnapshot(next);
            saveState(document, next);
          }}
          onDelete={(id) => requestArtifactDeletion(id)}
        />
        {deleteRequest && (
          <CameraDeleteDialog
            request={deleteRequest}
            committing={deleteCommitting}
            onCancel={() => setDeleteRequest(null)}
            onConfirm={() => void confirmRequestedDeletion()}
          />
        )}
      </>
    );
  if (!activeShot)
    return (
      <section ref={workspace} className="camera3d-workspace" aria-label="3D Camera workspace" style={{ gridTemplateColumns: `minmax(600px, 1fr) ${effectiveSidebarWidth}px` }}>
        <main className="camera3d-main">
          <div className="camera3d-local-toolbar" role="toolbar" aria-label="Viewport tools"><button className="is-active" aria-label="Select (V)"><MousePointer2 size={14} /></button></div>
          <div className="camera3d-stage"><CameraViewport ref={viewport} document={document} frame={frame} selectedIds={selectedIds} guides={guides} onSelect={setSelectedIds} onTransform={transformEntity} resizeAids={aids} onAddAt={deploy} clipboardAvailable={Boolean(sceneClipboard)} activeCameraId={null} onContextCommand={contextCommand} /></div>
          <CameraShotTimeline
            document={document}
            frame={frame}
            selectedShotId=""
            expanded={timelineExpanded}
            timelineHeight={timelineHeight}
            onTimelineHeight={setTimelineHeight}
            showKeyframes={false}
            onFrame={setFrame}
            onShot={() => {}}
            onToggleExpanded={() => setTimelineExpanded((value) => !value)}
            onToggleKeyframes={() => {}}
            onReorder={() => {}}
            onResizeShot={() => {}}
            onEase={() => {}}
            onTool={() => {}}
            onEditTool={(tool) => setActiveEditTool(tool)}
          />
        </main>
        <aside className="node-inspector-panel camera3d-sidebar" aria-label="Scene hierarchy"><div className="camera3d-hierarchy" role="tree"><p role="status">Camera Required</p><p>Add a Camera to create a Shot and timeline clip.</p></div></aside>
      </section>
    );
  return (
    <>
      <section
        ref={workspace}
        className="camera3d-workspace"
        aria-label="3D Camera workspace"
        aria-hidden={deleteRequest ? true : undefined}
        inert={Boolean(deleteRequest)}
        style={{
          gridTemplateColumns: `minmax(600px, 1fr) ${effectiveSidebarWidth}px`,
        }}
      >
        <main className="camera3d-main">
          <div
            className="camera3d-local-toolbar"
            role="toolbar"
            aria-label="Viewport tools"
          >
            <button className="is-active" aria-label="Select (V)">
              <MousePointer2 size={14} />
            </button>
            <i />
            {(
              [
                ["gridSnap", Magnet, "Grid Snap"],
                ["collision", ShieldCheck, "Collision"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                className={aids[id] ? "is-active" : ""}
                aria-pressed={aids[id]}
                aria-label={label}
                onClick={() =>
                  setAids((value) => ({ ...value, [id]: !value[id] }))
                }
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
            <button
              aria-label="Ground Snap"
              disabled={!selected || playing}
              onClick={() => {
                if (!selected) return;
                const result = applyTransformCommit(
                  document,
                  selected.id,
                  selected.transform,
                  {
                    gridSnap: false,
                    collision: aids.collision,
                    groundSnap: true,
                    optionBypass: false,
                    explicitAxis: "Y",
                    frame,
                  },
                );
                if (result.ok) commit(result.document);
              }}
            >
              <Move3d size={14} />
              <span>Ground Snap</span>
            </button>
            <i />
            {(
              [
                ["cameraPath", "Camera Path"],
                ["fov", "FOV"],
                ["entityPaths", "Entity Paths"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={guides[id] ? "is-active" : ""}
                aria-pressed={guides[id]}
                onClick={() =>
                  setGuides((value) => ({ ...value, [id]: !value[id] }))
                }
              >
                {label}
              </button>
            ))}
            <i />
            {renderProgress && (
              <output
                className="camera3d-render-progress"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                Rendering {renderProgress.completed} / {renderProgress.total}{" "}
                frames…
              </output>
            )}
            <button
              className="camera3d-render-terminal"
              aria-label={cameraRenderActionLabel(
                document,
                artifactSnapshot,
                artifactResolutions,
                rendering,
              )}
              data-tooltip={cameraRenderActionLabel(
                document,
                artifactSnapshot,
                artifactResolutions,
                rendering,
              )}
              onClick={() => {
                if (rendering) {
                  renderAbort.current?.abort();
                  setAlert("Render cancelled.");
                  return;
                }
                void startLocalRender();
              }}
            >
              {rendering ? (
                <StopCircle size={14} />
              ) : cameraRenderActionLabel(
                  document,
                  artifactSnapshot,
                  artifactResolutions,
                  false,
                ) === "Rerender" ? (
                <RefreshCcw size={14} />
              ) : (
                <Play size={14} />
              )}
              <span>
                {cameraRenderActionLabel(
                  document,
                  artifactSnapshot,
                  artifactResolutions,
                  rendering,
                )}
              </span>
            </button>
          </div>
          <div
            className="camera3d-stage"
            onPointerDownCapture={() => {
              setTimelineActive(false);
              setSelectedClipShotId(null);
            }}
          >
            <CameraViewport
              ref={viewport}
              document={viewportDocument}
              frame={frame}
              selectedIds={selectedIds}
              guides={guides}
              memberEditGroupId={memberEditGroupId}
              onSelect={selectEntities}
              onTransform={transformEntity}
              onTransformPreview={previewTransform}
              onDocumentPreview={previewDocument}
              onPreviewCancel={cancelPreview}
              resizeAids={{
                gridSnap: aids.gridSnap,
                collision: aids.collision,
              }}
              onDirectResizeCommit={(next) => {
                setAlert("");
                commit(next);
              }}
              onDirectResizeError={(message) => setAlert(message)}
              onDimensionResize={(id, axes, delta, optionBypass) => {
                const result = applyDimensionResize(document, id, {
                  axes,
                  delta,
                  gridSnap: aids.gridSnap,
                  optionBypass,
                  collision: aids.collision,
                  frame,
                });
                if (result.ok) commit(result.document);
                else setAlert("Collision prevented.");
              }}
              onSphereResize={(id, delta, optionBypass) => {
                const result = applySphereRadiusResize(document, id, {
                  delta,
                  gridSnap: aids.gridSnap,
                  optionBypass,
                  collision: aids.collision,
                  frame,
                });
                if (result.ok) commit(result.document);
                else
                  setAlert(
                    result.code === "COLLISION_PREVENTED"
                      ? "Collision prevented."
                      : "Sphere radius could not be applied.",
                  );
              }}
              onAddAt={deploy}
              clipboardAvailable={Boolean(sceneClipboard)}
              activeCameraId={activeShot.camera.activeCameraId || null}
              onContextCommand={contextCommand}
              onObjectColor={(id, color) =>
                commit(setEntityPaletteColor(document, id, color))
              }
              playbackRunning={playing}
              onPilotPreview={(id, transform) => previewTransform(id, transform)}
              onPilotCommit={(id, transform) => transformEntity(id, transform)}
            />
          </div>

          <CameraShotTimeline
            document={viewportDocument}
            frame={frame}
            timelineHeight={timelineHeight}
            onTimelineHeight={setTimelineHeight}
            selectedEntityId={selected?.id}
            selectedShotId={selectedClipShotId || ""}
            selectedKeyframeId={selectedKeyframeId}
            expanded={timelineExpanded}
            showKeyframes={showKeyframes}
            playing={playing}
            loop={loop}
            activeEditTool={activeEditTool}
            shotClipboardAvailable={Boolean(shotClipboard)}
            renderMarks={renderMarks}
            timelineLocked={Boolean(document.timelineEditLocked)}
            onToggleTimelineLock={() => commit(toggleTimelineEditLock(document))}
            rangeStatus={rangeStatus}
            onRenderMarks={updateRenderMarks}
            onEditTool={(tool) => {
              setActiveEditTool(tool);
              setTimelineActive(true);
              setSelectedIds([]);
            }}
            onShotCommand={(command, shotId) =>
              command === "delete"
                ? requestShotDeletion(shotId)
                : runTimelineCommand(command, shotId)
            }
            onShotColor={(shotId, color) =>
              commit(setShotClipColor(document, shotId, color))
            }
            onSliceShot={(shotId) => runTimelineCommand("slice", shotId)}
            onDuplicateShot={(shotId, insertionIndex) => {
              const snapshot = duplicateNodeShotAtBoundary(
                history.current,
                { document, activeShotId, frame, selectedIds },
                shotId,
                insertionIndex,
              );
              setDocument(snapshot.document);
              setActiveShotId(snapshot.activeShotId);
              setFrame(snapshot.frame);
              setSelectedIds(snapshot.selectedIds);
              setTimelineActive(true);
            }}
            onPlay={() => {
              setTimelineActive(true);
              setPlaying((value) => !value);
            }}
            onStop={() => {
              setTimelineActive(true);
              setPlaying(false);
            }}
            onLoop={() => {
              setTimelineActive(true);
              setLoop((value) => !value);
            }}
            onFrame={(value) => {
              setTimelineActive(true);
              setFrame(value);
            }}
            onShot={(shotId) => {
              const shot = document.shots.find((item) => item.id === shotId)!;
              setActiveShotId(shotId);
              setSelectedIds(shot.camera.activeCameraId ? [shot.camera.activeCameraId] : []);
              setTimelineActive(true);
              setFrame(shot.startFrame);
            }}
            onClipSelect={(shotId) => {
              const shot = document.shots.find((item) => item.id === shotId);
              setSelectedClipShotId(shotId);
              if (shot) {
                setActiveShotId(shot.id);
                setSelectedIds(shot.camera.activeCameraId ? [shot.camera.activeCameraId] : []);
              }
            }}
            onToggleExpanded={() => setTimelineExpanded((value) => !value)}
            onToggleKeyframes={() => setShowKeyframes((value) => !value)}
            onReorder={(shotId, beforeShotId) => {
              setTimelineActive(true);
              commit(reorderShots(document, shotId, beforeShotId));
            }}
            onResizeShot={(shotId, frames) => {
              const result = resizeShotFrames(document, shotId, frames);
              if (result.ok) {
                setShotOverflow(null);
                commit(result.document);
              } else setShotOverflow(result.overflow);
            }}
            onEase={(keyframeId, ease) => {
              if (!selected) return;
              commit({
                ...document,
                entities: document.entities.map((entity) =>
                  entity.id === selected.id
                    ? {
                        ...entity,
                        keyframes: entity.keyframes.map((keyframe) =>
                          keyframe.id === keyframeId
                            ? { ...keyframe, ease }
                            : keyframe,
                        ),
                      }
                    : entity,
                ),
              });
            }}
            onDismissEase={() => setSelectedKeyframeId(undefined)}
            onTimelinePropertyKeyframe={(property) => {
              if (!selected) return;
              const result = selectedShotCamera && (property === "camera.target" || property === "camera.movement")
                ? toggleShotCameraPropertyKeyframe(document, selectedShotCamera.id, property as import("./model").KeyframeProperty, frame)
                : toggleEntityPropertyKeyframe(document, selected.id, property as import("./model").KeyframeProperty, frame);
              commit(result.document, { selectedIds: [selected.id] });
              setSelectedKeyframeId(result.action === "added" ? result.keyframeId : undefined);
            }}
            onTimelinePropertyReset={(property) => {
              if (!selected) return;
              const result = property.startsWith("camera.") && selectedShotCamera
                ? resetShotCameraProperty(document, selectedShotCamera.id, property as "camera.focalLength" | "camera.movement" | "camera.target", frame)
                : document;
              commit(result, { selectedIds: [selected.id] });
            }}
            onKeyframeSelect={(id, atFrame) => {
              setFrame(atFrame);
              setSelectedKeyframeId(id);
            }}
            onTool={(tool) => {
              if (tool === "select" || tool === "position" || tool === "rotate")
                viewport.current?.setInteractionMode(tool);
              else if (tool === "view-camera" && selected?.kind === "camera")
                viewport.current?.viewThroughCamera(selected.id);
              else if (tool === "cut" || tool === "continue")
                commit(setBoundary(document, activeShot.id, tool));
              else if (
                (tool === "previous-camera" || tool === "next-camera") &&
                selected?.kind === "camera"
              ) {
                const points = selected.keyframes
                  .filter(
                    (keyframe) =>
                      keyframe.property === "position" ||
                      keyframe.property?.startsWith("position."),
                  )
                  .sort((a, b) => a.frame - b.frame);
                const point =
                  tool === "previous-camera"
                    ? points.filter((keyframe) => keyframe.frame < frame).at(-1)
                    : points.find((keyframe) => keyframe.frame > frame);
                if (point) {
                  setFrame(point.frame);
                  setSelectedKeyframeId(point.id);
                } else {
                  const cameras = document.entities.filter(
                    (entity) => entity.kind === "camera",
                  );
                  const index = cameras.findIndex(
                    (entity) => entity.id === selected.id,
                  );
                  const next =
                    cameras[
                      Math.max(
                        0,
                        Math.min(
                          cameras.length - 1,
                          index + (tool === "next-camera" ? 1 : -1),
                        ),
                      )
                    ];
                  if (next) setSelectedIds([next.id]);
                }
              }
            }}
          />
        </main>
        <aside
          className="node-inspector-panel camera3d-sidebar"
          onPointerDownCapture={() => {
            setTimelineActive(false);
            setSelectedClipShotId(null);
          }}
          style={{ width: effectiveSidebarWidth }}
        >
          <div
            className="camera3d-sidebar-resize"
            role="separator"
            aria-label="Resize inspector"
            aria-orientation="vertical"
            aria-valuemin={300}
            aria-valuemax={Math.min(480, Math.max(300, workspaceWidth - 600))}
            aria-valuenow={effectiveSidebarWidth}
            tabIndex={0}
            onPointerDown={(event) => {
              sidebarResize.current = {
                startX: event.clientX,
                startWidth: effectiveSidebarWidth,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={resizeSidebar}
            onPointerUp={(event) => {
              sidebarResize.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
              event.preventDefault();
              setSidebarWidth((width) =>
                cameraSidebarWidthForWorkspace(
                  cameraSidebarWidthForKey(width, event.key),
                  workspaceWidth,
                ),
              );
            }}
          />
          <header>
            <div>
              <strong>
                {selectedGroup
                  ? selectedGroup.name
                  : selected
                    ? selected.name
                    : activeShot.name}
              </strong>
              <small>
                {selectedGroup
                  ? "Shape Group"
                  : selected
                    ? selected.kind
                    : "Camera"}
              </small>
            </div>
            {selected && (
              <button
                type="button"
                className="camera3d-location-lock-button"
                aria-label={
                  selected.locks?.all ? "Unlock All" : "Lock All"
                }
                title={
                  selected.locks?.all ? "Unlock All" : "Lock All"
                }
                aria-pressed={Boolean(selected.locks?.all)}
                onClick={() => commit(toggleEntityLockScope(document, selected.id, "all"), { selectedIds: [selected.id] })}
              >
                {selected.locks?.all ? (
                  <Lock size={13} />
                ) : (
                  <Unlock size={13} />
                )}
              </button>
            )}
          </header>
          <>
            <div
              ref={sceneSplit}
              className="camera3d-scene-split"
              style={{
                gridTemplateRows: `minmax(160px, ${1 - inspectorFraction}fr) 7px minmax(160px, ${inspectorFraction}fr)`,
              }}
            >
              <div
                ref={hierarchyRef}
                className="camera3d-hierarchy"
                role="tree"
                aria-label="Scene hierarchy"
              >
                <CameraSceneHierarchy
                  document={document}
                  activeShotId={activeShot.id}
                  selectedIds={selectedIds}
                  expandedGroups={expandedGroups}
                  onShot={(shotId) => {
                    const shot = document.shots.find(
                      (item) => item.id === shotId,
                    )!;
                    setActiveShotId(shotId);
                    setFrame(shot.startFrame);
                    setSelectedIds(shot.camera.activeCameraId ? [shot.camera.activeCameraId] : []);
                    setSelectedClipShotId(null);
                  }}
                  onBoundaryChange={(shotId, boundary) => {
                    commit(setBoundary(document, shotId, boundary));
                  }}
                  onEntity={(entityId, event) => {
                    const entity = document.entities.find((item) => item.id === entityId);
                    if (entity?.kind === "camera") {
                      const shot = document.shots.find((item) => item.camera.activeCameraId === entity.id);
                      if (shot) {
                        selectionAnchor.current = null;
                        setActiveShotId(shot.id);
                        setFrame(shot.startFrame);
                        setSelectedIds([entity.id]);
                        setSelectedClipShotId(null);
                        setTimelineActive(false);
                      }
                      return;
                    }
                    const result = cameraHierarchySelection(
                      activeShot.entityOrder,
                      selectedIds,
                      selectionAnchor.current,
                      entityId,
                      {
                        shift: Boolean(event?.shiftKey),
                        meta: Boolean(event?.metaKey || event?.ctrlKey),
                      },
                      document.groups,
                      memberEditGroupId
                        ? document.groups.findIndex(
                            (group) => group.id === memberEditGroupId,
                          )
                        : null,
                    );
                    selectionAnchor.current = result.anchor;
                    selectEntities(result.selected);
                  }}
                  onObject={(objectId) => {
                    setSelectedIds([objectId]);
                    setSelectedClipShotId(null);
                  }}
                  onGroup={(group) => {
                    setMemberEditGroupId(null);
                    setSelectedIds(recursiveGroupEntityIds(document, group.id));
                    setSelectedClipShotId(null);
                  }}
                  onToggleGroup={(groupId) =>
                    setExpandedGroups((current) => {
                      const next = new Set(current);
                      next.has(groupId)
                        ? next.delete(groupId)
                        : next.add(groupId);
                      return next;
                    })
                  }
                  onAllLock={(shotId) => {
                    const shot = document.shots.find((item) => item.id === shotId);
                    if (!shot) return;
                    const camera = cameraEntityForShot(document, shot);
                    if (camera) commit(toggleEntityLockScope(document, camera.id, "all"), { selectedIds: [camera.id] });
                  }}
                  onEntityAllLock={(entityId) => {
                    viewport.current?.cancelDirectResize();
                    commit(toggleEntityLockScope(document, entityId, "all"));
                  }}
                  onDuplicateEntity={(entityId) => {
                    const copied = copySceneEntities(document, [entityId]);
                    const result = pasteSceneEntities(document, copied.clipboard, [1, 0, 1]);
                    commit(result.document, { selectedIds: result.entityIds });
                    setSelectedIds(result.entityIds);
                  }}
                  onDuplicateShot={(shotId) =>
                    commit(duplicateShot(document, shotId))
                  }
                  onDeleteShot={(shotId) => requestShotDeletion(shotId)}
                  onDeleteEntity={(entityId) => requestSceneDeletion([entityId])}
                  onReorderShot={(shotId, beforeId) =>
                    commit(reorderShots(document, shotId, beforeId))
                  }
                />
              </div>
              {false && (
                <div className="camera3d-legacy-hierarchy" aria-hidden="true">
                  <div
                    ref={hierarchyRef}
                    className="camera3d-hierarchy"
                    role="tree"
                    aria-label="Legacy scene hierarchy"
                  >
                    <button
                      className="camera3d-add-shot"
                      onClick={() => {
                        const next = addShot(document);
                        commit(next);
                        setActiveShotId(next.shots[next.shots.length - 1].id);
                      }}
                    >
                      <Plus size={12} />
                      Add Shot
                    </button>
                    {hierarchyShots.map((shot, shotIndex) => (
                      <div key={shot.id} className="camera3d-shot">
                        <div
                          data-shot-id={shot.id}
                          className={`camera3d-shot-row ${activeShot.id === shot.id && selectedIds.length === 0 ? "is-active" : ""} ${hierarchyDragged === shot.id ? "is-reorder-placeholder" : ""}`}
                          role="treeitem"
                          draggable
                          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                          title="Drag to reorder · midpoint preview · Escape cancels"
                          tabIndex={0}
                          aria-expanded={expandedShots.has(shot.id)}
                          aria-selected={
                            activeShot.id === shot.id &&
                            selectedIds.length === 0
                          }
                          onDragStart={() => {
                            setHierarchyDragged(shot.id);
                            setHierarchyPreviewIds(
                              document.shots.map((item) => item.id),
                            );
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (!hierarchyDragged) return;
                            const before = shotRectSnapshot(
                              hierarchyRef.current,
                              ".camera3d-shot-row[data-shot-id]",
                            );
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            setHierarchyPreviewIds((ids) => {
                              const current =
                                ids || document.shots.map((item) => item.id);
                              const next = liveMidpointOrder(
                                current,
                                hierarchyDragged,
                                shot.id,
                                (event.clientY - rect.top) /
                                  Math.max(1, rect.height),
                              );
                              if (next.join("|") !== current.join("|"))
                                requestAnimationFrame(() =>
                                  animateShotFlip(
                                    hierarchyRef.current,
                                    ".camera3d-shot-row[data-shot-id]",
                                    before,
                                    "y",
                                  ),
                                );
                              return next;
                            });
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (hierarchyDragged && hierarchyPreviewIds) {
                              const at =
                                hierarchyPreviewIds.indexOf(hierarchyDragged);
                              commit(
                                reorderShots(
                                  document,
                                  hierarchyDragged,
                                  hierarchyPreviewIds[at + 1] || null,
                                ),
                              );
                            }
                            setHierarchyDragged(null);
                            setHierarchyPreviewIds(null);
                          }}
                          onDragEnd={() => {
                            setHierarchyDragged(null);
                            setHierarchyPreviewIds(null);
                          }}
                          onKeyDown={(event) => {
                            if (
                              event.altKey &&
                              (event.key === "ArrowUp" ||
                                event.key === "ArrowDown")
                            ) {
                              const beforeId = keyboardReorderDestination(
                                document.shots.map((item) => item.id),
                                shot.id,
                                event.key,
                              );
                              if (beforeId !== undefined) {
                                event.preventDefault();
                                event.stopPropagation();
                                commit(
                                  reorderShots(document, shot.id, beforeId),
                                );
                                return;
                              }
                            }
                            onRowKeyDown(event, () => {
                              setActiveShotId(shot.id);
                              setFrame(shot.startFrame);
                              setSelectedIds([]);
                            });
                          }}
                          onClick={() => {
                            setActiveShotId(shot.id);
                            setFrame(shot.startFrame);
                            setSelectedIds([]);
                          }}
                        >
                          <Clapperboard size={13} />
                          <button
                            onDoubleClick={() => {
                              const name = prompt("Rename Shot", shot.name);
                              if (name?.trim())
                                commit({
                                  ...document,
                                  shots: document.shots.map((item) =>
                                    item.id === shot.id
                                      ? { ...item, name: name.trim() }
                                      : item,
                                  ),
                                });
                            }}
                          >
                            {shot.name}
                          </button>
                          <ShotBoundaryChoice
                            shotId={shot.id}
                            name={shot.name}
                            value={shot.boundary}
                            onChange={(boundary) =>
                              commit(setBoundary(document, shot.id, boundary))
                            }
                          />
                          <button
                            aria-label={`Duplicate ${shot.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              commit(duplicateShot(document, shot.id));
                            }}
                          >
                            <Copy size={11} />
                          </button>
                          {shotIndex > 0 && (
                            <button
                              aria-label={`Delete ${shot.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                requestShotDeletion(
                                  shot.id,
                                  event.currentTarget,
                                );
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          <button
                            aria-label={`${expandedShots.has(shot.id) ? "Collapse" : "Expand"} ${shot.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedShots((current) => {
                                const next = new Set(current);
                                next.has(shot.id)
                                  ? next.delete(shot.id)
                                  : next.add(shot.id);
                                return next;
                              });
                            }}
                          >
                            {expandedShots.has(shot.id) ? (
                              <ChevronDown size={12} />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                          </button>
                        </div>
                        {expandedShots.has(shot.id) && (
                          <div
                            role="group"
                            aria-label={`${shot.name} entities`}
                          >
                            {document.groups
                              .filter((group) =>
                                group.childIds.every((id) =>
                                  shot.entityOrder.includes(id),
                                ),
                              )
                              .map((group) => (
                                <div
                                  key={group.id}
                                  className="camera3d-shape-group"
                                  role="group"
                                  aria-label={group.name}
                                >
                                  <button
                                    className={`camera3d-group-row ${selectedGroup?.id === group.id ? "is-active" : ""}`}
                                    role="treeitem"
                                    aria-expanded="true"
                                    aria-selected={
                                      selectedGroup?.id === group.id
                                    }
                                    onClick={() => {
                                      setMemberEditGroupId(null);
                                      setSelectedIds(group.childIds);
                                    }}
                                  >
                                    <Group size={12} />
                                    <span>{group.name}</span>
                                    <small>
                                      {group.shapeLocked ? "Locked" : "Shape"}
                                    </small>
                                  </button>
                                  <div role="group">
                                    {group.childIds
                                      .map((id) =>
                                        document.entities.find(
                                          (entity) => entity.id === id,
                                        ),
                                      )
                                      .filter(Boolean)
                                      .map((entity) =>
                                        hierarchyEntityRow(entity!, group.id),
                                      )}
                                  </div>
                                </div>
                              ))}
                            {shot.entityOrder
                              .filter(
                                (entityId) =>
                                  !document.groups.some((group) =>
                                    group.childIds.includes(entityId),
                                  ),
                              )
                              .map((entityId) => {
                                const entity = document.entities.find(
                                  (item) => item.id === entityId,
                                );
                                return entity
                                  ? hierarchyEntityRow(entity)
                                  : null;
                              })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div
                className="camera3d-inspector-resize"
                role="separator"
                aria-label="Resize hierarchy and Inspector"
                aria-orientation="horizontal"
                aria-valuemin={160}
                aria-valuemax={Math.max(
                  160,
                  (sceneSplit.current?.clientHeight || 327) - 167,
                )}
                tabIndex={0}
                onPointerDown={(event) => {
                  inspectorResize.current = true;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={resizeInspectorSplit}
                onPointerUp={(event) => {
                  inspectorResize.current = false;
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onKeyDown={(event) => {
                  if (
                    (event.key !== "ArrowUp" && event.key !== "ArrowDown") ||
                    !sceneSplit.current
                  )
                    return;
                  event.preventDefault();
                  const total = sceneSplit.current.clientHeight;
                  setInspectorFraction(
                    cameraInspectorHeightForKey(
                      inspectorFraction * (total - 7),
                      event.key,
                      total,
                    ) /
                      (total - 7),
                  );
                }}
              />
              <div className="camera3d-inspector">
                {selected ? (
                  <>
                    <CameraTransformInspector
                      entity={selected}
                      frame={frame}
                      disabled={playing}
                      scaleLinked={scaleLinked}
                      onScaleLinkedChange={persistScaleLinked}
                      onTransformLock={toggleSelectedCameraTransformLock}
                      onRotationLock={toggleSelectedCameraRotationLock}
                      onDraft={(transform) =>
                        previewTransform(selected.id, transform)
                      }
                      onCommit={(transform) =>
                        transformEntity(selected.id, transform)
                      }
                      onDimensions={(dimensions) =>
                        commit({
                          ...document,
                          entities: document.entities.map((entity) =>
                            entity.id === selected.id
                              ? { ...entity, dimensions }
                              : entity,
                          ),
                        })
                      }
                      onRadius={(radius) => {
                        if (selected.resizeLocked) return;
                        if (selected.kind === "column") {
                          const result = applyColumnResize(
                            document,
                            selected.id,
                            {
                              target: "radius",
                              delta: radius - selected.dimensions[0] / 2,
                              direction: 1,
                              gridSnap: false,
                              optionBypass: false,
                              frame,
                            },
                          );
                          if (result.ok) commit(result.document);
                        } else
                          commit({
                            ...document,
                            entities: document.entities.map((entity) =>
                              entity.id === selected.id
                                ? {
                                    ...entity,
                                    dimensions: [
                                      radius * 2,
                                      radius * 2,
                                      radius * 2,
                                    ],
                                  }
                                : entity,
                            ),
                          });
                      }}
                      onHeight={(height) => {
                        if (selected.resizeLocked || selected.kind !== "column")
                          return;
                        const result = applyColumnResize(
                          document,
                          selected.id,
                          {
                            target: "height",
                            delta: height - selected.dimensions[1],
                            direction: 1,
                            gridSnap: false,
                            optionBypass: false,
                            frame,
                          },
                        );
                        if (result.ok) commit(result.document);
                      }}
                      onKeyframe={(property) => {
                        const result = selectedShotCamera
                          ? toggleShotCameraPropertyKeyframe(
                              document,
                              selectedShotCamera.id,
                              property as import("./model").KeyframeProperty,
                              frame,
                            )
                          : toggleEntityPropertyKeyframe(
                              document,
                              selected.id,
                              property as import("./model").KeyframeProperty,
                              frame,
                            );
                        commit(result.document);
                        setSelectedKeyframeId(
                          result.action === "added"
                            ? result.keyframeId
                            : undefined,
                        );
                        setAlert(`Keyframe ${property} ${result.action}`);
                      }}
                      onNavigateKeyframe={(property, direction) => {
                        const frames = selected.keyframes
                          .filter((keyframe) => keyframe.property === property || keyframe.property?.startsWith(`${property}.`))
                          .map((keyframe) => keyframe.frame)
                          .sort((a, b) => a - b);
                        const cameraFrames = selectedShotCamera?.camera.keyframes
                          .filter((keyframe) => keyframe.property === property)
                          .map((keyframe) => keyframe.frame)
                          .sort((a, b) => a - b) || [];
                        const available = [...new Set([...frames, ...cameraFrames])];
                        const target = direction === "previous"
                          ? available.filter((value) => value < frame).at(-1)
                          : available.find((value) => value > frame);
                        if (target !== undefined) setFrame(target);
                      }}
                      onResetTransform={() => {
                        if (selectedShotCamera) {
                          transformEntity(selected.id, {
                            position: [0, 3, 8], rotation: [0, 0, 0], scale: [1, 1, 1], anchor: [0, 0, 0],
                          });
                        } else
                          commit(resetEntityTransform(document, selected.id), {
                            selectedIds: [selected.id],
                          });
                      }}
                      onCancelPreview={cancelPreview}
                      onResetRotation={() => commit(resetEntityRotation(document, selected.id), { selectedIds: [selected.id] })}
                      onReset={(property) => {
                        const [part, axis] = property.split(".");
                        const index = axis ? ["x", "y", "z"].indexOf(axis) : 0;
                        const transform = structuredClone(selected.transform);
                        if (part === "position" || part === "rotation")
                          transform[part][index] = 0;
                        else if (part === "scale") transform.scale[index] = 1;
                        transformEntity(selected.id, transform);
                      }}
                    />
                    {selected.kind === "camera" && (
                      <CameraOpticsInspector
                        entity={selected}
                        entities={document.entities}
                        disabled={playing}
                        frame={frame}
                        durationSeconds={selectedShotCamera ? selectedShotCamera.duration : activeShot.duration}
                        fps={document.fps}
                        shotBoundary={(selectedShotCamera || activeShot).boundary}
                        onBoundaryChange={(boundary) => commit(setBoundary(document, selectedShotCamera?.id || activeShot.id, boundary), { selectedIds: [selected.id] })}
                        onDurationFrames={(frames) => {
                          const result = resizeShotFrames(document, selectedShotCamera?.id || activeShot.id, frames);
                          if (result.ok) { setShotOverflow(null); commit(result.document, { selectedIds: [selected.id] }); } else setShotOverflow(result.overflow);
                        }}
                        onFocalKeyframe={() =>
                          commit(
                            authorCameraFocalLengthKeyframe(
                              document,
                              selectedShotCamera?.id || activeShot.id,
                              frame,
                              selected.camera!.focalLength,
                            ),
                            { selectedIds: [selected.id] },
                          )
                        }
                        onNavigateKeyframe={(property, direction) => {
                          const frames = selectedShotCamera?.camera.keyframes
                            .filter((keyframe) => keyframe.property === property)
                            .map((keyframe) => keyframe.frame)
                            .sort((a, b) => a - b) || [];
                          const target = direction === "previous"
                            ? frames.filter((value) => value < frame).at(-1)
                            : frames.find((value) => value > frame);
                          if (target !== undefined) setFrame(target);
                        }}
                        onResetProperty={(property) => {
                          const shotId = selectedShotCamera?.id || activeShot.id;
                          if (property === 'camera.target') {
                            const free = setCameraAimMode(selected, 'free', document.entities);
                            commit(selectedShotCamera ? updateShotCameraEntity(document, shotId, free) : { ...document, entities: document.entities.map((entity) => entity.id === free.id ? free : entity) }, { selectedIds: [selected.id] });
                          } else commit(resetShotCameraProperty(document, shotId, property, frame), { selectedIds: [selected.id] });
                        }}
                        onMasterReset={() =>
                          commit(
                            resetCameraSection(document, selectedShotCamera?.id || activeShot.id),
                            { selectedIds: [selected.id] },
                          )
                        }
                        onSectionKeyframe={() => {
                          const result = toggleCameraSectionKeyframe(document, selectedShotCamera?.id || activeShot.id, frame);
                          commit(result.document, { selectedIds: [selected.id] });
                        }}
                        onSettingsLock={toggleSelectedCameraSettingsLock}
                        onChange={(next) => {
                          if (selectedShotCamera)
                            commit(
                              updateShotCameraEntity(document, selectedShotCamera.id, next),
                              { selectedIds: [next.id] },
                            );
                          else
                            commit({
                              ...document,
                              entities: document.entities.map((entity) =>
                                entity.id === selected.id ? next : entity,
                              ),
                            });
                        }}
                        onTargetKeyframe={() =>
                          commit(
                            authorCameraTargetKeyframe(
                              document,
                              selectedShotCamera?.id || activeShot.id,
                              frame,
                              selected.camera!.target,
                            ),
                          )
                        }
                        onMovementKeyframe={() =>
                          commit(
                            authorCameraMovementKeyframe(
                              document,
                              selectedShotCamera?.id || activeShot.id,
                              frame,
                              selected.camera!.movement || "static",
                            ),
                          )
                        }
                      />
                    )}
                  </>
                ) : selectedGroup ? (
                  <section className="inspector-section camera3d-group-inspector">
                    <label>SHAPE GROUP</label>
                    <div className="inspector-grid">
                      <p className="inspector-wide">
                        {selectedGroup.childIds.length} objects ·{" "}
                        {selectedGroup.shapeLocked
                          ? "Shape locked"
                          : "Member editing available"}
                      </p>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </>
        </aside>
      </section>
      {objectCreatorOpen && (
        <div className="modal-backdrop camera3d-object-create-backdrop">
          <CameraObjectCreationOwner
            busy={false}
            initialPrompt={objectPromptTool ? "" : undefined}
            onCancel={() => setObjectCreatorOpen(false)}
            onCommit={(input) => void createPromptObject(input)}
          />
        </div>
      )}
      {deleteRequest && (
        <CameraDeleteDialog
          request={deleteRequest}
          committing={deleteCommitting}
          onCancel={() => setDeleteRequest(null)}
          onConfirm={() => void confirmRequestedDeletion()}
        />
      )}
    </>
  );
}
