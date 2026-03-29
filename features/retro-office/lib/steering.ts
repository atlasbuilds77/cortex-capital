/**
 * Steering Behaviors for Agent Movement
 * 
 * Implements smoother, more realistic NPC movement with:
 * - Predictive collision avoidance (look ahead, not just react)
 * - Smooth velocity changes (no sudden direction flips)
 * - Separation force (agents maintain personal space)
 * - Wall avoidance (stay away from furniture/walls)
 */

export interface Vector2 {
  x: number;
  y: number;
}

export interface Agent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  maxSpeed: number;
  maxForce: number;
  radius: number;
}

// Normalize a vector
export function normalize(v: Vector2): Vector2 {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

// Scale a vector
export function scale(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s };
}

// Add vectors
export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

// Subtract vectors
export function sub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

// Limit vector magnitude
export function limit(v: Vector2, max: number): Vector2 {
  const len = Math.hypot(v.x, v.y);
  if (len > max) {
    return scale(normalize(v), max);
  }
  return v;
}

// Distance between two points
export function dist(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * SEEK - Move toward a target
 */
export function seek(agent: Agent, target: Vector2): Vector2 {
  const desired = sub(target, { x: agent.x, y: agent.y });
  const desiredNorm = normalize(desired);
  const desiredVel = scale(desiredNorm, agent.maxSpeed);
  
  // Steering = desired - current velocity
  const steer = sub(desiredVel, { x: agent.vx, y: agent.vy });
  return limit(steer, agent.maxForce);
}

/**
 * ARRIVE - Slow down as we approach target
 */
export function arrive(agent: Agent, target: Vector2, slowRadius = 50): Vector2 {
  const desired = sub(target, { x: agent.x, y: agent.y });
  const d = Math.hypot(desired.x, desired.y);
  
  let speed = agent.maxSpeed;
  if (d < slowRadius) {
    // Slow down proportionally
    speed = (d / slowRadius) * agent.maxSpeed;
  }
  
  const desiredVel = scale(normalize(desired), speed);
  const steer = sub(desiredVel, { x: agent.vx, y: agent.vy });
  return limit(steer, agent.maxForce);
}

/**
 * SEPARATION - Avoid crowding neighbors
 */
export function separation(
  agent: Agent, 
  neighbors: Array<{ x: number; y: number; radius: number }>,
  desiredSeparation = 40
): Vector2 {
  let steer = { x: 0, y: 0 };
  let count = 0;
  
  for (const other of neighbors) {
    const d = dist({ x: agent.x, y: agent.y }, { x: other.x, y: other.y });
    const minDist = agent.radius + other.radius + desiredSeparation;
    
    if (d > 0 && d < minDist) {
      // Vector pointing away from neighbor
      let diff = sub({ x: agent.x, y: agent.y }, { x: other.x, y: other.y });
      diff = normalize(diff);
      // Weight by distance (closer = stronger push)
      diff = scale(diff, 1 / Math.max(d, 0.1));
      steer = add(steer, diff);
      count++;
    }
  }
  
  if (count > 0) {
    steer = scale(steer, 1 / count);
    steer = normalize(steer);
    steer = scale(steer, agent.maxSpeed);
    steer = sub(steer, { x: agent.vx, y: agent.vy });
    return limit(steer, agent.maxForce);
  }
  
  return { x: 0, y: 0 };
}

/**
 * PREDICTIVE AVOIDANCE - Look ahead and avoid future collisions
 */
export function predictiveAvoidance(
  agent: Agent,
  neighbors: Array<{ x: number; y: number; vx: number; vy: number; radius: number }>,
  lookAheadTime = 1.5 // seconds to look ahead
): Vector2 {
  let steer = { x: 0, y: 0 };
  let closestTime = Infinity;
  let closestAgent: typeof neighbors[0] | null = null;
  
  for (const other of neighbors) {
    // Relative position and velocity
    const relPos = sub({ x: other.x, y: other.y }, { x: agent.x, y: agent.y });
    const relVel = sub({ x: other.vx, y: other.vy }, { x: agent.vx, y: agent.vy });
    
    // Time to closest approach
    const relSpeed = Math.hypot(relVel.x, relVel.y);
    if (relSpeed === 0) continue;
    
    // Project relative position onto relative velocity
    const timeToClosest = -(relPos.x * relVel.x + relPos.y * relVel.y) / (relSpeed * relSpeed);
    
    if (timeToClosest < 0 || timeToClosest > lookAheadTime) continue;
    
    // Distance at closest approach
    const closestDist = Math.hypot(
      relPos.x + relVel.x * timeToClosest,
      relPos.y + relVel.y * timeToClosest
    );
    
    const minSep = agent.radius + other.radius + 20;
    
    if (closestDist < minSep && timeToClosest < closestTime) {
      closestTime = timeToClosest;
      closestAgent = other;
    }
  }
  
  if (closestAgent) {
    // Steer away from predicted collision point
    const futurePos = {
      x: closestAgent.x + closestAgent.vx * closestTime,
      y: closestAgent.y + closestAgent.vy * closestTime,
    };
    const awayDir = normalize(sub({ x: agent.x, y: agent.y }, futurePos));
    
    // Urgency based on time to collision
    const urgency = 1 - (closestTime / lookAheadTime);
    steer = scale(awayDir, agent.maxSpeed * urgency * 2);
    steer = sub(steer, { x: agent.vx, y: agent.vy });
    return limit(steer, agent.maxForce * 2);
  }
  
  return { x: 0, y: 0 };
}

/**
 * WALL AVOIDANCE - Stay away from obstacles
 */
export function wallAvoidance(
  agent: Agent,
  walls: Array<{ x: number; y: number; width: number; height: number }>,
  avoidDistance = 30
): Vector2 {
  let steer = { x: 0, y: 0 };
  
  for (const wall of walls) {
    // Find closest point on wall rectangle to agent
    const closestX = Math.max(wall.x, Math.min(agent.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(agent.y, wall.y + wall.height));
    
    const d = dist({ x: agent.x, y: agent.y }, { x: closestX, y: closestY });
    
    if (d < avoidDistance && d > 0) {
      const away = normalize(sub({ x: agent.x, y: agent.y }, { x: closestX, y: closestY }));
      const strength = (avoidDistance - d) / avoidDistance;
      steer = add(steer, scale(away, strength * agent.maxSpeed));
    }
  }
  
  if (steer.x !== 0 || steer.y !== 0) {
    steer = sub(steer, { x: agent.vx, y: agent.vy });
    return limit(steer, agent.maxForce);
  }
  
  return { x: 0, y: 0 };
}

/**
 * COMBINED STEERING - Apply all behaviors with weights
 */
export function applySteering(
  agent: Agent,
  target: Vector2,
  neighbors: Array<{ x: number; y: number; vx: number; vy: number; radius: number }>,
  walls: Array<{ x: number; y: number; width: number; height: number }> = [],
  weights = {
    seek: 1.0,
    separation: 1.5,
    predictive: 2.0,
    walls: 1.2,
  }
): Vector2 {
  // Calculate all steering forces
  const seekForce = scale(arrive(agent, target, 30), weights.seek);
  const sepForce = scale(separation(agent, neighbors), weights.separation);
  const predForce = scale(predictiveAvoidance(agent, neighbors), weights.predictive);
  const wallForce = scale(wallAvoidance(agent, walls), weights.walls);
  
  // Sum all forces
  let totalForce = add(seekForce, sepForce);
  totalForce = add(totalForce, predForce);
  totalForce = add(totalForce, wallForce);
  
  // Limit total force
  return limit(totalForce, agent.maxForce);
}

/**
 * SMOOTH ROTATION - Gradually turn toward movement direction
 */
export function smoothRotation(
  currentAngle: number,
  targetAngle: number,
  turnSpeed = 0.15 // radians per frame
): number {
  // Normalize angles to -PI to PI
  let diff = targetAngle - currentAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  
  // Clamp turn amount
  const turn = Math.max(-turnSpeed, Math.min(turnSpeed, diff));
  return currentAngle + turn;
}
