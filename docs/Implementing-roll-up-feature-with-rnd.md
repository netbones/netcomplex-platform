Implementing a "roll-up" feature with
react-rnd and Zustand involves managing the widget's height state. When rolled up, you set the height to match the header and disable resizing.

1. Define the Zustand Store
   The store manages the dimensions, position, and isRolledUp state. It must save the previous height (lastHeight) before rolling up to restore it later.
   javascript

import { create } from 'zustand';

export const useWidgetStore = create((set) => ({
widgets: {
widget1: { x: 50, y: 50, width: 300, height: 200, isRolledUp: false, lastHeight: 200 },
},
updateLayout: (id, layout) => set((state) => ({
widgets: { ...state.widgets, [id]: { ...state.widgets[id], ...layout } }
})),
toggleRollup: (id) => set((state) => {
const widget = state.widgets[id];
const isRollingUp = !widget.isRolledUp;
return {
widgets: {
...state.widgets,
[id]: {
...widget,
isRolledUp: isRollingUp,
height: isRollingUp ? 40 : widget.lastHeight, // 40px is header height
lastHeight: isRollingUp ? widget.height : widget.lastHeight,
}
}
};
}),
}));

Use code with caution. 2. Create the Widget Component
Use the Rnd component to bind these states. Disable resizing while the widget is rolled up to prevent layout bugs.
javascript

import { Rnd } from 'react-rnd';
import { useWidgetStore } from './store';

export default function DraggableWidget({ id = 'widget1' }) {
const { widgets, toggleRollup, updateLayout } = useWidgetStore();
const widget = widgets[id];

return (
<Rnd
size={{ width: widget.width, height: widget.height }}
position={{ x: widget.x, y: widget.y }}
onDragStop={(e, d) => updateLayout(id, { x: d.x, y: d.y })}
onResizeStop={(e, dir, ref, delta, pos) => {
updateLayout(id, { width: ref.offsetWidth, height: ref.offsetHeight, ...pos });
}}
disableResizing={widget.isRolledUp} //
minHeight={40}
bounds="window"
className="border bg-white shadow-md overflow-hidden rounded-lg" >
{/_Header / Grab Bar_/}
<div className="h-10 bg-gray-100 flex justify-between items-center px-4 cursor-move">
<span className="font-bold">Widget Header</span>
<button onClick={() => toggleRollup(id)}>
{widget.isRolledUp ? 'Expand' : 'Roll-up'}
</button>
</div>

      {/* Conditionally Render Content */}
      {!widget.isRolledUp && (
        <div className="p-4">
          <p>Main widget content goes here.</p>
        </div>
      )}
    </Rnd>

);
}

Use code with caution.
Key Implementation Details

    Next.js Note: Since react-rnd and Zustand interact with the DOM/window, ensure this component is marked as 'use client'.
    Selective Re-renders: Zustand ensures only the specific widget component re-renders when its state changes, keeping the dashboard performant.
    MinHeight: Set minHeight to match your header height (e.g., 40px) to ensure it doesn't accidentally resize smaller than the toggle button
