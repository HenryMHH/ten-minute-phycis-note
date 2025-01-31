class Ball {
  constructor(radius, mass, pos, vel) {
    this.radius = radius;
    this.mass = mass;
    this.pos = pos.clone();
    this.vel = vel.clone();
  }

  simulate(dt, gravity) {
    this.vel.add(gravity, dt);
    this.pos.add(this.vel, dt);
  }
}

class Scene {
  balls = [];

  constructor(canvas, minScale) {
    this.canvas = canvas;
    this.minScale = minScale;
    this.init();
    this.setupBalls();
  }

  init() {
    this.c = this.canvas.getContext("2d");
    this.canvas.width = window.innerWidth - 20;
    this.canvas.height = window.innerHeight - 100;

    this.cScale =
      Math.min(this.canvas.width, this.canvas.height) / this.minScale;
    this.simWidth = this.canvas.width / this.cScale;
    this.simHeight = this.canvas.height / this.cScale;

    this.worldSize = new Vector2(this.simWidth, this.simHeight);
    this.gravity = new Vector2(0.0, 0.0);
    this.restitution = 1.0;
  }

  setupBalls() {
    const ballNum = 20;

    for (let i = 0; i < ballNum; i++) {
      const radius = 0.05 + Math.random() * 0.1;
      const mass = Math.PI * radius * radius;
      const pos = new Vector2(
        Math.random() * this.simWidth,
        Math.random() * this.simHeight,
      );

      const vel = new Vector2(
        -1.0 + 2 * Math.random(),
        -1.0 + 2.0 * Math.random(),
      );

      this.balls.push(new Ball(radius, mass, pos, vel));
    }
  }

  draw() {
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // ball color
    this.c.fillStyle = "#FF0000";

    this.balls.forEach((ball) => {
      this.c.beginPath();
      this.c.arc(
        this.cX(ball.pos.x),
        this.cY(ball.pos.y),
        this.cScale * ball.radius,
        0.0,
        2.0 * Math.PI,
      );

      this.c.closePath();
      this.c.fill();
    });
  }

  // Converts simulation space X-coordinate to canvas space
  cX(x) {
    return x * this.cScale;
  }

  cY(y) {
    return this.canvas.height - y * this.cScale;
  }
}

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(v) {
    this.x = v.x;
    this.y = v.y;
  }

  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * @param {{x: number, v: number}} v
   * @param {number} s - scaling number
   */
  add(v, s = 1.0) {
    this.x += v.x * s;
    this.y += v.y * s;

    return this;
  }

  addVectors(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;

    return this;
  }

  subtract(v, s = 1.0) {
    this.x -= v.x * s;
    this.y -= v.y * s;

    return this;
  }

  subtractVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;

    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  scale(s) {
    this.x *= s;
    this.y *= s;

    return this;
  }

  // Learn more about dot product and the verctor
  // Reference:
  // https://www.youtube.com/watch?v=9WqiMoqEyJ0
  //
  // A·B = |A| |B| cos(θ) = Ax*Bx + Ay*By
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
}

class Core {
  gravity = {
    x: 0.0,
    y: 0.0,
  };

  isRunning = true;
  timeStep = 1.0 / 60.0;

  constructor(scene, ball) {
    this.scene = scene;
    this.ball = ball;
  }

  simulate() {
    for (let i = 0; i < this.scene.balls.length; i++) {
      const ball1 = this.scene.balls[i];

      ball1.simulate(this.timeStep, this.gravity);

      for (let j = i + 1; j < this.scene.balls.length; j++) {
        const ball2 = this.scene.balls[j];

        this.handleBallsCollision(ball1, ball2, this.scene.restitution);
      }

      this.handleWallsCollision(ball1, this.scene.worldSize);
    }
  }

  handleBallsCollision(ball1, ball2, restitution) {
    // Calculate direction vector between the two balls
    const dir = new Vector2();
    dir.subtractVectors(ball2.pos, ball1.pos);

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

  handleWallsCollision(ball, worldSize) {
    // check if the ball hits the left-side wall.
    if (ball.pos.x < ball.radius) {
      ball.pos.x = ball.radius;
      ball.vel.x = -ball.vel.x;
    }
    if (ball.pos.x > worldSize.x - ball.radius) {
      ball.pos.x = worldSize.x - ball.radius;
      ball.vel.x = -ball.vel.x;
    }
    if (ball.pos.y < ball.radius) {
      ball.pos.y = ball.radius;
      ball.vel.y = -ball.vel.y;
    }

    if (ball.pos.y > worldSize.y - ball.radius) {
      ball.pos.y = worldSize.y - ball.radius;
      ball.vel.y = -ball.vel.y;
    }
  }

  update = () => {
    if (!this.isRunning) return;

    this.simulate();
    this.scene.draw();

    requestAnimationFrame(this.update);
  };

  // press space to puase the animation
  togglePause() {
    this.isRunning = !this.isRunning;

    if (this.isRunning) {
      this.update();
    }
  }
}

window.addEventListener("load", () => {
  const canvasEl = document.getElementById("frame");
  const scene = new Scene(canvasEl, 2);
  const core = new Core(scene);

  window.addEventListener("keydown", () => {
    core.togglePause();
  });

  core.update();
});
