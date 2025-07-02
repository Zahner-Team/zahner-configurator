import { create } from "zustand";

export interface PanelSize {
  w: number;
  h: number;
}
export interface WallState {
  width: number;
  height: number;
  seamOffsetX: number;
  seamOffsetY: number;
  patternSeed: number;
  panelSize: PanelSize;
}


export const defaultPanel: PanelSize = { w: 18, h: 36 };


export interface Store {
  wall: WallState;
  materialVariant: "weatheringSteel" | "copper";
  
  // new perforation controls:
  perfoDiameterMin: number    // inches
 perfoDiameterMax: number    // inchesperfoMin: number
 invertPattern: boolean
  setPerfoDiameterMin: (v: number) => void
 setPerfoDiameterMax: (v: number) => void
 setInvertPattern: (b: boolean) => void

 perforate: boolean;
  setPerforate: (b: boolean) => void;

  // scene toggles:
  showEnvironment: boolean;
  backgroundColor: string;
  showGround: boolean;
  groundColor: string;
  // zoom-all:
  zoomAll: boolean;
  
  backgroundVariant: "dark" | "light";
  setBackgroundVariant: (v: "dark" | "light") => void;

  //layout
  layoutOrientation: "portrait" | "landscape";
  returnLeg: number;       // inches
  setLayoutOrientation: (o: "portrait" | "landscape") => void;
  setReturnLeg: (v: number) => void;
  

  

  setZoomAll: (v: boolean) => void;
  setWall: (p: Partial<WallState>) => void;
  setMaterialVariant: (v: "weatheringSteel" | "copper") => void;
  setShowEnvironment: (b: boolean) => void;
  setBackgroundColor: (c: string) => void;
  setShowGround: (b: boolean) => void;
  setGroundColor: (c: string) => void;


  // image
  patternUrl: string
  blur: number
  setPatternUrl: (url: string) => void
  setBlur: (b: number) => void

  //joint adjustments
  jointMin: number;   // default 0.25
  jointMax: number;   // default 3.00
  setJointMin: (v: number) => void;
  setJointMax: (v: number) => void;
}

export default create<Store>((set) => ({
  wall: {
    width: 144,
    height: 108,
    seamOffsetX: 0,
    seamOffsetY: 0,
    patternSeed: 42,
    panelSize: defaultPanel,
  },
  materialVariant: "weatheringSteel",

  // new perforation defaults
  // perforation range in inches (now ⅛″–¾″)
  perfoDiameterMin: 0.0625,      // ¼″
 perfoDiameterMax: 0.5,       // 1½″
 invertPattern: false,
  setPerfoDiameterMin: v => set(() => ({ perfoDiameterMin: v })),
 setPerfoDiameterMax: v => set(() => ({ perfoDiameterMax: v })),
 setInvertPattern: b => set(() => ({ invertPattern: b })),

 perforate: false,
  setPerforate: (b) => set({ perforate: b }),

 backgroundVariant: "light",
  // …existing setters…
  setBackgroundVariant: (v) => set(() => ({ backgroundVariant: v })),

  

  showEnvironment: true,
  backgroundColor: "#ffffff",
  showGround: true,
  groundColor: "#dddddd",
  zoomAll: false,
  setZoomAll: (v) => set(() => ({ zoomAll: v })),
  setWall: (p) => set(s => ({ wall: { ...s.wall, ...p } })),
  setMaterialVariant: (v) => set({ materialVariant: v }),
  setShowEnvironment: b     => set(() => ({ showEnvironment: b })),
  setBackgroundColor: c     => set(() => ({ backgroundColor: c })),
  setShowGround: b          => set(() => ({ showGround: b })),
  setGroundColor: c         => set(() => ({ groundColor: c })),

  //image
  patternUrl: "https://images.unsplash.com/photo-1533481644991-f01289782811?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bW91bnRhaW5zY2FwZXxlbnwwfHwwfHx8MA%3D%3D",
  blur: 0,              // px of blur on the pattern
  setPatternUrl: (url) => set(() => ({ patternUrl: url })),
  setBlur: (b) => set(() => ({ blur: b })),

  //layout
  layoutOrientation: "portrait",
  returnLeg: 2,
  setLayoutOrientation: (o) => set({ layoutOrientation: o }),
  setReturnLeg: (v) => set({ returnLeg: v }),

  // joint adjustments
  // instantiate defaults
  jointMin: 0.25,
  jointMax: 3.0,
  setJointMin: (v) => set({ jointMin: v }),
  setJointMax: (v) => set({ jointMax: v }),
}));
