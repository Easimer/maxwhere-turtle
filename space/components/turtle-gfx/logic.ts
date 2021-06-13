import { Vec3, Euler3Deg, Color, Quat } from './math';
import * as math from './math';

export interface Turtle {
  position: Vec3,
  rotation: Euler3Deg,
  penActive: boolean,
  penColor: Color,
  penWidth: number,
}

export interface Instruction {
  id: string,
  arg: string,
  children: Array<Instruction>,
  uid: number,
}

export interface VMState {
  stack: Array<Turtle>,
  turtle: Turtle,
}

export interface World {
  getInitialState: () => { position: Vec3, rotation: Euler3Deg } 
  resetWorld: () => void;
  drawLine: (startPosition: Vec3, rotation: Quat, length: number, width: number, color: Color) => void;
  updateTurtle: (newState: Turtle) => void;
}

type InstructionHandler = (world: World, state: VMState, instruction: Instruction) => void;

type DispatchTable = {
  [key: string]: InstructionHandler
};

export interface VM {
  executeProgram: (program: Instruction, world: World) => void;
}

export interface ISingleStepVM {
  step: (world: World) => [Turtle, Instruction | void];
}

function calculateLineRotation(oldPos: Vec3, newPos: Vec3): Quat {
  const vecSource = new Vec3(0, 0, 1);
  const vecTarget = newPos.subtract(oldPos).normalized();
  return math.quaternionFromVectorTo(vecSource, vecTarget);
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
      const rotation = calculateLineRotation(turtle.position, newPos);
      world.drawLine(turtle.position, rotation, distance, turtle.penWidth, turtle.penColor);
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
      const rotation = calculateLineRotation(turtle.position, newPos);
      world.drawLine(turtle.position, rotation, distance, turtle.penWidth, turtle.penColor);
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
    const turtleCopy: Turtle = {
      position: new Vec3(state.turtle.position.x, state.turtle.position.y, state.turtle.position.z),
      rotation: Object.assign({}, state.turtle.rotation),
      penActive: state.turtle.penActive,
      penColor: Object.assign({}, state.turtle.penColor),
      penWidth: state.turtle.penWidth,
    };
    state.stack.push(turtleCopy);
  },

  'STATE_POP' : (world, state) => {
    state.turtle = state.stack.pop();
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
  'PEN_WIDTH' : (_world, state, instruction) => {
    state.turtle.penWidth = parseFloat(instruction.arg);
  }
};

function decodeInstruction(world: World, state: VMState, instruction: Instruction) {
  const handler = vmDispatchTable[instruction.id];
  if(handler !== undefined) {
    handler(world, state, instruction);
  }
}

function* traverseProgramTree(instruction: Instruction): Generator<Instruction, null, unknown> {
  if (instruction.children.length !== 0) {
    switch(instruction.id) {
      case 'TOP': {
        for (const child of instruction.children) {
          yield * traverseProgramTree(child);
        }
        break;
      }
      case 'REPEAT': {
        const times = parseInt(instruction.arg);
        for (let i = 0; i < times; i++) {
          for (const child of instruction.children) {
            yield * traverseProgramTree(child);
          }
        }
        break;
      }
    }
  } else {
    yield instruction;
  }

  return null;
}

function executeProgram(program: Instruction, world: World) {
  const initState = world.getInitialState();
  const state: VMState = {
    stack: [],
    turtle: {
      position: initState.position,
      rotation: initState.rotation,
      penActive: true,
      penColor: { r: 1, g: 0, b: 0, a: 1 },
      penWidth: 1.0,
    }
  };
  world.resetWorld();
  // Start at TOP block
  decodeInstruction(world, state, program);
}

export class CSingleStepVM implements ISingleStepVM {
  constructor(world: World, program: Instruction) {
    const initState = world.getInitialState();
    this.state = {
      stack: [],
      turtle: {
        position: initState.position,
        rotation: initState.rotation,
        penActive: true,
        penColor: { r: 1, g: 0, b: 0, a: 1 },
        penWidth: 1.0,
      }
    };
    this.program = program;
    this.iterator = null;
    world.resetWorld();
  }

  step(world: World): [Turtle, Instruction | void] {
    if (this.iterator === null) {
      this.iterator = traverseProgramTree(this.program);
    }

    const currentInstruction = this.iterator.next().value;
    if(currentInstruction !== null) {
      decodeInstruction(world, this.state, currentInstruction as Instruction);
    }
    return [this.state.turtle, currentInstruction];
  }

  private state: VMState;
  private program: Instruction;
  private iterator: Generator<Instruction, void, unknown>;
}

export function createVM(): VM {
  return {
    executeProgram: executeProgram,
  };
}