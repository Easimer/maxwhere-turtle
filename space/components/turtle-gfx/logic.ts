import { Vec3, Euler3Deg, Color } from './math';
import * as math from './math';

export interface Turtle {
  position: Vec3,
  rotation: Euler3Deg,
  penActive: boolean,
  penColor: Color,
}

export interface Instruction {
  id: string,
  arg: string,
  children: Array<Instruction>,
}

export interface VMState {
  stack: Array<Turtle>,
  turtle: Turtle,
}

export interface World {
  resetWorld: () => void;
  drawLine: (startPosition: Vec3, rotation: Euler3Deg, length: number, color: Color) => void;
  updateTurtle: (newState: Turtle) => void;
}

type InstructionHandler = (world: World, state: VMState, instruction: Instruction) => void;

type DispatchTable = {
  [key: string]: InstructionHandler
};

export interface VM {
  executeProgram: (program: Instruction, world: World) => void;
}

const vmDispatchTable: DispatchTable = {
  'TOP' : (world, state, instruction) => {
    for(const child of instruction.children) {
      decodeInstruction(world, state, child);
    }
  },
  'MOVE_FORWARD' : (world, state, instruction) => {
    const turtle = state.turtle;

    const distance = parseInt(instruction.arg);
    const dir = math.getDirectionVector(math.degreesToRadians(turtle.rotation));
    const newPos = turtle.position.addScaled(distance, dir);
    if(turtle.penActive) {
      world.drawLine(turtle.position, turtle.rotation, distance, turtle.penColor);
    }
    turtle.position = newPos;
    world.updateTurtle(turtle);
  },

  'MOVE_BACKWARD' : (world, state, instruction) => {
    const turtle = state.turtle;

    const distance = parseInt(instruction.arg);
    let dir = math.getDirectionVector(math.degreesToRadians(turtle.rotation));
    const newPos = turtle.position.addScaled(-distance, dir);
    if(turtle.penActive) {
      world.drawLine(turtle.position, turtle.rotation, distance, turtle.penColor);
    }
    turtle.position = newPos;
    world.updateTurtle(turtle);
  },

  'ROTATE_YAW' : (world, state, instruction) => {
    const turtle = state.turtle;
    
    let degrees = parseInt(instruction.arg);
    turtle.rotation.yaw += degrees;
    world.updateTurtle(turtle);
  },

  'ROTATE_PITCH' : (world, state, instruction) => {
    const turtle = state.turtle;
    
    let degrees = parseInt(instruction.arg);
    turtle.rotation.pitch += degrees;
    world.updateTurtle(turtle);
  },

  'ROTATE_ROLL' : (world, state, instruction) => {
    const turtle = state.turtle;
    
    let degrees = parseInt(instruction.arg);
    turtle.rotation.roll += degrees;
    world.updateTurtle(turtle);
  },

  'REPEAT' : (world, state, instruction) => {
    const times = parseInt(instruction.arg);
    for(let i = 0; i < times; i++) {
      for(const child of instruction.children) {
        decodeInstruction(world, state, child);
      }
    }
  },

  'STATE_PUSH' : (_world, state) => {
    state.stack.push(Object.assign({}, state.turtle));
  },

  'STATE_POP' : (world, state) => {
    state.turtle = Object.assign({}, state.stack.pop());
    world.updateTurtle(state.turtle);
  },

  'PEN_DOWN' : (_world, state) => {
    state.turtle.penActive = true;
  },

  'PEN_UP' : (_world, state) => {
    state.turtle.penActive = false;
  },

  'PEN_COLOR' : (_world, state, instruction) => {
    state.turtle.penColor = math.decodeHexColor(instruction.arg);
  },
};

function decodeInstruction(world: World, state: VMState, instruction: Instruction) {
  vmDispatchTable[instruction.id](world, state, instruction);
}

function executeProgram(program: Instruction, world: World) {
  const state: VMState = {
    stack: [],
    turtle: {
      position: new math.Vec3(),
      rotation: { yaw: 0, pitch: 0, roll: 0 },
      penActive: true,
      penColor: { r: 1, g: 0, b: 0, a: 1 },
    }
  };
  world.resetWorld();
  // Start at TOP block
  decodeInstruction(world, state, program);
}

export function createVM(): VM {
  return {
    executeProgram: executeProgram,
  };
}