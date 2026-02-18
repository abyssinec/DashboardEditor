export type AssetKind = "image" | "font";

export type Asset = {
  id: string;
  kind: AssetKind;
  name: string;
  path: string;
  mime: string;
};

export type GaugeType = "None" | "PID";

export type Gauge = {
  gaugeType: "None" | string; // "None" or PID key
  updateRateMs: number;
  smoothingFactor: number;
};

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

export type LabelTransform = TransformBase;
export type ImageTransform = TransformBase & { scaleX: number; scaleY: number };
export type ArcTransform = TransformBase & { startAngle: number; endAngle: number };
export type BarTransform = TransformBase & { width: number; height: number };

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

export type ImageSettings = {
  imageAssetId?: string;
  keepAspect: "Yes";
  fillMode: "Fill";
  flip: "None";
};

export type ImageStyle = { alpha: number };

export type ArcSettings = {
  segments: number;
  clockwise: "Yes";
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
};

export type ObjBase = {
  id: string;
  type: "Label" | "Image" | "Arc" | "Bar";
  name: string;
  z: number;
  gauge: Gauge;
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

export type AnyObj = LabelObj | ImageObj | ArcObj | BarObj;

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


