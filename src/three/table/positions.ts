export function seatPosition(index:number,count:number,radius=1):[number,number,number]{const angle=index*Math.PI*2/count;return [Math.sin(angle)*4.75*radius,.52,Math.cos(angle)*2.3*radius];}
