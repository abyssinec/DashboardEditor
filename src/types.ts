export type AssetKind = "image" | "font";

export type Asset = {
  id: string;
  kind: AssetKind;
  name: string;
  path: string;
  mime: string;
};

export type DataType = "None" | "OBD_CAN" | "CLUSTER_CAN";

export type Gauge = {
  // Data source: OBD CAN, Cluster CAN, or None (disabled)
  dataType: DataType;

  // For OBD_CAN: PID key from PID_CATALOG; for CLUSTER_CAN: reserved (empty for now); "None" disables binding
  gaugeType: "None" | string;

  // Optional mapping range (if not set, runtime may use PID-specific defaults)
  rangeMin?: number;
  rangeMax?: number;

  updateRateMs: number;
  smoothingFactor: number;
};

export type CapStyle = "Flat" | "Round";
 = "Flat" | "Round";

export type ScreenStyle = {
  color: string;
  alpha: number;
  backgroundImageAssetId?: string;
  fill: "Fit";
};

export type ScreenSettings = {
  width: number;
  height: number;
};

export type Screen = {
  id: string;
  name: string;
  settings: ScreenSettings;
  style: ScreenStyle;
  objects: AnyObj[];
};

export type TransformBase = {
  x: number;
  y: number;
  rotation: number;
};

export type LabelTransform = TransformBase & {
  width: number;
  height: number;
};

export type ImageTransform = TransformBase & {
  width: number;
  height: number;
  // legacy (старые проекты могут иметь scale)
  scaleX?: number;
  scaleY?: number;
};

export type ArcTransform = TransformBase & {
  width: number;
  height: number;
  startAngle: number;
  endAngle: number;
};
export type BarTransform = TransformBase & { width: number; height: number };

export type FrameTransform = TransformBase & {
  width: number;
  height: number;
};

export type LayoutType = "None" | "Vertical" | "Horizontal" | "Grid";

export type Padding = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type FrameSettings = {
  layout: LayoutType;
  padding: Padding;
  gapX: number;
  gapY: number;

  // Grid params (используются только если layout === "Grid")
  gridCols: number;
  gridRows: number;

  // Figma-like overflow behavior
  clipContent: boolean;   // if true, children are clipped to frame bounds
  scrollX: number;        // scroll offset (px)
  scrollY: number;        // scroll offset (px)
};

export type LabelSettings = {
  text: string;
  fontAssetId?: string;
  fontSize: number;
  autoSize: "No";
  bold: "Yes" | "No";
  italic: "Yes" | "No";
  align: "Left";
  wrap: "No wrap";
};

export type LabelStyle = {
  color: string;
  alpha: number;
  glow: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  outlineColor: string;
  outlineThickness: number;
};

export type ImageAnimationType = "None" | "Rotation" | "Move" | "Rotation+Move";

export type ImageAnimation = {
  type: ImageAnimationType;
  // Rotation (degrees)
  startRot?: number;
  endRot?: number;
  // Move (pixels, in screen coords)
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
};

export type ImageSettings = {
  animation?: ImageAnimation;
  imageAssetId?: string;
  keepAspect: "Yes" | "No";
  fillMode: "Fit" | "Fill" | "Stretch";
  flip: "None";
};

export type ImageStyle = { alpha: number };

export type ArcSettings = {
  segments: number;
  clockwise: "Yes" | "No";
  previewValue: number;
};

export type ArcStyle = {
  color: string;
  alpha: number;
  glow: number;
  thickness: number;
  capStyle: "Flat";
  backgroundColor: string;
  backgroundAlpha: number;
  backgroundGlow: number;
  backgroundThickness: number;
  backgroundCapStyle: "Flat";
};

export type BarSettings = {
  previewValue: number;
};

export type BarStyle = {
  color: string;
  alpha: number;
  glow: number;
  backgroundColor: string;
  backgroundAlpha: number;
  backgroundGlow: number;
  radius: number;
  capStyle: "Flat";
  backgroundCapStyle: CapStyle;
};

export type ObjBase = {
  id: string;
  type: "Label" | "Image" | "Arc" | "Bar" | "Frame";
  name: string;
  z: number;
  gauge: Gauge;
  // optional visibility flag (default true)
  visible?: boolean;
  // optional parent container (Frame). null/undefined = screen root
  parentId?: string | null;
};

export type LabelObj = ObjBase & {
  type: "Label";
  transform: LabelTransform;
  settings: LabelSettings;
  style: LabelStyle;
};

export type ImageObj = ObjBase & {
  type: "Image";
  transform: ImageTransform;
  settings: ImageSettings;
  style: ImageStyle;
};

export type ArcObj = ObjBase & {
  type: "Arc";
  transform: ArcTransform;
  settings: ArcSettings;
  style: ArcStyle;
};

export type BarObj = ObjBase & {
  type: "Bar";
  transform: BarTransform;
  settings: BarSettings;
  style: BarStyle;
};

export type FrameObj = ObjBase & {
  type: "Frame";
  transform: FrameTransform;
  settings: FrameSettings;
  // children ids (can include frames)
  children: string[];
};

export type AnyObj = LabelObj | ImageObj | ArcObj | BarObj | FrameObj;

export type Project = {
  project: { id: string; name: string };
  assets: { images: Asset[]; fonts: Asset[] };
  screens: Screen[];
};

export type Manifest = {
  format: "nanoFIZ.dashboard";
  version: 1;
  createdUtc: string;
  app: { editor: "DashboardEditor"; editorVersion: string };
  minViewerVersion: number;
};