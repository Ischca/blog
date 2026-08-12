declare module "troika-three-text" {
  import type { ColorRepresentation, Material, Mesh } from "three";

  export class Text extends Mesh {
    text: string;
    anchorX: number | string;
    anchorY: number | string;
    direction: "auto" | "ltr" | "rtl";
    font: string | null;
    unicodeFontsURL: string | null;
    fontSize: number;
    fontWeight: number | "normal" | "bold";
    fontStyle: "normal" | "italic";
    lang: string | null;
    letterSpacing: number;
    lineHeight: number | "normal";
    maxWidth: number;
    overflowWrap: "normal" | "break-word";
    textAlign: "left" | "center" | "right" | "justify";
    textIndent: number;
    whiteSpace: "normal" | "nowrap";
    color: ColorRepresentation | null;
    outlineWidth: number | string;
    outlineColor: ColorRepresentation;
    outlineOpacity: number;
    outlineBlur: number | string;
    outlineOffsetX: number | string;
    outlineOffsetY: number | string;
    strokeWidth: number | string;
    strokeColor: ColorRepresentation;
    strokeOpacity: number;
    fillOpacity: number;
    depthOffset: number;
    glyphGeometryDetail: number;
    sdfGlyphSize: number | null;
    gpuAccelerateSDF: boolean;
    textRenderInfo: {
      blockBounds: [number, number, number, number];
    } | null;
    createDerivedMaterial(baseMaterial: Material): Material;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
