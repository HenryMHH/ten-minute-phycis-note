class Ball {
  /**
   * @param {Object} options
   * @param {Vector} options.pos
   * @param {Vector} options.vel
   * @param {number} options.radius
   * @param {string} options.color
   * @param {Vector} options.gravity
   */
  constructor({ pos, vel, radius, color, gravity }) {
    this.pos = pos;
    this.vel = vel;
    this.radius = radius;
    this.color = color || 'red';
    this.mass = Math.PI * this.radius * this.radius;
    this.gravity = gravity || new Vector(0, -9.81);
  }

  /**
   * Symplectic Euler method
   * @param {number} dt
   */
  update(dt) {
    this.vel.add(this.gravity, dt);
    this.pos.add(this.vel, dt);
  }

  updateGravity(gravity) {
    this.gravity.add(gravity, 1);
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(v, s = 1) {
    this.x += v.x * s;
    this.y += v.y * s;

    return this;
  }

  subtract(v1, v2) {
    this.x = v1.x - v2.x;
    this.y = v1.y - v2.y;

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

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
}

class Renderer {
  /**
   * @type {Ball[]}
   */
  balls = [];
  scale = 20;

  constructor(canvas) {
    this.canvas = canvas;
  }

  setCanvasSize() {
    this.canvas.width = window.innerWidth - 20;
    this.canvas.height = window.innerHeight - 100;
  }

  /**
   * @param {Ball} ball
   */
  addBall(ball) {
    this.balls.push(ball);
  }

  clearScene() {
    this.canvas
      .getContext('2d')
      .clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBall(ball) {
    const ctx = this.canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(
      this.cX(ball.pos.x),
      this.cY(ball.pos.y),
      ball.radius * this.scale,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = ball.color;

    ctx.closePath();
    ctx.fill();
  }

  handleWallCollision(ball) {
    if (ball.pos.y + ball.radius > this.canvas.height / this.scale) {
      ball.pos.y = this.canvas.height / this.scale - ball.radius;
      ball.vel.y = -ball.vel.y * 0.9;
    }

    if (ball.pos.y - ball.radius < 0) {
      ball.pos.y = ball.radius;
      ball.vel.y = -ball.vel.y * 0.9;
    }

    if (ball.pos.x + ball.radius > this.canvas.width / this.scale) {
      ball.pos.x = this.canvas.width / this.scale - ball.radius;
      ball.vel.x = -ball.vel.x * 0.9;
    }

    if (ball.pos.x - ball.radius < 0) {
      ball.pos.x = ball.radius;
      ball.vel.x = -ball.vel.x * 0.9;
    }
  }

  handleBallsCollision(ball1, ball2, restitution) {
    // Calculate direction vector between the two balls
    const dir = new Vector();
    dir.subtract(ball2.pos, ball1.pos);

    // Calculate the distance between ball centers
    const d = dir.length();

    // If distance is 0 or greater than the sum of radii, no collision
    if (d === 0 || d > ball1.radius + ball2.radius) return;

    // Normalize the direction vector (make it unit length)
    dir.scale(1.0 / d);

    // Calculate the overlap distance that needs to be corrected
    // (sum of radii minus actual distance, divided by 2 for each ball)
    // 對分交疊的距離
    const corr = (ball1.radius + ball2.radius - d) / 2;

    // Move balls apart to resolve overlap
    // ball1 moves in opposite direction (-corr)
    // ball2 moves in same direction (+corr)
    // 根據方向分配距離向量
    ball1.pos.add(dir, -corr);
    ball2.pos.add(dir, corr);

    // Calculate velocities along the collision direction
    // 速度分量
    const v1 = ball1.vel.dot(dir);
    const v2 = ball2.vel.dot(dir);

    // Get masses for momentum calculations
    const m1 = ball1.mass;
    const m2 = ball2.mass;

    // Calculate new velocities using conservation of momentum
    // and coefficient of restitution (energy loss in collision)
    const newV1 =
      (m1 * v1 + m2 * v2 - m2 * (v1 - v2) * restitution) / (m1 + m2);
    const newV2 =
      (m1 * v1 + m2 * v2 - m1 * (v2 - v1) * restitution) / (m1 + m2);

    // Update ball velocities with new values
    ball1.vel.add(dir, newV1 - v1);
    ball2.vel.add(dir, newV2 - v2);
  }

  update = () => {
    this.clearScene();

    for (let i = 0; i < this.balls.length; i++) {
      const ball1 = this.balls[i];
      ball1.update(1 / 60);

      for (let j = i + 1; j < this.balls.length; j++) {
        const ball2 = this.balls[j];
        this.handleBallsCollision(ball1, ball2, 0.9);
      }

      this.handleWallCollision(ball1);

      this.drawBall(ball1);
    }

    requestAnimationFrame(this.update);
  };

  cX(x) {
    return x * this.scale;
  }

  cY(y) {
    return this.canvas.height - y * this.scale;
  }

  kickBall(ball, dir) {
    ball.updateGravity(new Vector(0, -9.81));
    ball.vel.add(dir, 20);
  }
}

class Arrow {}

function addBall(renderer) {
  const pos = new Vector(1, 1);
  const vel = new Vector(0, 0);
  const radius = 0.5;
  const color = 'red';
  const ball = new Ball({ pos, vel, radius, color, gravity: new Vector(0, 0) });
  renderer.addBall(ball);
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('frame');
  const renderer = new Renderer(canvas);

  renderer.setCanvasSize();

  addBall(renderer);

  canvas.addEventListener('click', (e) => {
    const x = e.clientX / renderer.scale;
    const y = (canvas.height - e.clientY) / renderer.scale;

    const pointerPos = new Vector(x, y);

    const length = pointerPos.length();
    const dir = pointerPos.scale(1 / length);

    renderer.kickBall(renderer.balls[0], dir);
  });

  // canvas.addEventListener('click', (e) => {
  //   const x = e.clientX / renderer.scale;
  //   const y = (canvas.height - e.clientY) / renderer.scale;
  //   const radius = 10 / renderer.scale;
  //   const pos = new Vector(x, y);
  //   const vel = new Vector(0, 0);
  //   const ball = new Ball({ pos, vel, radius, color: 'red' });
  //   renderer.addBall(ball);
  // });

  // canvas.addEventListener('mousemove', (e) => {
  //   const vec = new Vector();

  //   vec.subtract(
  //     new Vector(e.clientX, canvas.height - e.clientY),
  //     renderer.center,
  //   );
  //   const arrow = new Arrow({ vec });
  //   renderer.addArrow(arrow);
  // });

  renderer.update();
});
