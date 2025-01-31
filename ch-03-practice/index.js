// 基礎數學運算相關的類別
class Vector {
  constructor(x = 0.0, y = 0.0) {
    this.x = x;
    this.y = y;
  }

  set(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  clone() {
    return new Vector(this.x, this.y);
  }

  add(v, s = 1) {
    this.x += v.x * s;
    this.y += v.y * s;
    return this;
  }

  subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.scale(1 / len);
    }
    return this;
  }

  static subtract(a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
  }
}

// 物理實體的基礎類別
class PhysicsObject {
  constructor(mass, pos, vel) {
    this.mass = mass;
    this.pos = pos.clone();
    this.vel = vel.clone();
  }

  simulate(dt) {
    this.pos.add(this.vel, dt);
  }

  applyForce(force, dt) {
    this.vel.add(force, dt / this.mass);
  }
}

// 球的類別，繼承自 PhysicsObject
class Ball extends PhysicsObject {
  constructor(radius, mass, pos, vel) {
    super(mass, pos, vel);
    this.radius = radius;
  }
}

// 球桿類別，處理球桿相關的邏輯
class Cue {
  constructor() {
    this.power = 0;
    this.direction = new Vector();
    this.angle = undefined;
    this.isCharging = false;
    this.startChargeTime = 0;
    this.shift = 0;
  }

  startCharge() {
    this.isCharging = true;
    this.startChargeTime = Date.now();
  }

  updateCharge() {
    if (!this.isCharging) return;

    const MIN_POWER = 10;
    const MAX_POWER = 100;
    const CHARGE_TIME = 2000;
    const MIN_SHIFT = 0;
    const MAX_SHIFT = 30;

    const elapsedTime = Date.now() - this.startChargeTime;
    const normalizedTime = Math.min(elapsedTime / CHARGE_TIME, 1);

    this.power = this.getCurveValue(MAX_POWER, MIN_POWER, normalizedTime);
    this.shift = this.getCurveValue(MAX_SHIFT, MIN_SHIFT, normalizedTime);
  }

  release(ball) {
    if (!this.isCharging) return;

    const stickMass = Math.PI * 0.5 * 0.5 * 2;
    const stickVel = this.power / 2;
    const ballVelAfter = (stickMass * stickVel) / ball.mass;

    ball.vel.add(this.direction, -ballVelAfter);

    this.reset();
  }

  reset() {
    this.isCharging = false;
    this.startChargeTime = 0;
    this.power = 0;
    this.angle = undefined;
  }

  updateDirection(ballPos, mousePos) {
    this.direction = Vector.subtract(mousePos, ballPos).normalize();
    this.angle = this.calculateAngle(this.direction);
  }

  calculateAngle(vector) {
    let degrees = Math.atan2(vector.y, vector.x) * (180 / Math.PI);
    return (degrees + 360) % 360;
  }

  getCurveValue(maxValue, minValue, x) {
    const K = 3;
    return maxValue - (maxValue - minValue) * Math.exp(-K * x);
  }
}

// 遊戲世界類別，處理物理世界的邏輯
class World {
  constructor(width, height) {
    this.size = new Vector(width, height);
    this.gravity = new Vector(0.0, 0.0);
    this.restitution = 1.0;
  }

  handleWallCollision(ball) {
    if (ball.pos.x > this.size.x) {
      ball.pos.x = this.size.x;
      ball.vel.x = -ball.vel.x;
    }
    if (ball.pos.x < 0) {
      ball.pos.x = 0;
      ball.vel.x = -ball.vel.x;
    }
    if (ball.pos.y < 0) {
      ball.pos.y = 0;
      ball.vel.y = -ball.vel.y;
    }
    if (ball.pos.y > this.size.y) {
      ball.pos.y = this.size.y;
      ball.vel.y = -ball.vel.y;
    }
  }
}

// 渲染器類別，處理所有繪圖相關的邏輯
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.simScaleLength = 20.0;
    this.updateScale();
  }

  updateScale() {
    this.canvas.width = window.innerWidth - 20;
    this.canvas.height = window.innerHeight - 100;

    this.scale =
      Math.min(this.canvas.width, this.canvas.height) / this.simScaleLength;
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBall(ball) {
    this.context.fillStyle = "#FF0000";
    this.context.beginPath();
    this.context.arc(
      this.toCanvasX(ball.pos.x),
      this.toCanvasY(ball.pos.y),
      this.scale * ball.radius,
      0.0,
      2.0 * Math.PI,
    );
    this.context.closePath();
    this.context.fill();
  }

  drawCue(ball, cue) {
    if (cue.angle === undefined) return;

    this.context.save();
    this.context.translate(
      this.toCanvasX(ball.pos.x),
      this.toCanvasY(ball.pos.y),
    );
    this.context.rotate((-cue.angle * Math.PI) / 180);

    this.context.fillStyle = "#0000FF";
    this.context.beginPath();
    const stickOffset = ball.radius * this.scale + cue.shift;
    this.context.rect(stickOffset, -5, 50, 10);
    this.context.closePath();
    this.context.fill();

    this.context.restore();
  }

  toCanvasX(x) {
    return x * this.scale;
  }

  toCanvasY(y) {
    return this.canvas.height - y * this.scale;
  }

  toWorldX(canvasX) {
    return canvasX / this.scale;
  }

  toWorldY(canvasY) {
    return (this.canvas.height - canvasY) / this.scale;
  }
}

// 遊戲類別，作為整個遊戲的進入點
class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.world = new World(
      this.renderer.canvas.width / this.renderer.scale,
      this.renderer.canvas.height / this.renderer.scale,
    );

    this.initBall();
    this.cue = new Cue();

    this.bindEvents();
    this.update();
  }

  initBall() {
    const radius = 0.5;
    const mass = Math.PI * radius * radius;
    const pos = new Vector(
      Math.random() * this.world.size.x,
      Math.random() * this.world.size.y,
    );
    const vel = new Vector();

    this.ball = new Ball(radius, mass, pos, vel);
  }

  bindEvents() {
    this.renderer.canvas.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  handleMouseMove = (e) => {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const mousePos = new Vector(
      this.renderer.toWorldX(e.x - rect.x),
      this.renderer.toWorldY(e.y - rect.y),
    );

    this.cue.updateDirection(this.ball.pos, mousePos);
  };

  handleKeyDown = (e) => {
    if (e.code === "Space" && !this.cue.isCharging) {
      this.cue.startCharge();
    }
  };

  handleKeyUp = (e) => {
    if (e.code === "Space") {
      this.cue.release(this.ball);
    }
  };

  update = () => {
    // 更新遊戲狀態
    this.ball.simulate(1 / 60);
    this.world.handleWallCollision(this.ball);
    this.cue.updateCharge();

    // 渲染
    this.renderer.clear();
    this.renderer.drawBall(this.ball);
    this.renderer.drawCue(this.ball, this.cue);

    requestAnimationFrame(this.update);
  };
}

// 遊戲初始化
window.addEventListener("load", () => {
  const canvas = document.getElementById("frame");
  new Game(canvas);
});
