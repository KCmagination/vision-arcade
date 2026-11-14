// Presentation only. The inverse is shared by pointer, touch and drag placement.
export function gridProject(x,z){return {x:500+.78*(x-500)+.16*(z-500),z:500+.78*(z-500)-.08*(x-500)};}
export function gridUnproject(x,z){const a=x-500,b=z-500,d=.78*.78+.16*.08;return {x:500+(.78*a-.16*b)/d,z:500+(.08*a+.78*b)/d};}

// Match the original district artwork in both map captions and the HTML key.
export const GRID_NEED_COLORS=['#6adfd7','#ffc16a','#8fbfff','#bf93ff','#ff9ca7','#f997e4','#ffe095'];
