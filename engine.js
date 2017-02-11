// description: testing lab for bots and their AI
// author: me
// date: 10 Feb 2017

//for .keyCode or .which 1 is left mouse, 2 is middle, 3 is right
//for .button 0 is left, 1 is middle, 2 is right
//telemetryWindow should be a good fraction of racetrackWindow, for example 1/4
var definedKeys = {BACKSPACE: 8, TAB: 9, ENTER: 13, SHIFT: 16, CTRL: 17, ALT: 18, PAUSE: 19,
CAPSLOCK: 20, ESC: 27, SPACE: 32, PAGEUP: 33, PAGEDOWN: 34, END: 35, HOME: 36, LEFT: 37,
UP: 38, RIGHT: 39, DOWN: 40, INSERT: 45, DELETE: 46, F1: 112, F2: 113, F3: 114, F4: 115,
F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123, W: 87, A: 65,
S: 83, D: 68, NUMLOCK: 144, SCROLLLOCK: 145},
blockedKeys = [19, 32, 37, 38, 39, 40], //arrows, space, pause
specialKeysState = {SHIFT: false, CTRL: false, ALT: false}, //shift, ctrl, alt
mainRatio = 12,
screenMenus = ["START"];//, "RESTART", "SAVE", "LOAD", "OPTIONS", "EXIT", "GAMEPLAY", "GRAPHICS", "AUDIO"]; //main menu
var baseText = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/=%";
var baseTextLength = baseText.length;
var sortedMenus = screenMenus;
var baseLength = sortedMenus.reduce(function (a, b) { return a.length > b.length ? a : b; }).length;
delete sortedMenus;
var menusHeightAreas = {start: 0, resume: 0, save: 0, load: 0, options: 0, exit: 0, gameplay: 0, graphics: 0, audio: 0};
var fontSize = "1em"; //1em is 16px
var fontFamily = "Arial";
var menuFont = fontSize + " " + fontFamily;
var menuHeight = screenMenus.length * 16;
menusHeightAreas.start = fontSize[0] * 16; //fontSize[0] is first letter of a string, get area of 'Start' for the mouse keydown event
var menusTextHeight = fontSize[0] * 16;

function detectKeys(event) {
  var key = event.keyCode || event.which; //alternative to ternary - if there is no keyCode, use which
  if (blockedKeys.indexOf(key) !== undefined) { //prevents scrolling of browser's viewport with the keys, f5 not working (fixed at the end of the function)
    event.preventDefault(); event.stopPropagation();
    if (gameEngine.gameState === 1) { //Ctrl + A
      if (key == 65 && event.ctrlKey) {
        //;
      }
    }
    switch (key) { //19 - pause, 32 - space, 37 - left, 38 - up, 39 - right, 40 - down
      case 19:
        switch (gameEngine.gameState) {
          case 0: break;
          case 1: gameEngine.gameState = 2; break;
          case 2: gameEngine.gameState = 1; main(); break;
        }
        break;
      case 32: //currently we are using space for easier restart of our simulation
        switch (gameEngine.gameState) {
          case 0: 
            gameEngine.botIdCounter = 0; 
            gameEngine.bots = [];
            gameEngine.runningBots = 0;
            gameEngine.startTime = 0;
            spawnBots();
            gameEngine.gameState = 1;
            main();
            break;
          case 1:
            restartSim();
            break;
          case 2: 
            restartSim();
            break;
        }
        break;
    }
  }
  if (key === definedKeys.F5) { document.location.reload(true); } //fixes 'f5 not working' issue
}

function canvasInterface(canvasId) { 
  this.Canvas = document.getElementById(canvasId);
  this.Context = this.Canvas.getContext("2d");
  this.Canvas.imageSmoothingEnabled = false; //no smoothing pixels, moar performance
  this.CanvasWidth = this.Canvas.width; this.CanvasHeight = this.Canvas.height;
  //this.CanvasData = this.Context.getImageData(0, 0, this.CanvasWidth, this.CanvasHeight); //for future use, maybe for gifs?
  this.Rect = this.Canvas.getBoundingClientRect();
  this.BorderWidth = Math.abs((this.Canvas.offsetWidth - this.CanvasWidth) / 2); 
}

var racetrackWindow = new canvasInterface("racetrackWindow");
var simOptionsWindow = new canvasInterface("simOptionsWindow");
var telemetryWindow = new canvasInterface("telemetryWindow");
var baseTextWidth = (racetrackWindow.Context.measureText(baseText).width / baseTextLength);
var menuWidth = (2 * baseTextWidth) * baseLength;
//var menuWidth = racetrackWindow.CanvasWidth * 0.33, menuHeight = racetrackWindow.CanvasHeight * 0.33;
var halfWidth = racetrackWindow.Canvas.width / 2, halfHeight = racetrackWindow.Canvas.height / 2;

var gameInterface = {
  /*logLine: document.createElement("a"), */
  pageWidth: window.innerWidth, 
  pageHeight: window.innerHeight,
  ratio: racetrackWindow.CanvasWidth / telemetryWindow.CanvasWidth
};
var gameEngine = {
  viewPortMinX: 0, viewPortMinY: 0, viewPortMaxX: racetrackWindow.CanvasWidth, viewPortMaxY: racetrackWindow.CanvasHeight, 
  mouseX: 0, mouseY: 0, mouseTarget: "", 
  mKey: 0, 
  gameState: 0, /*0 - stopped, 1 - running, 2 - paused*/
  destinationReached: false,
  startTime: 0, playedTime: 0, tempPlayedTime: 0, currentTime: 0, lastTime: 0, dTime: 0, 
  distPerFrame: 0, 
  timeScale: 1, /*< 1 speeds up, > 1 slows down the game, must be fixed*/ 
  timeStep: 0.01667, /*0.09091 for sim layer -> two layers - sim and user*/ 
  b: 0, temp: 0, 
  dx: 0, dy: 0, 
  gravity: 9.80665, //in m/s
  frictionVector: 0.99, //maybe for ground vehicles
  bounceFactor: 0.05, //maybe for particles or projectiles
  distance: 0, x: 0, y: 0, 
  racetrackLength: 0, //in m
  tau: 6.283184, /*or (3.141592/180)*360 or 2*Pi from degrees to radians, cause arc() uses radians*/
  airDensity: 1.22, //in kg/cub.m
  counter: 0, 
  showFPS: true, currentFPS: 0, currentMS: 0, showTraj: false, showUnitStats: true, 
  botIdCounter: 0, bots: [], runningBots: 0, 
  targetSize: 10
};
var mapData = {sizeX: 512, sizeY: 512};
var targets = [ //for testing we are using a racetrack shaped like '8' symbol with 7 points
  {x: 256, y: 84, z: 128}, //1 start finish point
  {x: 338, y: 168, z: 256}, //2
  {x: 256, y: 256, z: 512}, //3 middle point
  {x: 168, y: 338, z: 256}, //4
  {x: 256, y: 428, z: 128}, //5
  {x: 338, y: 338, z: 256}, //6
  {x: 256, y: 256, z: 512}, //7 middle point
  {x: 168, y: 168, z: 256}, //8
  {x: 256, y: 84, z: 128} //9 start finish point
];
var targetCount = targets.length;

// this calculates length of the racetrack,later we'll use that for calculating the efficiency of our bots ...
// ... ie bot's travelled distance divided by racetrack's length will give us diff in percent (positive number means less efficient)
for (var a = 0; a < targetCount; a++) {
  if (a === 8) continue;
  var tmpdiffX = Math.abs(targets[a].x - targets[a+1].x);
  var tmpdiffY = Math.abs(targets[a].y - targets[a+1].y);
  var tmpdiffZ = Math.abs(targets[a].z - targets[a+1].z);
  var tmpLength = parseFloat(Math.hypot(tmpdiffX, tmpdiffY, tmpdiffZ).toFixed(3));
  gameEngine.racetrackLength += tmpLength;
}
console.log("Racetrack length was calculated - " + parseFloat(gameEngine.racetrackLength).toFixed(3) + " meters");

//Disabled for now
/*var mapTexture = new Image();
mapTexture.src = "maptexture_test1.png";*/

// this is the parent Bot object
var Bot = function (botColor, dragpoints, thrust, mass, height, wingspan, wingarea, wingtype, fuel, traj) {
  this.position = {x: 0, y: 0, z: 0}; //z is the ALTITUDE!!!
  this.destination = {x: 0, y: 0, z: 0}; //z is the ALTITUDE!!!
  this.distance = 0; //in m
  this.distanceTravelled = 0; //in m
  this.altitude = this.position.z; //in m
  this.pitch = 0; //angle of attack ? in degrees?
  this.roll = 0; //in degrees?
  this.yaw = 0; //in degrees?
  this.heading = 0; //in degrees, 0 - East
  this.dragCoeff = dragpoints * 0.0001;
  this.thrust = thrust; //in kgf
  this.fuel = fuel; //in liters
  this.mass = mass; //in kg
  this.loadedMass = this.fuel + this.mass; //in kg
  this.height = height; //in m
  this.acceleration = this.thrust / this.loadedMass; //acceleration in m/s
  this.speed = 0; //current speed in m/s
  this.wingSpan = wingspan; //in m
  this.wingArea = wingarea; //in sq.m
  this.wingLoading = this.loadedMass / this.wingArea; //in kg/sq.m
  this.wingType = wingtype; //1 - flat bottom, 2 - semi-symmetric, 3 - symmetric
  this.frontalArea = this.wingSpan * this.height; //in sq.m
  this.liftCoeff = 0;
  this.liftForce = this.loadedMass * this.acceleration; //in kN
  this.fuelConsumption = (this.thrust / 100) * 0.035; //in litres per second, thrust * fuel consumption per second, for jet engine ~150kN ~35g fuel per second per 1kN or 100kg thrust
  this.trajectoryLine = traj;
  this.rotationSpeedX = 0.1667; //one minute or 1/60 degree
  this.rotationSpeedY = 0.1667;
  this.rotationSpeedZ = 0.1667;
  this.CoM = 0; //center of mass
  this.CoT = 0; //center of thrust
  this.CoL = 0; //center of lift
  this.size = this.wingArea / 10; //size of the bot on the canvas
  /* ------------------------------------------------------------------------ */
  this.color = botColor;
  this.id = gameEngine.botIdCounter;
  this.target = 0;
  this.hasTarget = false;
  this.time = 0;
  this.startTime = 0;
  this.isTimed = false;
  this.state = true;
  this.distanceBeforeFirstTarget = 0;
  gameEngine.botIdCounter++;
  gameEngine.runningBots++;
  
  //set starting position to be equal for each bot
  this.startPosDiffX = Math.abs(targets[1].x - targets[0].x);
  this.startPosDiffY = Math.abs(targets[1].y - targets[0].y);
  this.startPosDiffZ = Math.abs(targets[1].z - targets[0].z);
  this.startPosDistance = (Math.hypot(this.startPosDiffX, this.startPosDiffY, this.startPosDiffZ));
  
  if (this.startPosDistance > 0) {
    this.startPosDiffX = this.startPosDiffX / this.startPosDistance;
    this.startPosDiffY = this.startPosDiffY / this.startPosDistance;
    this.startPosDiffZ = this.startPosDiffZ / this.startPosDistance;
  }
  this.startPosAngle = Math.atan2(this.startPosDiffY, this.startPosDiffX) * (180 / Math.PI); //Y must be the first parameter!!!
  this.heading = this.startPosAngle;
  this.position.x = targets[0].x + (gameEngine.targetSize) * Math.cos(this.startPosAngle / (180 * Math.PI));
  this.position.y = targets[0].y + (gameEngine.targetSize) * Math.sin(this.startPosAngle / (180 * Math.PI));
  this.position.z = targets[0].z + (gameEngine.targetSize) * Math.sin(this.startPosAngle / (180 * Math.PI));
  
  //find distance between bot and first target so we can substract it from bot's overall distance travelled
  this.distanceBeforeFirstTarget = Math.hypot(Math.abs(this.position.x - targets[0].x), Math.abs(this.position.y - targets[0].y), Math.abs(this.position.z - targets[0].z));
  //some var cleaning, idk if this is usefull
  delete this.startPosDiffX; delete this.startPosDiffY; delete this.startPosDiffZ; delete this.startPosDistance; delete this.startPosAngle;
  /* ------------------------------------------------------------------------ */

  this.updateBot = function() {
    if (this.state === true) { //checks if our bot is active
      //starts the stopwatch for our bot
      if (this.target === 1 && this.isTimed === false && this.startTime === 0) {
        this.startTime = performance.now().toFixed(3);
        this.isTimed = true;
      }
      
      //saves our bot's runtime
      if (this.isTimed === true && this.startTime !== 0) {
        this.time = performance.now().toFixed(3) - this.startTime;
      }
      
      //change characteristics based on used fuel
      if (this.fuel > 0) {
        this.fuel -= this.fuelConsumption * gameEngine.timeStep;
        this.loadedMass -= this.fuel * gameEngine.timeStep;
        this.acceleration = (this.thrust / this.loadedMass);
        this.wingLoading = (this.loadedMass / this.wingArea);
        this.liftForce = this.loadedMass * this.acceleration;
      } else {
        this.isTimed = false; //stops the stopwatch for our bot
        this.state = false; //sets state of our bot to inactive
        gameEngine.runningBots--; //removes our bot from the list with active bots
        return; //maybe it's better to early exit from the function, execution of the conditions below is useless
      }
    
      //set destination coords for our bot only once for each destination
      if (this.hasTarget === false && this.state === true) {
        this.hasTarget = true;
        this.destination.x = targets[this.target].x;
        this.destination.y = targets[this.target].y;
        this.destination.z = targets[this.target].z;
      }
      
      //calculate the difference between current position and destination for each axis
      if (this.state === true) {
        var diffX = this.destination.x - this.position.x;
        var diffY = this.destination.y - this.position.y;
        var diffZ = this.destination.z - this.position.z;
     
        //calculates distance between our bot and it's current destination
        //IMPORTANT - DO NOT REMOVE ~~ FROM HERE or bots stuck in checkpoints
        this.distance = ~~(Math.hypot(diffX, diffY, diffZ)); //perf tests show that using ~~ the code is 8% faster

        //this normalizes the vector, so our calculations for direction and speed in Cartesian system are not skewed
        if (this.distance > 0) {
          diffX = diffX / this.distance;
          diffY = diffY / this.distance;
          diffZ = diffZ / this.distance;
        }
        
        //checks if our bot is still away from the target, remove jitter with 1 instead of 0
        //this should be fixed, distance > 1 is way too much to have precision in going through the middle of checkpoints
        if (this.distance > 1) {
          //finds direction to the target in radians and convert it to degrees, y BEFORE x!!!
          var targetAngle = Math.atan2(diffY, diffX) * (180 / Math.PI);
          
          //controls direction and turning speed of our bot, turning speed 0.1667 is one minute or 1/60 degree
          if (this.heading > targetAngle) {
            this.heading -= (gameEngine.timeScale / 0.1667); //using timeScale here should be fixed, this always gives 0.1
          } else if (this.heading < targetAngle) {
            this.heading += (gameEngine.timeScale / 0.1667);
          }
          
          //moves our bot
          var vx = diffX * this.acceleration;
          var vy = diffY * this.acceleration;
          var vz = diffZ * this.acceleration;
          //IMPORTANT - adding and drag to equation makes bots when reaching the destination to jump from it
          var dragX = -0.5 * gameEngine.airDensity * Math.pow(vx, 2) * this.dragCoeff * this.frontalArea;
          var dragY = -0.5 * gameEngine.airDensity * Math.pow(vy, 2) * this.dragCoeff * this.frontalArea;
          var dragZ = -0.5 * gameEngine.airDensity * Math.pow(vz, 2) * this.dragCoeff * this.frontalArea;
          dragX = (isNaN(dragX) ? 0 : dragX);
          dragY = (isNaN(dragY) ? 0 : dragY);
          dragZ = (isNaN(dragZ) ? 0 : dragZ);
          this.position.x += vx + (vx / dragX); //minus aerodynamic drag (dragX)
          this.position.y += vy + (vy / dragY); //minus aerodynamic drag (dragY)
          this.position.z += vz + (vz / dragZ) - 0.5*gameEngine.gravity*gameEngine.timeStep*gameEngine.timeStep; //minus gravity (gameEngine.gravity)
          
          //calculates current speed and travelled distance of our bot
          var tmp = (Math.hypot(vx, vy, vz)); //IMPORTANT - DO NOT optimise with ~~ or speed and distance travelled will be wrong!!!
          this.distanceTravelled += tmp;
          this.speed = (tmp / gameEngine.timeStep); //V = S / t, in m/s
          this.altitude = this.position.z;
          //this console.log below is interesting
          //seems current speed of the bot (to be precise distance travelled) and its acceleration based on aero formula thrust / mass ...
          //... are not equal or almost equal, ie the speed is between 5 and 50% bigger than usual ...
          //... or maybe the gameEngine.dTime is not correct, dunno why
          //console.log("bot " + i + " - " + this.acceleration + " | vxvyvz - " + Math.hypot(vx, vy, vz));
        } else {
          if (this.target < targetCount - 1) { //checks if our bot has more targets
            this.hasTarget = false;
            this.target++;
          } else { //or if hasn't ...
            this.isTimed = false; //stops the stopwatch for our bot
            this.state = false; //sets state of our bot to inactive
            this.hasTarget = false;
            this.distanceTravelled -= this.distanceBeforeFirstTarget;
            gameEngine.runningBots--; //removes our bot from the list with active bots
          }
        }
      }
    }
  };
};

// this creates a couple of bots
function spawnBots() {
  //(botColor, dragpoints, thrust, mass, height, wingspan, wingarea, wingtype, fuel, traj)
  gameEngine.bots.push(new Bot("red", 100, 15000, 5000, 5, 15, 70, 1, 100, false));
  gameEngine.bots.push(new Bot("green", 100, 12000, 5000, 5, 15, 70, 1, 100, false));
}

// this restarts our simulation
function restartSim() {
  gameEngine.gameState = 0;
  gameEngine.botIdCounter = 0; 
  gameEngine.bots = [];
  gameEngine.runningBots = 0;
  gameEngine.startTime = 0;
  spawnBots();
  gameEngine.gameState = 1;
}

//sounds section
/*var sounds = {
  soldier:    {shootSnd: {this: new Audio(), src: "soldshot.ogg", play: function(){this.play()}}}, 
  tank:       {shootSnd: {this: new Audio(), src: "tankshot.ogg", play: function(){this.play()}}}, 
  commander:  {shootSnd: {this: new Audio(), src: "commshot.ogg", play: function(){this.play()}}}
};*/

if (typeof pageWidth != "number") { //some browser-compatibility-check shit, idk what these lines do
  if (document.compatMode == "CSS1Compat") {
    pageWidth = document.documentElement.clientWidth;
    pageHeight = document.documentElement.clientHeight;
  } else {
    pageWidth = document.body.clientWidth;
    pageHeight = document.body.clientHeight;
  }
}

// this detects mouse clicks
function mouseEvents(event) {
  if (event.target === racetrackWindow.Canvas) {
    event.preventDefault(); event.stopPropagation();
    /*gameEngine.mouseX = Math.abs(event.clientX - racetrackWindow.Rect.left - racetrackWindow.BorderWidth);
    gameEngine.mouseY = Math.abs(event.clientY - racetrackWindow.Rect.top - racetrackWindow.BorderWidth);
    gameEngine.mouseTarget = racetrackWindow.Canvas;*/
  }
  
  if (event.target === simOptionsWindow.Canvas) {
    gameEngine.mouseX = Math.abs(event.clientX - simOptionsWindow.Rect.left - simOptionsWindow.BorderWidth);
    gameEngine.mouseY = Math.abs(event.clientY - simOptionsWindow.Rect.top - simOptionsWindow.BorderWidth);
    gameEngine.mouseTarget = simOptionsWindow.Canvas;
  }
  
  if (event.target === telemetryWindow.Canvas) {
    event.preventDefault(); event.stopPropagation();
    //gameEngine.mouseX = Math.abs(event.clientX - telemetryWindow.Rect.left - telemetryWindow.BorderWidth) * gameInterface.ratio; //idk if Rect.left should be Rect.right, cause minimap has CSS pos right
    //gameEngine.mouseY = Math.abs(event.clientY - telemetryWindow.Rect.top - telemetryWindow.BorderWidth) * gameInterface.ratio;
    //gameEngine.mouseTarget = telemetryWindow.Canvas;
  }
  
  switch (event.type) {
    case "contextmenu": event.preventDefault(); event.stopPropagation(); break;
    case "mouseup": 
      if (gameEngine.mKey === 1 && gameEngine.gameState === 1) {
        //;
      }
      break;
    case "mousedown":
      gameEngine.mKey = event.keyCode || event.which; // || event.button; 1- left button, 2 - mid button, 3 - right button
      event.preventDefault();
      event.stopPropagation();
      
      if (gameEngine.gameState === 0) { //detect click on Start in main menu
        if (gameEngine.mKey === 1) {
          if (gameEngine.mouseTarget === simOptionsWindow.Canvas) {
            //if (gameEngine.mouseX > menuWidth && gameEngine.mouseX < menuWidth*2 && gameEngine.mouseY > menuHeight && gameEngine.mouseY < menuHeight+menusTextHeight) { 
            if (gameEngine.mouseX > 0 && gameEngine.mouseX < menuWidth && gameEngine.mouseY > simOptionsWindow.CanvasHeight - menuHeight && gameEngine.mouseY < simOptionsWindow.CanvasHeight) { 
              spawnBots();
              gameEngine.gameState = 1;
              main();
              break;
            }
          }
        }
      }
      
      if (gameEngine.gameState === 1) { //get mouse click coordinates
        if (gameEngine.mKey === 1) { //detects start of using selection rectangle or single unit selection
          event.preventDefault(); event.stopPropagation();
        }
        if (gameEngine.mKey === 2) { //detects mid button click for map scroll
          event.preventDefault(); event.stopPropagation();
        }
        if (gameEngine.mKey === 3) { //detects right button click
          event.preventDefault(); event.stopPropagation();
        }
      }
      
      if (gameEngine.gameState === 2) { //detects click on Exit or Resume in main menu
        if (gameEngine.mouseTarget === simOptionsWindow.Canvas) {
          if (gameEngine.mKey === 1) {
            //if (gameEngine.mouseX > menuWidth && gameEngine.mouseX < menuWidth*2 && gameEngine.mouseY > menuHeight && gameEngine.mouseY < menuHeight+menusTextHeight) { //Restart
            if (gameEngine.mouseX > 0 && gameEngine.mouseX < menuWidth && gameEngine.mouseY > simOptionsWindow.CanvasHeight - menuHeight && gameEngine.mouseY < simOptionsWindow.CanvasHeight) { 
              gameEngine.botIdCounter = 0; 
              gameEngine.bots = [];
              gameEngine.runningBots = 0;
              gameEngine.startTime = 0;
              spawnBots();
              gameEngine.gameState = 1;
              main();
              break;
            }
            //if (gameEngine.mouseX > menuWidth && gameEngine.mouseX < menuWidth*2 && gameEngine.mouseY > (menuHeight+(menusTextHeight*2)) && gameEngine.mouseY < (menuHeight+(menusTextHeight*3))) { //Exit
              // //the following lines reset game data in case of Exit
              //gameEngine.botIdCounter = 0; 
              //gameEngine.bots = [];
              //gameEngine.runningBots = 0;
              //gameEngine.startTime = 0;
              //gameEngine.gameState = 0;
              //main();
              //break;
            //}
          }
        }
      }
      
      break;
    //case "mousemove":
      //gameEngine.mouseX = Math.abs(event.clientX - racetrackWindow.Rect.left - racetrackWindow.BorderWidth);
      //gameEngine.mouseY = Math.abs(event.clientY - racetrackWindow.Rect.top - racetrackWindow.BorderWidth);
      //if (gameEngine.gameState === 1 && gameEngine.mouseScroll === true) { //mouse scroll to map scroll detection
        //if (gameEngine.mouseX < halfWidth) gameEngine.viewPosX-=5 //left, step must be 2-4 times lower than those for arrows because mouse is a fast shit
        //if (gameEngine.mouseX > halfWidth) gameEngine.viewPosX+=5 //right, same rule
        //if (gameEngine.mouseY < halfHeight) gameEngine.viewPosY-=5 //up, same rule
        //if (gameEngine.mouseY > halfHeight) gameEngine.viewPosY+=5 //down, same rule
      //}
      //break;
  }
}

function clearFrame() {
  //resetting the matrix BEFORE clearing the viewport!!!
  racetrackWindow.Context.setTransform(1,0,0,1,0,0); //reset the transform matrix as it is cumulative
  /* ------------------------------------------------------------------------ */
  racetrackWindow.Context.clearRect(0, 0, racetrackWindow.CanvasWidth, racetrackWindow.CanvasHeight);//clear viewport ONLY IF matrix is reset
  racetrackWindow.Context.fillStyle = "#000000";//main background
  racetrackWindow.Context.fillRect(0, 0, racetrackWindow.CanvasWidth, racetrackWindow.CanvasHeight);
  telemetryWindow.Context.clearRect(0, 0, telemetryWindow.Canvas.width, telemetryWindow.Canvas.height);
}

/*function drawPixel(pX, pY, r, g, b, a) { //for future use
  var index = (pX + (pY * mainWindow.CanvasWidth)) * 4;
  mainWindow.CanvasData.data[index] = r;
  mainWindow.CanvasData.data[index + 1] = g;
  mainWindow.CanvasData.data[index + 2] = b;
  mainWindow.CanvasData.data[index + 3] = a;
  mainWindow.Context.putImageData(mainWindow.CanvasData, 0, 0); //do not call for each pixel when number to draw is too big
  //var R = 255, G = 0, B = 0; //+-50% faster than var rgb = { R: 255, G: 0, B: 0 };
}*/

// this draws racetrack checkpoints
function drawRacetrack() {
  for (var i = 0; i < targetCount; i++) {
    racetrackWindow.Context.beginPath();
    //racetrackWindow.Context.moveTo(targets[i].x, targets[i].y);
    racetrackWindow.Context.arc(targets[i].x, targets[i].y, gameEngine.targetSize, 0, gameEngine.tau);
    racetrackWindow.Context.strokeStyle = "yellow";
    racetrackWindow.Context.stroke();
  }
}

// this draws our bots
function drawUnits(passDeltaTime) {
  var optiInterp = 1 - passDeltaTime; //small optimization
  var botsCount = gameEngine.bots.length;
  for (var i = 0; i < botsCount; i++) {
    gameEngine.bots[i].destination.x = targets[gameEngine.bots[i].target].x;
    gameEngine.bots[i].destination.y = targets[gameEngine.bots[i].target].y;
    var drawX = (gameEngine.bots[i].position.x * passDeltaTime) + (gameEngine.bots[i].position.x * optiInterp), drawY = (gameEngine.bots[i].position.y * passDeltaTime) + (gameEngine.bots[i].position.y * optiInterp); //interpolation
    racetrackWindow.Context.beginPath();
    if (drawX >= gameEngine.viewPortMinX && drawX <= gameEngine.viewPortMaxX && drawY >= gameEngine.viewPortMinY && drawY <= gameEngine.viewPortMaxY) { //culling or check to draw visible-only units //performance optimization
      if (gameEngine.bots[i].trajectoryLine === true) { 
        racetrackWindow.Context.moveTo(drawX, drawY);
        racetrackWindow.Context.lineWidth = 1;
        racetrackWindow.Context.strokeStyle = gameEngine.bots[i].color;
        racetrackWindow.Context.lineTo(gameEngine.bots[i].destination.x, gameEngine.bots[i].destination.y);
        racetrackWindow.Context.stroke();
      }
      //--
      racetrackWindow.Context.moveTo(drawX, drawY);
      racetrackWindow.Context.ellipse(drawX, drawY, gameEngine.bots[i].size, 
                                      gameEngine.bots[i].size, 
                                      gameEngine.bots[i].heading * (Math.PI/180) /*this rotates our bot, converted to radians because ellipse() uses radians*/, 
                                      0, gameEngine.tau, false);
      racetrackWindow.Context.strokeStyle = gameEngine.bots[i].color;
      racetrackWindow.Context.stroke();
      //racetrackWindow.Context.fillStyle = "black";
      //racetrackWindow.Context.font = "14px Arial"; //1em = 16px
     // racetrackWindow.Context.textBaseline = "alphabetic";
      //if (gameEngine.showUnitStats === true) {
        //racetrackWindow.Context.lineWidth = 3;
        //racetrackWindow.Context.strokeStyle = "white";
        //var uState = units[i].isMoving === true ? "m" : "n";
        //racetrackWindow.Context.strokeText(i+1 + uState, drawX, drawY + gameEngine.bots[i].position.x.size); //for readibility when black text on black ground
        //racetrackWindow.Context.fillText(i+1 + uState, drawX, drawY + gameEngine.bots[i].position.x.size); //draws unit state, also number based on spawn order
      //}
    }
    //draws units on the minimap
    /*var tempDrawX = drawX / gameInterface.ratio, tempDrawY = drawY / gameInterface.ratio;
    telemetryWindow.Context.beginPath();
    telemetryWindow.Context.moveTo(tempDrawX, tempDrawY);
    telemetryWindow.Context.fillRect(tempDrawX, tempDrawY, 1, 1);
    telemetryWindow.Context.fillStyle = units[i].color;
    telemetryWindow.Context.fill();*/
  }
}

/*function drawProjectile() { //not used yet
  mainWindow.Context.fillStyle = "white";
  mainWindow.Context.fillRect(0, 0, mainWindow.CanvasWidth, mainWindow.CanvasHeight);
  //for (var i = 0; i < 100; i++) {
    //drawUnit(~~(Math.random() * (mainWindow.CanvasWidth+1)), ~~(Math.random() * (mainWindow.CanvasHeight+1)),"white");
  //}
}*/

// this outputs all stats to the telemetry window
function drawStats() {
  var screenStats = [];
  var gameBotsLen = gameEngine.bots.length;
  var textSize = 12; //1em = 16px, 1em*0.75 or 16*0.75
  
  for (var i = 0; i < gameBotsLen; i++) {
    screenStats.push(["[bot " +                               gameEngine.bots[i].id + "]", 
                      "    posX: " +                 parseInt(gameEngine.bots[i].position.x), 
                      "    posY: " +                 parseInt(gameEngine.bots[i].position.y), 
                      "    posZ: " +                 parseInt(gameEngine.bots[i].position.z), 
                      "    destinationX: " +         parseInt(gameEngine.bots[i].destination.x), 
                      "    destinationY: " +         parseInt(gameEngine.bots[i].destination.y),
                      "    destinationZ: " +         parseInt(gameEngine.bots[i].destination.z),
                      "    target: " +                        gameEngine.bots[i].target, 
                      "    active: " +                        gameEngine.bots[i].state, 
                      "    speed: " +              parseFloat(gameEngine.bots[i].speed).toFixed(3) + " m/s",
                      "    fuel: " +               parseFloat(gameEngine.bots[i].fuel).toFixed(3) + " litres",
                      "    weight: " +             parseFloat(gameEngine.bots[i].loadedMass).toFixed(3) + " kgs",
                      "    altitude: " +           parseFloat(gameEngine.bots[i].altitude).toFixed(3) + " meters",
                      "    heading: " +            parseFloat(gameEngine.bots[i].heading).toFixed(3),
                      "    pitch: " +                         gameEngine.bots[i].pitch,
                      "    roll: " +                          gameEngine.bots[i].roll,
                      "    yaw: " +                           gameEngine.bots[i].yaw,
                      "    distance travelled: " + parseFloat(gameEngine.bots[i].distanceTravelled).toFixed(3),
                      "    time: " +               parseFloat(gameEngine.bots[i].time*0.001).toFixed(3) + " sec"]);
  }
  
  var screenStatsLen = screenStats.length;
  telemetryWindow.Context.fillStyle = "white";
  telemetryWindow.Context.font = textSize + "px Arial";
  telemetryWindow.Context.textBaseline = "alphabetic";
  var scrYpos = 0;
  for (var i = 0; i < screenStatsLen; i++) {
    var eachBotLen = screenStats[i].length;
    for (var j = 0; j < eachBotLen; j++) {
      scrYpos += textSize;
      telemetryWindow.Context.fillText(screenStats[i][j], 5, scrYpos); //5px offset from top left corner
    }
  }
}

// this draws current frames per second on the screen
function drawFPS() {
  if (gameEngine.showFPS === true) {
    var fpsFilter = 5;
    var msForCurrentFrame = gameEngine.currentTime - gameEngine.lastTime;
    var fpsForCurrentFrame = 1000 / msForCurrentFrame;
    gameEngine.currentMS = (msForCurrentFrame > fpsFilter) ? ~~(msForCurrentFrame / fpsFilter) : ~~(fpsFilter / msForCurrentFrame);
    if (gameEngine.currentTime != gameEngine.lastTime) {
      gameEngine.currentFPS += ~~((fpsForCurrentFrame - gameEngine.currentFPS) / fpsFilter);
    }
    racetrackWindow.Context.fillStyle = "white";
    racetrackWindow.Context.font = "1em Arial"; //1em = 16px
    racetrackWindow.Context.textBaseline = "alphabetic";
    racetrackWindow.Context.fillText("FPS: " + gameEngine.currentFPS, 4, 16); //FPS, 4px offset from top left corner
    racetrackWindow.Context.fillText("render time (in ms): " + gameEngine.currentMS, 4, 32); //ms, 4px offset from top left corner
    racetrackWindow.Context.fillText("racetrack length (in m): " + parseFloat(gameEngine.racetrackLength).toFixed(3), 4, 48); //ms, 4px offset from top left corner
  }
}

// this draws game menus on demand
function drawMenus(menuEvent) {
  console.log("Menu was drawn");
  simOptionsWindow.Context.beginPath();
  switch(menuEvent) { //0 - not running, 1 - running, 2 - paused
    case 0: //not running
      //simOptionsWindow.Context.clearRect(0, 0, simOptionsWindow.CanvasWidth, simOptionsWindow.CanvasHeight);
      simOptionsWindow.Context.setTransform(1,0,0,1,0,0);
      simOptionsWindow.Context.clearRect(0, 0, simOptionsWindow.CanvasWidth, simOptionsWindow.CanvasHeight);
      telemetryWindow.Context.clearRect(0, 0, telemetryWindow.CanvasWidth, telemetryWindow.CanvasHeight);
      simOptionsWindow.Context.font = menuFont;
      simOptionsWindow.Context.fillStyle = "DarkBlue";
      //simOptionsWindow.Context.fillRect(menuWidth, menuHeight, menuWidth, menuHeight);
      simOptionsWindow.Context.fillRect(0, simOptionsWindow.CanvasHeight - menuHeight, menuWidth, menuHeight);
      simOptionsWindow.Context.fillStyle = "white";
      simOptionsWindow.Context.textBaseline = "top";
      simOptionsWindow.Context.fillText(screenMenus[0], 0, simOptionsWindow.CanvasHeight - menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[0], menuWidth, menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[3], menuWidth, menuHeight*1.2);//load - 160px
      //simOptionsWindow.Context.fillText(screenMenus[4], menuWidth, menuHeight*1.4);//options - 240px
      //exit is not needed when the game is not started ... pretty obvious, isn't it?
      break;
    case 1: break; //running
    case 2: //finished or paused, whatever i can't fight this logic right now
      //simOptionsWindow.Context.clearRect(0, 0, simOptionsWindow.CanvasWidth, simOptionsWindow.CanvasHeight);
      simOptionsWindow.Context.font = menuFont;
      simOptionsWindow.Context.fillStyle = "DarkBlue";
      //simOptionsWindow.Context.fillRect(menuWidth, menuHeight, menuWidth, menuHeight);
      simOptionsWindow.Context.fillRect(0, simOptionsWindow.CanvasHeight - menuHeight, menuWidth, menuHeight);
      simOptionsWindow.Context.fillStyle = "white";
      simOptionsWindow.Context.textBaseline = "top";
      simOptionsWindow.Context.fillText(screenMenus[0], 0, simOptionsWindow.CanvasHeight - menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[0], menuWidth, menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[1], menuWidth, menuHeight);//restart - 80px
      //simOptionsWindow.Context.fillText(screenMenus[5], menuWidth, menuHeight*1.2);//exit - 160px
      //simOptionsWindow.Context.fillText(screenMenus[1], menuWidth, menuHeight);//resume - 80px
      //simOptionsWindow.Context.fillText(screenMenus[2], menuWidth, menuHeight*1.2);//save - 160px
      //simOptionsWindow.Context.fillText(screenMenus[3], menuWidth, menuHeight*1.4);//load - 240px
      //simOptionsWindow.Context.fillText(screenMenus[4], menuWidth, menuHeight*1.6);//options - 320px
      //simOptionsWindow.Context.fillText(screenMenus[5], menuWidth, menuHeight*1.8);//exit - 400px
      break;
  }
}

// this detects collisions between all objects we created
function detectCollisions() { //used in updateWorld() //Disabled for now, should be an option
  // //collWorker.postMessage([pl1]);
  // //the problem with not moving units during formation time is probably the angle of the two colliding units - they are equal
  // for (var i = 0; i < unitCount - 1; i++) {
    // //if (i === unitCount - 2) { return }
    // for (var j = i + 1; j < unitCount; j++) {
      // var sumRad = units[i].size + units[j].size, diffX = ~~(Math.abs(units[i].posX - units[j].posX)), diffY = ~~(Math.abs(units[i].posY - units[j].posY));
      // if (diffX < sumRad && diffY < sumRad) { //on this line sumRad should be replaced with averaged (unit radius * 2) from all units
        // //AABB or proximity check optimization before the real collision check, 20-25% improved performance but units start to overlap a bit ... well, whatever
        // if (units[i].isMoving === true //idk if this check should be placed here (perf gain?), note that it's already called in updateWorld() 
        // && units[i].posX + sumRad > units[j].posX 
        // && units[i].posX < units[j].posX + sumRad 
        // && units[i].posY + sumRad > units[j].posY 
        // && units[i].posY < units[j].posY + sumRad) {
          // //Standart Discrete Collision Detection for circles w/o Penetration Vector Correction and Normalization
          // var deltaDist = ~~(Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2)));
          // //var distX = ~~(units[i].posX - units[j].posX); //parseInt() or .toFixed(0) are slow as hell, and btw Google Chrome 32.0.1700.107m is definitely faster than FF 27.0 in this case
          // //var distY = ~~(units[i].posY - units[j].posY);
          // if (deltaDist < ~~(sumRad)) {
            // //Friction
            // //var gameEngine.frictionVector = coeffFriction * units[i].mass * g; //in opposite direction of force applied ... m-m-m-m of movement
            // //--
            // //Verlet integration
            // //var velocityNew = velocityCurrent + (Acceleration * gameEngine.timeStep);
            // //var positionNew = positionCurrent + (velocityNew * gameEngine.timeStep);
            // //or
            // //var positionNew = positionCurrent + (positionCurrent - positionOld) + (Acceleration * Math.pow(gameEngine.timeStep, 2));
            // //var positionOld = positionCurrent;
            // //--
            // var massSum = units[i].mass + units[j].mass;
            // var massDiff = units[i].mass - units[j].mass, massDiff2 = units[j].mass - units[i].mass;
            // var newVelpl1i = ((units[i].speedPerTick * massDiff) + (2 * units[j].force)) / massSum;
            // var newVelpl1j = ((units[j].speedPerTick * massDiff2) + (2 * units[i].force)) / massSum;
            // //--
            // //integration based on velocity before and after collision
            // //var relVelocity = Math.abs(units[i].speedPerTick - units[j].speedPerTick);
            // //var dotVector = (units[i].posX * units[j].posX) + (units[i].posY * units[j].posY) + relVelocity;
            // //var newVelpl1i = Math.abs(units[i].speedPerTick - (units[i].speedPerTick * gameEngine.bounceFactor));
            // //var newVelpl1j = Math.abs(units[j].speedPerTick - (units[j].speedPerTick * gameEngine.bounceFactor));
            // //var iuForce = units[i].force;
            // //var juForce = units[j].force;
            // if (units[i].posX < units[j].posX) { units[i].posX -= newVelpl1i, units[j].posX += newVelpl1j } else { units[i].posX += newVelpl1i, units[j].posX -= newVelpl1j }
            // if (units[i].posY < units[j].posY) { units[i].posY -= newVelpl1i, units[j].posY += newVelpl1j } else { units[i].posY += newVelpl1i, units[j].posY -= newVelpl1j }
            // //add here stop command at destination arrival
          // }
          // //Separation Axis Theorem with Discrete Collision Detection for circles
          // /*var length = Math.abs((units[i].posX - units[j].posX) + (units[i].posY - units[j].posY));
          // var halfWidth1 = units[i].size * 0.5;
          // var halfWidth2 = units[j].size * 0.5;
          // var gap = length - halfWidth1 - halfWidth2;
          // if (gap < 0) {
            // (units[i].posX < units[j].posX) ? (units[i].posX -= 1, units[j].posX += 1) : (units[i].posX += 1, units[j].posX -= 1);
            // (units[i].posY < units[j].posY) ? (units[i].posY -= 1, units[j].posY += 1) : (units[i].posY += 1, units[j].posY -= 1);
          // }*/
        // }
      // }
    // }
  // }
}

// this updates current coordinates of the bots
function updateWorld() {
  if (gameEngine.runningBots === 0) { //checks if we have any active bots so we can continue the simulation
    gameEngine.gameState = 2; //this tells the engine that the game is paused
    //add here some stats logic
    return; //maybe it's better to early exit from the function, execution of the conditions below is useless
  }
  
  for (var i = 0; i < gameEngine.bots.length; i++) {
    gameEngine.bots[i].updateBot();
  }
  
  //after coordinates of our bots are updated, we can check if there are any collisions between objects
  //detectCollisions(); //Disabled for now, should be an option
}

// this is our rendering function
function renderWorld(passDeltaTime) { //order when objects should be rendered: map->units->UI
  clearFrame(); //clears the canvas
  drawRacetrack(); //draws checkpoints of the current route
  drawUnits(passDeltaTime); //draws our bots
  drawStats(); //draws real-time statistics
  drawFPS(); //draws FPS counter
}

/* -------------------------------------------------------------------------- */

// these vars are for FIX-YOUR-TIMESTEP solution
/*var t = 0;
var dt = 0.01;
var accumulator = 0;
var previousState = 0;
var currentState = 0;
var state = 0;*/

gameEngine.currentTime = performance.now().toFixed(3); //gets the current time needed for our engine

// this is our engine's loop
function main() {
  if (gameEngine.gameState === 0) { //draws menus for when the game is not running
    gameEngine.botIdCounter = 0; 
    gameEngine.bots = [];
    gameEngine.runningBots = 0;
    gameEngine.startTime = 0;
    drawMenus(0);
    return;
  }
  
  if (gameEngine.gameState === 1) { //this checks if the game is running and continuously loops it
    gameEngine.currentTime = performance.now().toFixed(3); //gets the current time needed for our engine
    gameEngine.b = (Math.abs(gameEngine.currentTime - gameEngine.lastTime) * 0.001);
    //this updates our deltaTime
    //IMPORTANT - in most cases this is 15% slower to 15% faster
    //IMPORTANT - DO NOT SWAP 1 < gameEngine.b with gameEngine.b > 1 cause SOMETIMES we got 30-50 times increased ms or simulation enters in Warp One (faster than light)!!! Fuckingly weird situation if you ask me
    gameEngine.dTime += (1 < gameEngine.b) ? 1 : gameEngine.b;
    //get the timeProduct
    var timeProduct = gameEngine.timeStep * gameEngine.timeScale;
    while (gameEngine.dTime > timeProduct) { //updates the world while deltaTime is bigger than the timeProduct
      updateWorld(); //this updates the world
      gameEngine.dTime -= (gameEngine.timeStep * gameEngine.timeScale); //this updates our deltaTime
    }
    //now it's time to render the world
    //IMPORTANT - must be out of while loop to free cpu time
    //IMPORTANT - makes wobbly units but adds interpolation, instead of (gameEngine.dTime / gameEngine.timeScale)
    renderWorld(gameEngine.dTime / (gameEngine.timeStep * gameEngine.timeScale));
    gameEngine.lastTime = gameEngine.currentTime;
    requestAnimationFrame(main);
  }
  
  // exact copy of http://gafferongames.com/game-physics/fix-your-timestep/
  //currentState and previousState maybe are current and previous position of our bots, in fact idk
  /*if (gameEngine.gameState === 1) {
    var newTime = performance.now().toFixed(3);
    var frameTime = newTime - gameEngine.currentTime;
    
    if (frameTime > dt) {
      frameTime = dt;
      currentTime = newTime;
    }
    
    accumulator += frameTime;
    
    while (accumulator >= dt) {
      previousState = currentState;
      updateWorld(currentState, t, dt);
      t += dt;
      accumulator -= dt;
    }
    
    var alpha = accumulator / dt;
    
    state = currentState * alpha + previousState * (1.0 - alpha);
    
    renderWorld(state);

    requestAnimationFrame(main);
  }*/
  
  if (gameEngine.gameState === 2) { drawMenus(2); return; } //draws menus for when the game is paused
}

// this section loads all event listeners and our engine when the page is loaded
document.body.onload = function() {
  window.addEventListener('keydown', function(event){detectKeys(event)}, false); //detects pressed keys
  window.addEventListener('contextmenu', function(event){mouseEvents(event)}, false); //disables right-click menu in canvas
  window.addEventListener('mousedown', function(event){mouseEvents(event)}, false); //detects pressed mouse buttons
  window.addEventListener('mousemove', function(event){mouseEvents(event)}, false); //detects mouse movement
  window.addEventListener('mouseup', function(event){mouseEvents(event)}, false); //detects realeased mouse buttons
  main(); //and finally let's load our engine
};

/* ------------------------------- TODO SECTION ----------------------------- */
/*
1. Physics
2. Loading bot models from a file(s)
3. Collision detection
4. AI
5. Projectiles
6. Aftermath statistics
7. Sim controls
*/
/* ------------------------------- TODO SECTION ----------------------------- */
