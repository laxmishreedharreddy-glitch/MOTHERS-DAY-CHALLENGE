// script.js
document.addEventListener("DOMContentLoaded", () => {
  // GSAP Text Animations
  gsap.registerPlugin(ScrollTrigger);

  const floatingTexts = document.querySelectorAll(".float-text");

  floatingTexts.forEach(text => {
    // Yoyo sine-wave hover effect
    gsap.to(text, {
      y: -20,
      duration: 3,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });

    // Scroll entry animation
    gsap.from(text, {
      scrollTrigger: {
        trigger: text,
        start: "top 80%",
        toggleActions: "play none none reverse"
      },
      opacity: 0,
      y: 50,
      duration: 1.5,
      ease: "power2.out"
    });
  });

  // Hanging Gallery Logic
  const hangingItems = document.querySelectorAll('.hanging-item');
  hangingItems.forEach((item, index) => {
    // Initial natural sway
    gsap.to(item, {
      rotation: () => -4 + Math.random() * 8,
      duration: () => 3 + Math.random() * 2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: index * 0.5
    });

    // Interactive swing
    item.addEventListener('mousemove', (e) => {
      const rect = item.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const mouseX = e.clientX;
      
      // Calculate how far mouse is from center (-1 to 1)
      let offset = (mouseX - itemCenterX) / (rect.width / 2);
      // Limit to slightly larger bounds for smoothness
      offset = Math.max(-1.5, Math.min(1.5, offset)); 
      
      // Max rotation 20 degrees
      const targetRotation = offset * 20;

      gsap.to(item, { 
        rotation: targetRotation, 
        duration: 0.5, 
        ease: "power2.out",
        overwrite: "auto" 
      });
    });

    item.addEventListener('mouseleave', () => {
      // Swing back with elasticity, then resume sway
      gsap.to(item, { 
        rotation: () => -4 + Math.random() * 8, 
        duration: 2.5, 
        ease: "elastic.out(1, 0.3)",
        overwrite: "auto",
        onComplete: () => {
          gsap.to(item, {
            rotation: () => -4 + Math.random() * 8,
            duration: () => 3 + Math.random() * 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1
          });
        }
      });
    });
  });

  // Matter.js Setup for Memory Wall
  const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

  const engine = Engine.create();
  // Set gravity to 0 for antigravity effect
  engine.world.gravity.y = 0;
  engine.world.gravity.x = 0;

  const container = document.getElementById("physics-container");

  // Ensure container has dimensions
  let width = container.clientWidth;
  let height = container.clientHeight;

  // Render is required for MouseConstraint to map correctly to the DOM bounds
  const render = Render.create({
    element: container,
    engine: engine,
    options: {
      width,
      height,
      background: 'transparent',
      wireframes: false,
      showAngleIndicator: false
    }
  });
  // Hide the canvas since we use DOM elements
  render.canvas.style.display = 'none';

  // Wall Bodies
  const wallOptions = { isStatic: true, render: { visible: false } };
  const thickness = 60;
  let topWall = Bodies.rectangle(width / 2, -thickness / 2, width, thickness, wallOptions);
  let bottomWall = Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, wallOptions);
  let leftWall = Bodies.rectangle(-thickness / 2, height / 2, thickness, height, wallOptions);
  let rightWall = Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, wallOptions);

  Composite.add(engine.world, [topWall, bottomWall, leftWall, rightWall]);

  // DOM Bodies Mapping
  const domBodies = document.querySelectorAll('.dom-body');
  const physicsBodies = [];

  domBodies.forEach(elem => {
    const w = parseFloat(elem.getAttribute('data-width'));
    const h = parseFloat(elem.getAttribute('data-height'));
    // Start position based on container center if data-x/y are out of bounds on mobile
    let x = parseFloat(elem.getAttribute('data-x'));
    let y = parseFloat(elem.getAttribute('data-y'));

    // Scale down positions and sizes slightly for smaller screens
    if (width < 768) {
      x = x * 0.5 + width * 0.2;
      y = y * 0.5 + height * 0.2;
    }

    const isCircle = elem.getAttribute('data-radius');

    // Set DOM dimensions
    elem.style.width = w + 'px';
    elem.style.height = h + 'px';

    let body;
    const bodyOptions = {
      frictionAir: 0.02, // Very slight friction so they keep floating long
      restitution: 0.8, // Bouncy against walls
      density: 0.001
    };

    if (isCircle) {
      const r = parseFloat(isCircle);
      body = Bodies.circle(x, y, r, bodyOptions);
    } else {
      body = Bodies.rectangle(x, y, w, h, bodyOptions);
    }

    // Give them a tiny initial velocity so they drift slowly
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 4
    });

    // Random slight rotation
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);

    physicsBodies.push({ elem, body, w, h });
    Composite.add(engine.world, body);
  });

  // Mouse Constraint for interaction
  const mouse = Mouse.create(container);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false }
    }
  });
  Composite.add(engine.world, mouseConstraint);

  // Keep mouse in sync with render container
  render.mouse = mouse;

  // Run the engine
  Runner.run(Runner.create(), engine);
  Render.run(render);

  // Sync DOM elements to Physics bodies on every tick
  Matter.Events.on(engine, 'afterUpdate', () => {
    physicsBodies.forEach(pb => {
      // Matter.js position is the center of the body.
      // DOM positioning is top-left. So we offset by width/2 and height/2.
      const px = pb.body.position.x - pb.w / 2;
      const py = pb.body.position.y - pb.h / 2;
      const angle = pb.body.angle;

      pb.elem.style.transform = `translate(${px}px, ${py}px) rotate(${angle}rad)`;
    });
  });

  // Handle Resize
  window.addEventListener('resize', () => {
    width = container.clientWidth;
    height = container.clientHeight;
    render.canvas.width = width;
    render.canvas.height = height;

    // Reposition walls
    Matter.Body.setPosition(topWall, { x: width / 2, y: -thickness / 2 });
    Matter.Body.setPosition(bottomWall, { x: width / 2, y: height + thickness / 2 });
    Matter.Body.setPosition(leftWall, { x: -thickness / 2, y: height / 2 });
    Matter.Body.setPosition(rightWall, { x: width + thickness / 2, y: height / 2 });
  });

  // Falling Hearts & Flowers
  const fallingContainer = document.getElementById('falling-elements-container');
  if (fallingContainer) {
    const symbols = ['💖', '💕', '🌸', '🌺', '🌷', '💗'];

    function createFallingElement() {
      const el = document.createElement('div');
      el.classList.add('falling-element-item');
      el.innerText = symbols[Math.floor(Math.random() * symbols.length)];

      const xPos = Math.random() * 100;
      const duration = 5 + Math.random() * 10;
      const delay = Math.random() * 5;
      const size = 1 + Math.random() * 1.5;

      el.style.left = `${xPos}vw`;
      el.style.animationDuration = `${duration}s`;
      el.style.animationDelay = `${delay}s`;
      el.style.fontSize = `${size}rem`;

      fallingContainer.appendChild(el);

      setTimeout(() => {
        el.remove();
      }, (duration + delay) * 1000);
    }

    setInterval(createFallingElement, 400);
    for (let i = 0; i < 15; i++) {
      createFallingElement();
    }
  }

  // Signature Pad Logic
  const canvas = document.getElementById('signature-pad');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let hasSigned = false;
    const errorMsg = document.getElementById('signature-error');
    const canvasPlaceholder = document.querySelector('.canvas-placeholder');

    function getMousePos(canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      let clientX = evt.clientX;
      let clientY = evt.clientY;

      if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function startDrawing(e) {
      isDrawing = true;
      hasSigned = true;
      canvasPlaceholder.style.opacity = 0;
      const pos = getMousePos(canvas, e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (e.cancelable) e.preventDefault();
    }

    function draw(e) {
      if (!isDrawing) return;
      const pos = getMousePos(canvas, e);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#e8e4e4'; // white/light ink since bg is somewhat dark
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      if (e.cancelable) e.preventDefault();
    }

    function stopDrawing() {
      isDrawing = false;
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    // Clear signature
    document.getElementById('btn-clear').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSigned = false;
      canvasPlaceholder.style.opacity = 0.3;
      errorMsg.style.opacity = 0;
    });

    // Open Gift Logic & Letter Reveal
    const btnOpen = document.getElementById('btn-open');
    const letterSection = document.getElementById('letter-section');
    const bgAudio = document.getElementById('bg-audio');
    const fallingContainer = document.getElementById('falling-elements-container');

    function burstCherryBlossoms() {
      if (!fallingContainer) return;
      
      // Create a massive, fast shower of blossoms
      for (let i = 0; i < 100; i++) {
        const el = document.createElement('div');
        el.classList.add('falling-element-item');
        el.innerText = '🌸';

        const xPos = Math.random() * 100;
        const duration = 1.5 + Math.random() * 3; // Fall faster
        const delay = Math.random() * 0.5; // Almost immediate burst
        const size = 1.5 + Math.random() * 3; // Varying sizes

        el.style.left = `${xPos}vw`;
        el.style.animationDuration = `${duration}s`;
        el.style.animationDelay = `${delay}s`;
        el.style.fontSize = `${size}rem`;

        fallingContainer.appendChild(el);

        setTimeout(() => el.remove(), (duration + delay) * 1000);
      }
    }

    btnOpen.addEventListener('click', () => {
      if (!hasSigned) {
        errorMsg.style.opacity = 1;
        return;
      }

      errorMsg.style.opacity = 0;

      // Play pleasant background music
      if (bgAudio) {
        bgAudio.volume = 0.5;
        bgAudio.play().catch(e => console.log("Audio play failed:", e));
      }

      // Burst cherry blossoms
      burstCherryBlossoms();
      
      // Reveal Letter with a slight delay so blossoms burst first
      setTimeout(() => {
        if (letterSection) {
          letterSection.classList.add('active');
        }
      }, 800);
      
      // Change open button text to show it's opened
      btnOpen.innerText = 'Gift Opened';
      btnOpen.disabled = true;
      btnOpen.style.opacity = '0.7';
      btnOpen.style.cursor = 'default';
    });

    const btnCloseLetter = document.getElementById('btn-close-letter');
    if (btnCloseLetter) {
      btnCloseLetter.addEventListener('click', () => {
        if (letterSection) letterSection.classList.remove('active');
        if (bgAudio) bgAudio.pause();
      });
    }
  }

});