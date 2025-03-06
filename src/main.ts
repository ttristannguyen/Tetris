/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";
import { Constants, Viewport,Block } from "./constants.ts";
import { initialState,checkCollision,getMovedBlock,lineClearing, createRngStreamFromSource,newRandomBlock, checkGameEnd} from "./state.ts";
import type {Piece,State,} from "./state.ts"
import { fromEvent, interval, merge } from "rxjs";
import { map, filter, scan, reduce } from "rxjs/operators";
import { RNG,attr } from "./utils.ts";
import { Move,Rotate,Drop, Action, Tick, RNGGen,Reset} from "./action.ts";
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

// import type { Action } from "./action.ts";


/** User input */

type Key = "KeyS" | "KeyA" | "KeyD" | "KeyK" | "Space" | "KeyR" | "Period";

type Event = "keydown" | "keyup" | "keypress";

/**
 * Updates the state by proceeding with one time step.
 * updates the game by moving the block, checking collision , line clearing and game ending
 * Function is not being used
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State, action?:Action) => {s
  // const newState = getMovedBlock(s,action)
  // const ifCollidedState = checkCollision(newState)
  // const clearedLinesState = lineClearing(ifCollidedState)
  // const checkGameEnded = checkGameEnd(clearedLinesState)
  // return checkGameEnded;
};

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
  elem.setAttribute("visibility", "visible");
  elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
  elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main() {
  // Canvas elements
  const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
  const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
    HTMLElement;
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;
  const container = document.querySelector("#main") as HTMLElement;

  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

  // Text fields
  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

  /** User input */

  const key$ = fromEvent<KeyboardEvent>(document, "keypress");

  const fromKey = <T>(keyCode: Key, res: Action) =>
  key$.pipe(filter(({ code }) => code === keyCode),
  filter(({repeat}) => !repeat),
  map(() => res)
  )

  const left$ = fromKey("KeyA",new Move(-Block.WIDTH,0) ); // Move left
  const right$ = fromKey("KeyD", new Move(Block.WIDTH,0) ); // move right
  const down$ = fromKey("KeyS", new Move(0,Block.HEIGHT) ); // move down
  const rotate$ = fromKey("Period", new Rotate()  ); // rotate block
  const drop$ = fromKey("Space", new Drop() ); // dropping block
  const reset$ = fromKey("KeyR", new Reset() ); // dropping block

  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS).pipe(
    map((elapsed => new Tick(elapsed)))
  );



  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (s: State) => {
    // svg.innerHTML = "" // Clear the game
    preview.innerHTML = ""
    highScoreText.innerHTML == ""


      // Remove any blocks that were completed
      s.remove.map((p)=>{
        const view = document.getElementById(p.id)
        view ? svg.removeChild(view) : null
      })
      // Render all pieces in play, cubes on map and the preview piece
      s.pieceInPlay.pieces.map(updatePieceView(svg))
      s.cubes.map(updatePieceView(svg))
      s.previewPiece.pieces.map((p) => {
        const newP = {...p,y: `${Number(p.y) + 3*Block.HEIGHT}`}
        updatePieceView(preview)(newP)
      })


  // Update score and highscore
   scoreText.innerHTML = `${s.linesCleared}`
   highScoreText.innerHTML = `${s.highscore}`
  };
  // RNG Stream to generate random numbers
  const rng = createRngStreamFromSource(interval(250))
  const rngStream$ = rng(0).pipe(
    map( (val) => new RNGGen(val))
  )

  const source$ = merge(tick$,left$,right$,down$,rotate$,drop$,rngStream$,reset$).pipe(
    scan(reduceState,initialState))
    .subscribe((s: State) => {
      render(s);
      if (s.gameEnd) {
        show(gameover);
      } else {
        hide(gameover);
      }
    })
    /**
     * Function Sourced from Asterioids FRP Used to create/retrieve a SVG element
     * @param rootSVG SVG element to search for / add to
     * @returns No return appends a SVG element to the rootSVG
     */
  const updatePieceView = (rootSVG: HTMLElement) => (p: Piece) => {
    const createSvgElement = (
      namespace: string | null,
      name: string,
      props: Record<string, string> = {}
    ) => {
      const elem = document.createElementNS(namespace, name) as SVGElement;
      Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
      rootSVG.appendChild(elem)
      return elem;
    };
    // Check if the piece is created or to create a new one
    const v = document.getElementById(p.id) || createSvgElement(svg.namespaceURI,"rect",{
      x: `${p.x}`,
      y: `${p.y}`,
      height: `${p.height}`,
      width: `${p.width}`,
      style: p.style,
      id: p.id,
      })
      // update all the attributes in its SVG Element
      attr(v, {x: p.x, y: p.y,style: p.style});
  } 
}
/**
 * Used to execute any action that is generated by the user or by the game ticks
 * @param s State paramater
 * @param action any action described in action.ts
 * @returns new state created from the action
 */
function reduceState(s:State, action: Action):State { 
  return action.apply(s)}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

