/**
 * Type declarations for justified-layout module
 * Based on https://github.com/flickr/justified-layout
 */

declare module 'justified-layout' {
  interface JustifiedLayoutOptions {
    containerWidth?: number;
    containerPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    boxSpacing?: number | { horizontal?: number; vertical?: number };
    targetRowHeight?: number;
    targetRowHeightTolerance?: number;
    maxNumRows?: number;
    forceAspectRatio?: number | false;
    showWidows?: boolean;
    fullWidthBreakoutRowCadence?: number | false;
    widowLayoutStyle?: 'left' | 'justify' | 'center';
  }

  interface LayoutBox {
    aspectRatio: number;
    top: number;
    width: number;
    height: number;
    left: number;
    forcedAspectRatio?: boolean;
  }

  interface LayoutGeometry {
    containerHeight: number;
    widowCount: number;
    boxes: LayoutBox[];
  }

  function justifiedLayout(
    input: number[] | Array<{ width: number; height: number }>,
    options?: JustifiedLayoutOptions
  ): LayoutGeometry;

  export default justifiedLayout;
}
