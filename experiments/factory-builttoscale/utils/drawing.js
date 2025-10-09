/**
 * 
 * @param {*} pos 
 * @param {*} size 
 * @param {TileInfo} patchTile the top left tile of the patch
 */
function ninePatch(pos,size,patchTile){
  size = size.subtract(vec2(1,1));
  let tileSize = patchTile.size.x;
  for(let lx=0;lx<Math.ceil(size.x)+1;lx++){
    for(let ly=0;ly<Math.ceil(size.y)+1;ly++){
      let thisPos = pos.add(vec2(Math.min(lx,size.x),Math.min(ly,size.y)))
      let clipArea = vec2(
        lx>size.x-1&&lx<size.x?size.x%1:1,
        ly>size.y-1&&ly<size.y?size.y%1:1
      )
      drawTile(thisPos.add(clipArea.scale(0.5)),clipArea,patchTile.offset(vec2(
        lx==0?0:lx>=size.x?tileSize*2:tileSize,
        ly==0?tileSize*2:ly>=size.y?0:tileSize
      )))
    }
  }
}