import type {Piece} from "./state.ts"
import { Constants, Viewport,Block } from "./constants.ts";
import { State, checkCollision, checkGameEnd, lineClearing } from "./state.ts";
import { RNG } from "./utils.ts";
import { newRandomBlock } from "./state.ts";
export {Move,Rotate}
export type {Action}
/**
 * interface for all observables to implement a class for
 **/ 
interface Action {
  /**
   * Used to execute a function of the game implemented by each special action
   * @param s State of the game 
   */
    apply(s:State): State;
  }
  /**
   * Move class is used when the user chooses to go left right or down moving the current piece in play
   */
class Move implements Action {
  /**
   * 
   * @param clientX value for each piece to move in the x direction for
   * @param clientY value for each piece to move in the y direction for
   */
  constructor(public readonly clientX: number, public readonly clientY: number) {}
  apply(s:State): State {
    // Creates new piecesInPlay moving each piece by clientX and clientY
    const newPiecesInPlay =s.pieceInPlay.pieces.map( (piece) => {
      return {...piece, x: String(Number(piece.x) + this.clientX), y: String(Number(piece.y) + this.clientY)}
    })
    // check if new movement hits the wall or another piece
    const collidedWall = newPiecesInPlay.some( (piece) => Number(piece.x) < 0 || Number(piece.x) + Block.WIDTH> Viewport.CANVAS_WIDTH)
    const colliedHorizontal = newPiecesInPlay.some( (piece) => {
      return s.cubes.some( (cubesPiece) => Number(piece.x) == Number(cubesPiece.x) && Number(piece.y) == Number(cubesPiece.y))
    })
    // if piece hits wall or another piece, do not change the piece in play to the new moved piece
    if (colliedHorizontal || collidedWall) {
      return s;
    }
    else {
      // if the moved piece has not collided with anything set it as the new piece in play
      return {
        ...s,
        pieceInPlay: {pieces: newPiecesInPlay},
      }
    }
  }
  
}
/**
 * Rotate class when the user hits "K" to rotate the block anticlockwise
 */
class Rotate implements Action {
  constructor(){}

  apply(s:State):State{
    // Pivot block as first block
    const pivotBlock = s.pieceInPlay.pieces[0]
    // for each piece in piece in play rotate it around the pivot block
    const rotatedPieces = s.pieceInPlay.pieces.map( (p) => {

      // Relative meaning relative to the pivot
      const relativeX = Number(p.x) - Number(pivotBlock.x)
      const relativeY = Number(p.y) - Number(pivotBlock.y)
      // console.log(relativeX)
      // console.log(relativeY)

      // new position of block relative to pivot
      const rotatedRelativeX = relativeY * -1
      const rotatedRelativeY = relativeX
      // create new x and y based of the pivot and above x ,y values
      const newX = Number(pivotBlock.x) + rotatedRelativeX
      const newY = Number(pivotBlock.y) + rotatedRelativeY
      // return new rotated piece
      return {...p,x:`${newX}`,y:`${newY}`}
    })
    // update the state with new piece
    return {
      ...s,
      pieceInPlay: {pieces: rotatedPieces},
    }
  }
}
/**
 * Drop class implemented with the spacebar as the key. Drops piece in play to the highest piece in 
 * the blocks colummn or the floor if there is no other block
 */
export class Drop implements Action{
  constructor(){}
  apply(s:State):State {
    
    const lowestPieceInPlay = s.pieceInPlay.pieces.reduce( (acc,piece) => Number(piece.y) > Number(acc.y) ? piece : acc, s.pieceInPlay.pieces[0])
    // Filter for pieces that are in the same column and have a y value greater than our piece in play
    const cubesinColumn = s.cubes.filter( (piece) => { 
      return s.pieceInPlay.pieces.some( (p) => p.x === piece.x && Number(piece.y) > Number(p.y))
    })
    // const cubesBelowPiece = cubesinColumn.filter( (piece) => {
    //   return Number(piece.y) > Number(lowestPieceInPlay.y)
    // })

    // if there is no piece found send the block to floor
    if (cubesinColumn.length === 0){
      console.log("No Cube found")
      // diff between block and floor
      const lowHighDiff =Viewport.CANVAS_HEIGHT - Number(lowestPieceInPlay.y) - Block.HEIGHT 
      // update state to have new moved block to floor
      return {...s,
      pieceInPlay: {pieces:s.pieceInPlay.pieces.map((p) => ({...p,y: `${Number(p.y) + lowHighDiff - Block.HEIGHT}`}) ) 
      }}

    } else{ // pieces found 
      console.log("Cube found")
      // find the highest piece in the column
      const highestPieceInColumn = cubesinColumn.reduce((acc,piece) => Number(piece.y) < Number(acc.y) ? piece : acc, cubesinColumn[0])
      // get the difference between highest piece y and our piece in play's lowest y value
      const lowHighDiff = Number(highestPieceInColumn.y) - Number(lowestPieceInPlay.y) - Block.HEIGHT
      // move each piece in play by the difference
      const pInPlay = s.pieceInPlay.pieces.map((p) => {
        return {...p,y: `${Number(p.y) + lowHighDiff}`}
      })
    
      return {
        ...s,
        pieceInPlay: {pieces:pInPlay},
      }
    }
  }
}
/**
 * Tick class implemented for a game tick , incorporates moving block down, collisions, completing rows, and checking game is over
 */
export class Tick implements Action{
  constructor(public readonly elapsed: number){}
  apply(s:State):State{
    const updatedState = new Move(0,Block.HEIGHT).apply(s) // Move block down
    const ifCollidedState = checkCollision(updatedState) // check for collisions
    const clearedLinesState = lineClearing(ifCollidedState) // clear any completed rows
    const checkGameEnded = checkGameEnd(clearedLinesState) // check if game is over
    return checkGameEnded;
  }
}
/**
 * RNG for creating a random block
 */
export class RNGGen implements Action{
  constructor(public readonly elapsed: number){}
    apply(s:State):State{
      /**
       * Updates state with a new number between [0,6]
       */
      return {...s,blockGenerator: RNG.scale(RNG.hash(this.elapsed * 1103515245 + 21 ))
    }
  }
}
/**
 * Implemented when "R" is hit to reset the game to original state, still including the high score
 */
export class Reset implements Action{
  constructor(){}
  apply(s:State):State{
    const svg = document.querySelector("#svgCanvas");
    s.cubes.map((p) =>{
      const view = document.getElementById(p.id)
      view ? svg?.removeChild(view) : null
    })
    return {gameEnd: false,cubes: [],objCount: s.objCount+4,pieceInPlay: newRandomBlock(Math.floor(s.blockGenerator),s.objCount), previewPiece: s.previewPiece,blockGenerator: s.blockGenerator, linesCleared: 0,highscore: s.highscore, remove: []  }
  }
}