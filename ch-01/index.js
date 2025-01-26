class Ball {
  /**
   * Creates a ball
   * @param {number} radius - Ball radius
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} vx - X velocity
   * @param {number} vy - Y velocity
   */
  constructor(radius, x, y, vx, vy) {
    this.radius = radius;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  move(timeStep) {
    this.x += this.vx * timeStep;
    this.y += this.vy * timeStep;
  }

  applyGravity(gx, gy, timeStep) {
    this.vx += gx * timeStep;
    this.vy += gy * timeStep;
  }
}

class Scene {
  constructor(canvas, minScale, ball) {
    this.canvas = canvas;
    this.minScale = minScale;
    this.ball = ball;
    this.init();
  }

  init() {
    this.c = this.canvas.getContext("2d");
    this.canvas.width = window.innerWidth - 20;
    this.canvas.height = window.innerHeight - 100;

    this.cScale =
      Math.min(this.canvas.width, this.canvas.height) / this.minScale;
    this.simWidth = this.canvas.width / this.cScale;
    this.simHeight = this.canvas.height / this.cScale;
  }

  draw() {
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // ball color
    this.c.fillStyle = "#FF0000";

    this.c.beginPath();
    this.c.arc(
      this.cX(this.ball.x),
      this.cY(this.ball.y),
      this.cScale * this.ball.radius,
      0.0,
      2.0 * Math.PI,
    );

    this.c.closePath();
    this.c.fill();
  }

  // Converts simulation space X-coordinate to canvas space
  cX(x) {
    return x * this.cScale;
  }

  cY(y) {
    return this.canvas.height - y * this.cScale;
  }
}

class Core {
  gravity = {
    x: 0.0,
    y: -10.0,
  };

  isRunning = true;
  timeStep = 1.0 / 60.0;

  constructor(scene, ball) {
    this.scene = scene;
    this.ball = ball;
  }

  simulate() {
    // symplectic euler method
    // update the velocity than update the position
    this.ball.applyGravity(this.gravity.x, this.gravity.y, this.timeStep);
    this.ball.move(this.timeStep);
    this.handleCollision();
  }

  /**
   * Handles collision detection and response with boudaries
   * The ball's bounce height gradually decreases due to our simplified collision model:
   * We simply reverse the velocity at the boundary, which doesn't perfectly conserve energy,
   */
  handleCollision() {
    // check if the ball hits the left-side wall.
    if (this.ball.x < 0.0) {
      this.ball.x = 0.0;
      this.ball.vx = -this.ball.vx;
    }

    // check if the ball hits the right-side wall
    if (this.ball.x > this.scene.simWidth) {
      this.ball.x = this.scene.simWidth;
      this.ball.vx = -this.ball.vx;
    }

    // check if the ball hits the ground
    if (this.ball.y < 0.0) {
      this.ball.y = 0.0;
      this.ball.vy = -this.ball.vy;
    }

    // Ceiling collision check omitted since the ball's maximum height
    // (determined by initial velocity and gravity) never reaches the upper boundary
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
  const ball = new Ball(0.2, 0.2, 0.2, 10, 15);
  const canvasEl = document.getElementById("frame");
  const scene = new Scene(canvasEl, 20, ball);

  const core = new Core(scene, ball);

  window.addEventListener("keydown", () => {
    core.togglePause();
  });

  core.update();
});
