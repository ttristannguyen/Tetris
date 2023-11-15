import {Block,Constants,Viewport} from "./constants.ts"
import { Action, Move,Rotate,Tick} from "./action.ts"
export {Block,createPiece,initialState,checkCollision,getMovedBlock,lineClearing,newRandomBlock}
import { RNG } from "./utils.ts"
import { scan, type Observable, map, interval } from "rxjs"
export type {Piece,State}
/**
 * Piece type, holds information about a pieces x,y values and its height and width
 * A piece is always a 1x1 block
 */
type Piece = Readonly<{
    x: string,
    y: string,
    height: string,
    width: string,
    style: string,
    id: string
  }>
  // Holds many 1x1 Pieces in an array to form a block
  // Should hold 4 pieces in each Block
  type Block = Readonly<{
    pieces: ReadonlyArray<Piece>
  }>
  
  /** Utility functions */
  /**
   * Used to create a new 1x1 piece at a position
   * @param x starting x val
   * @param y starting y val
   * @param colour // colour of block
   * @returns new Piece object
   */
  function createPiece(x: number , y: number,colour: string, idVal: string):Piece {
    const c = {
      x: `${x*Block.WIDTH + 4* Block.WIDTH}`,
      y:`${y*Block.HEIGHT  - 3*Block.HEIGHT}`,
      height: `${Block.HEIGHT}`,
      width: `${Block.WIDTH}`,
      style: colour,
      id: idVal,
  
    }
    return c;
  }
  /**
   * Updates the location of piece in play after a movement action
   * No longer in use after Actions
   * @param s State paramater
   * @param action action to be executed
   * @returns new State of block after being moved
   */
  function getMovedBlock(s:State,action: Action){
    if (action){
      const updatedState = action.apply(s)
      // const updatedPieceInPlay = {pieces: updatedPiece}
      return updatedState;
    }
    else{ 
      const updatedState = new Move(0,Block.HEIGHT).apply(s)
      // const updatedPieceInPlay = {pieces: updatedPiece}
      return updatedState;
    }
  }
  /** State processing */
  // Holds key information on the state of the game
  type State = Readonly<{
    gameEnd: boolean;
    cubes: ReadonlyArray<Piece>,
    objCount: number,
    pieceInPlay: Block ,
    previewPiece: Block,
    blockGenerator: number,
    linesCleared: number,
    highscore: number,
    remove: ReadonlyArray<Piece>,

  }>;
  // initialState of the game when it loads
  const initialState: State = {
    gameEnd: false,
    cubes: [],
    objCount: 8,
    pieceInPlay:newRandomBlock(0,0),
    previewPiece: newRandomBlock(0,4),
    blockGenerator: 0,
    linesCleared: 0,
    highscore: 0,
    remove: [],
  } as const;
  /**
   * Used every tick, to check if the piece in play has collided with a floor or with a piece
   * @param s State parameter
   * @returns new State object depending on if a collision has happened
   */
  function checkCollision(s:State):State{
    const pieceInPlay = s.pieceInPlay;
    // Check if any of the pieces in play has collided with the floor or with a piece
    const collidedWithFloor = pieceInPlay.pieces.some((p) => Number(p.y) === Viewport.CANVAS_HEIGHT-Number(p.height) )
    const colliedWithPiece = s.cubes.some( (pieceOnMap) => {
      return pieceInPlay.pieces.some( (p) => Number(pieceOnMap.x) === Number(p.x) && Number(p.y) === Number(pieceOnMap.y) -Number(p.height) )
    })
    // if it collided with floor or piece,
    //New piece in play becomes the preview piece and add the collided piece into the cubes that are now on the map
    // A new preview piece is generated for the next collision
    if (collidedWithFloor || colliedWithPiece) {  
    return {...s,
    pieceInPlay: s.previewPiece,
    previewPiece: newRandomBlock(Math.floor(s.blockGenerator),s.objCount), 
    cubes: s.cubes.concat(pieceInPlay.pieces),
    objCount: s.objCount + 4}
      } 
    // if not continue
    else{ return s;}
  }
  /**
   * Used for clearing lines, to check if there are any lines to be cleared
   * @param s State parameter
   * @returns New state depending on a line is cleared or not
   */
  function lineClearing(s:State):State{
    // Array.from creates a new array of an iterable (in our case the Viewport.CANVAS.HEIGHT)
    const filledLines:number[] = Array.from({length: Viewport.CANVAS_HEIGHT}, (_,y) => y)
      .filter( (y) => {  // from an array of 0-800 filter for each y value
        // Filter for pieces that have the y-val above
        const piecesInRow = s.cubes.filter( (pieces) => Number(pieces.y) === y)
        // Check if the pieces array has a length of the grid length (full)
        return piecesInRow.length === Constants.GRID_WIDTH
    })
    
    // Collect pieces in s.cubes that do not have the y value of the values in filledLines
    const newCubes = s.cubes.filter( (piece) => !filledLines.includes(Number(piece.y)))
    // In human speak: Filter for pieces that do NOT have a y-value that is inside filledLines

    // Shift all the cubes, such that if any of the cubes have a y value less than any of 
    // the cleared lines y value it will shift down by 1
    const shiftedNewCubes = newCubes.map( (piece) => {
      const newY = filledLines.reduce( (newY,yVal) =>  Number(piece.y) < Number(yVal) ? newY + Block.HEIGHT : newY,Number(piece.y))
      return {...piece,
        y: `${newY}`}
    })

    const removeCubes = s.cubes.filter( (piece) => filledLines.includes(Number(piece.y)))
    // Update the state to include the new shifted blocks, an increase of the lines cleared and the highscore
    return {...s,
    cubes: shiftedNewCubes,
    linesCleared: s.linesCleared + filledLines.length,
    highscore: s.linesCleared > s.highscore ? s.linesCleared : s.highscore,
    objCount: s.objCount,
    remove: removeCubes}
  }
  /**
   *  Sourced from Week 4 Tutorial 2102 
   * Used to generate a random number stream
   * @param source$ Observable stream to generate number from
   * @returns 
   */
  export function createRngStreamFromSource<T>(source$: Observable<T>) {
    return function createRngStream(
      seed: number = 0
    ): Observable<number> {
      const randomNumberStream = source$.pipe(
        scan((acc,v) => (RNG.hash(acc)),seed),
        map(RNG.scale))
        // map(RNG.scale));
      ;
  
      return randomNumberStream;
    };
  }
  // Hard Coded Blocks for all 7 pieces
  function newRandomBlock(randomInt: number,objCount:number):Block {
    switch (randomInt){

      case 0:
        const squareBlock: Block = {
          pieces:[
            createPiece(0,0,"fill: yellow",`${objCount}`),
            createPiece(0,1,"fill: yellow",`${objCount+1}`),
            createPiece(1,0,"fill: yellow",`${objCount+2}`),
            createPiece(1,1,"fill: yellow",`${objCount+3}`),
          ]
        }
        return squareBlock

      case 1:
        const lBlock: Block = {
          pieces: [
            createPiece(0,1,"fill: orange",`${objCount}`),
            createPiece(0,0,"fill: orange",`${objCount+1}`),
            createPiece(0,2,"fill: orange",`${objCount+2}`),
            createPiece(1,2,"fill: orange",`${objCount+3}`),
            
          ]
        }
        return lBlock;
    
      case 2:
        const reverseLBlock: Block = {
          pieces: [
            createPiece(1,1,"fill: blue",`${objCount}`),
            createPiece(1,0,"fill: blue",`${objCount+1}`),
            createPiece(1,2,"fill: blue",`${objCount+2}`),
            createPiece(0,2,"fill: blue",`${objCount+3}`),
          ]
        }
        return reverseLBlock;
      
      case 3:
        const tBlock: Block = {
          pieces: [
            createPiece(1,1,"fill: #DD0AB2",`${objCount}`),
            createPiece(0,0,"fill: #DD0AB2",`${objCount+1}`),
            createPiece(0,1,"fill: #DD0AB2",`${objCount+2}`),
            createPiece(0,2,"fill: #DD0AB2",`${objCount+3}`),
          ]
        }
        return tBlock;
      
      case 4:
        const iBlock: Block = {
          pieces: [
            createPiece(0,2, "fill: #00ffff",`${objCount}`),
            createPiece(0,0, "fill: #00ffff",`${objCount+1}`),
            createPiece(0,1, "fill: #00ffff",`${objCount+2}`),
            createPiece(0,3, "fill: #00ffff",`${objCount+3}`),
          ]
        }
        return iBlock;
      
      case 5:
        const sBlock: Block = {
          pieces: [
            createPiece(1,1, "fill: #00ff00",`${objCount}`),
            createPiece(0,1, "fill: #00ff00",`${objCount+1}`),
            createPiece(1,0, "fill: #00ff00",`${objCount+2}`),
            createPiece(2,0, "fill: #00ff00",`${objCount+3}`),
          ]
        }
        return sBlock;
      
      case 6:
        const reverseSBlock: Block = {
          pieces: [
            createPiece(1,1, "fill: #ff0000",`${objCount}`),
            createPiece(0,0, "fill: #ff0000",`${objCount+1}`),
            createPiece(1,0, "fill: #ff0000",`${objCount+2}`),
            createPiece(2,1, "fill: #ff0000",`${objCount+3}`),
          ]
        }
        return reverseSBlock;
    }
    const tBlock: Block = {
      pieces: [
        createPiece(1,1,"fill: #DD0AB2",`${objCount}`),
        createPiece(0,0,"fill: #DD0AB2",`${objCount+1}`),
        createPiece(0,1,"fill: #DD0AB2",`${objCount+2}`),
        createPiece(0,2,"fill: #DD0AB2",`${objCount+3}`),
      ]
    }

    return tBlock;
    
    
  }
  /**
   * Function is to check if the game is ended
   * @param s State parameter
   * @returns new State depending on if the player has a game over state
   */
export function checkGameEnd(s:State):State {
  // if there is a piece at <0 y value gameEnd is true
  const dead = s.cubes.some( (p) => Number(p.y) <= 0)
  console.log(dead)
  if(dead){
    // recolour all blocks to grey
    const recolour = s.cubes.map( (p) => {
      return {...p,style: "fill: #7f7f7f"};
    })
    return {...s,
    gameEnd: dead,
    cubes: recolour,}
    }
  return {...s,gameEnd: dead}
}