// description: testing lab for bots and their AI
// author: me
// source code: https://github.com/quantuumsnot/botlab

'use strict'; //meh

//check browser for using specific supported features
var isChromium = !!window.chrome;

/* ------------------- Units of measurement reference table ----------------- */
/* Units - Forces - Moment - Acceleration - Velocity - Position - Mass - Inertia */
//Metric - Newton - Newtonmeter - Meters per second squared - Meters per second - Meters - Kilogram - Kilogram meter squared
//English (Velocity in ft/s) - Pound - Foot pound - Feet per second squared - Feet per second - Feet - Slug - Slug foot squared
//English (Velocity in kts) - Pound - Foot pound - Feet per second squared - Knots - Feet - Slug - Slug foot squared
/* -------------------------------------------------------------------------- */

/* --------------------------- Some conversions ----------------------------- */
//KelvinToFahrenheit -> (1.8 * kelvin) - 459.4
//CelsiusToRankine -> (celsius * 1.8) + 491.67
//RankineToCelsius -> (rankine - 491.67) / 1.8
//KelvinToRankine -> kelvin * 1.8
//RankineToKelvin -> rankine / 1.8
//FahrenheitToCelsius -> (fahrenheit - 32.0) / 1.8
//CelsiusToFahrenheit -> (celsius * 1.8) + 32.0
//CelsiusToKelvin -> celsius + 273.15
//KelvinToCelsius -> kelvin - 273.15
//FeetToMeters -> feet * 0.3048
/* -------------------------------------------------------------------------- */

//for .keyCode or .which 1 is left mouse, 2 is middle, 3 is right
//for .button 0 is left, 1 is middle, 2 is right
//telemetryWindow should be a good fraction of racetrackWindow, for example 1/4
var definedKeys = {BACKSPACE: 8, TAB: 9, ENTER: 13, SHIFT: 16, CTRL: 17, ALT: 18, PAUSE: 19,
CAPSLOCK: 20, ESC: 27, SPACE: 32, PAGEUP: 33, PAGEDOWN: 34, END: 35, HOME: 36, LEFT: 37,
UP: 38, RIGHT: 39, DOWN: 40, INSERT: 45, DELETE: 46, F1: 112, F2: 113, F3: 114, F4: 115,
F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123, W: 87, A: 65,
S: 83, D: 68, NUMLOCK: 144, SCROLLLOCK: 145},
blockedKeys = [19, 32, 37, 38, 39, 40], //arrows, space, pause
specialKeysState = {SHIFT: false, CTRL: false, ALT: false}; //shift, ctrl, alt

var mainRatio = 12;
var screenMenus = ["CREATE FAST BOT", "CREATE SLOW BOT", "CREATE GENERIC BOT", "CREATE RANDOM BOTS"];//, "RESTART", "SAVE", "LOAD", "OPTIONS", "EXIT", "GAMEPLAY", "GRAPHICS", "AUDIO"]; //main menu
var baseText = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/=%";
var baseTextLength = baseText.length;
var sortedMenus = screenMenus;
var baseLength = sortedMenus.reduce(function (a, b) { return a.length > b.length ? a : b; }).length;
//delete sortedMenus;
var menusHeightAreas = {start: 0, resume: 0, save: 0, load: 0, options: 0, exit: 0, gameplay: 0, graphics: 0, audio: 0};
var fontSize = "1em"; //1em is 16px
var fontFamily = "Arial";
var menuFont = fontSize + " " + fontFamily;
var menuHeight = 16; //16px or 1em
menusHeightAreas.start = fontSize[0] * 16; //fontSize[0] is first letter of a string, get area of 'Start' for the mouse keydown event
var menusTextHeight = fontSize[0] * 16;
/* -------------------------------------------------------------------------- */
/*
 * Get "pointers" to common math functions to speed up the calls. This avoids
 * having to resove the Math object member before calling the function and is
 * supposed to be faster.
 */
//the idea is from http://pd.rectorsquid.com/pd.js
var floor = Math.floor;
var random = Math.random;
var sin = Math.sin;
var cos = Math.cos;
var acos = Math.acos; //in radians
var atan2 = Math.atan2; //in radians
var atan = Math.atan; //in radians
var PI = 3.141592; //Math.PI, hardcoded must be faster cause we're not calling each time Math.PI object
var TAU = 2 * PI; //PERFOPT: 6.283184 radians, because arc() uses radians
var sqrt = Math.sqrt;
var pow = Math.pow;
var exp = Math.exp;
var hypot = Math.hypot;
var min = Math.min;
var max = Math.max;
var abs = Math.abs;
var round = Math.round;
var Deg2Rad = PI/180; //PERFOPT
var Rad2Deg = 180/PI; //PERFOPT
/* -------------------------------------------------------------------------- */
var guidanceError = 5 * Deg2Rad; //5 in degrees, converted to Radians
/* -------------------------------------------------------------------------- */

function detectKeys(event) {
  event.preventDefault(); event.stopPropagation();
  var key = event.keyCode || event.which; //alternative to ternary - if there is no keyCode, use which
  //prevents scrolling of browser's viewport with the keys, f5 not working (fixed at the end of the function)
  /*if (blockedKeys.indexOf(key) !== undefined) {
    if (sim.state === 1) { //Ctrl + A, selecting all bots ???
      if (key == 65 && event.ctrlKey) {
        //;
      }
    }
  }*/
  
  switch (key) { //19 - pause, 32 - space, 37 - left, 38 - up, 39 - right, 40 - down
    case 19:
      switch (sim.state) {
        case 0: break;
        case 1: sim.state = 2; break;
        case 2: sim.state = 1; main(); break;
      }
      break;
    case 32: //currently we are using space for easier restart of our simulation
      switch (sim.state) {
        case 0: 
          sim.botIdCounter = 0; 
          sim.bots = [];
          sim.runningBots = 0;
          sim.startTime = 0;
          spawnRandomBots();
          sim.state = 1;
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
//var menuWidth = (2 * baseTextWidth) * baseLength; //Disabled for now
//var menuWidth = racetrackWindow.CanvasWidth * 0.33, menuHeight = racetrackWindow.CanvasHeight * 0.33;
var halfWidth = racetrackWindow.Canvas.width / 2, halfHeight = racetrackWindow.Canvas.height / 2;

var gameInterface = {
  /*logLine: document.createElement("a"), */
  pageWidth: window.innerWidth, 
  pageHeight: window.innerHeight,
  ratio: racetrackWindow.CanvasWidth / telemetryWindow.CanvasWidth
};

var sim = {
  viewPortMinX: 0, viewPortMinY: 0, viewPortMaxX: racetrackWindow.CanvasWidth, viewPortMaxY: racetrackWindow.CanvasHeight, 
  mouseX: 0, mouseY: 0, mouseTarget: "", 
  mKey: 0, 
  state: 1, /*0 - stopped, 1 - running, 2 - paused*/
  destinationReached: false,
  startTime: 0, playedTime: 0, tempPlayedTime: 0, currentTime: 0, lastTime: 0, dTime: 0, timeProduct: 0, updateTime: 0, worldUpdates: 0, 
  distPerFrame: 0, 
  timeScale: 1, /*< 1 speeds up, > 1 slows down the game, must be fixed*/ 
  timeStep: 0.002, //in s, 0.002 means the world is updated ~500 times in 1 second
  timeDiff: 0, temp: 0, 
  dx: 0, dy: 0, 
  referenceGravity: 9.80665, //reference gravity in m/sq. s at sea level
  currentGravity: this.referenceGravity, //in m/sq. s
  earthRadius: 6371000, //in m
  earthPowRadius: 40589641000000, //in m
  geopotentialHeight: 0, //in m
  frictionVector: 0.99, //maybe for ground vehicles
  bounceFactor: 0.05, //maybe for particles or projectiles
  distance: 0, x: 0, y: 0, 
  racetrackLength: 0, //in m
  airReferenceTemperature: 15, //reference air temp in Celsius at sea level, or 288.15 K 
  airReferenceViscosity: 0.01827, //0.00001789 reference air viscosity in centipoise at reference temperature in Celsius, or 0.01827 at reference temperature in Rankine
  airReferencePressure: 101325, //reference air pressure in Pa at sea level and 15'C air temperature
  airReferenceDensity: 1.225, //reference air density at sea level in kg/cub.m, or 0.0764734 lb/cub. ft
  RankineRefTemp: 518.76, //reference air temp in Rankine degree == 15'C
  SutherlandConstant: 120, //for air
  gasConstant: 8.3144598, //reference gas constant at sea level, in J/mol Kelvin, or 1545.35 ft lb/lbmol Rankine
  airMolarMass: 0.0289644, // in kg/mol
  airLapseRate: 0.0065, //0.0098 reference air lapse rate in Celsius per meter altitude, 0.0065 reference air lapse rate in Kelvin per meter, 0.0019812 in Kelvin per foot
  airViscosity: this.airReferenceViscosity, 
  airPressure: this.airReferencePressure, 
  airDensity: this.airReferenceDensity, 
  kinematicViscosity: 0, 
  ReynoldsNumber: 0, 
  airCurrentTemp: this.airReferenceTemperature, 
  KelvinToRankine: this.airCurrentTemp * 1.8, //in Rankine
  counter: 0, 
  showFPSMem: true, currentFPS: 0, currentMS: 0, currentMem: 0, showTraj: false, showUnitStats: true, 
  botIdCounter: 0, bots: [], runningBots: 0, 
  targetSize: 10
};

var mapData = {sizeX: 512, sizeY: 512};

//Cartesian coordinates
var targets = [ //for testing we are using a racetrack shaped like '8' symbol with 7 points
  {x: 0, y: 172, z: 128}, //1 start finish point
  {x: 82, y: 88, z: 256}, //2
  {x: 0, y: 0, z: 512}, //3 middle point
  {x: -88, y: -82, z: 256}, //4
  {x: 0, y: -172, z: 128}, //5
  {x: 82, y: -82, z: 256}, //6
  {x: 0, y: 0, z: 512}, //7 middle point
  {x: -88, y: 88, z: 256}, //8
  {x: 0, y: 172, z: 128} //9 start finish point
];

var targetCount = targets.length;

//calculate length of the racetrack, later we'll use that for calculating the efficiency of our bots ...
// ... ie bot's travelled distance divided by racetrack's length will give us diff in percent (positive number means less efficient)
for (var a = 0; a < targetCount; a++) {
  if (a === 8) continue;
  var tmpdiffX = Math.abs(targets[a].x - targets[a+1].x);
  var tmpdiffY = Math.abs(targets[a].y - targets[a+1].y);
  var tmpdiffZ = Math.abs(targets[a].z - targets[a+1].z);
  var tmpLength = parseFloat(hypot(tmpdiffX, tmpdiffY, tmpdiffZ).toFixed(3));
  sim.racetrackLength += tmpLength;
}

//Disabled for now
/*var mapTexture = new Image();
mapTexture.src = "maptexture_test1.png";*/

//Bot object
var Bot = function (botColor, dragpoints, thrust, mass, height, wingspan, wingarea, wingtype, fuel, traj) {
  this.position = {x: 0, y: 0, z: 0}; //z is the ALTITUDE!!!
  this.destination = {x: 0, y: 0, z: 0}; //z is the ALTITUDE!!!
  this.direction = {x: 0, y: 0, z: 0}; //z is the ALTITUDE!!!
  this.distance = 0; //in m
  this.distanceTravelled = 0; //in m
  this.distanceFromEarthCenter = sim.earthRadius; //in m
  this.altitude = this.position.z; //in m
  this.pitch = 0; //angle of attack ? in Radians?
  this.roll = 0; //in Radians?
  this.yaw = 0; //in Radians?
  this.heading = 0; //in Radians, 0 - East?
  this.rollRate = 400 * Deg2Rad * sim.timeStep; //400 degrees roll rate in second or 0.4 deg per 1 milisecond, converted to Radians
  this.yawRate = 400 * Deg2Rad * sim.timeStep; //temporarily same as rollRate, converted to Radians
  this.pitchRate = 400 * Deg2Rad * sim.timeStep; //temporarily same as rollRate, converted to Radians
  this.dragCoeff = dragpoints * 0.0001; //TODO: find why I multiply by 0.0001 //FOUND: if 0.0001 is removed the bot crashes very fast
  this.dragForce = Number.EPSILON;
  this.thrust = thrust; //in kgf
  this.fuel = fuel; //in liters
  this.mass = mass; //in kg
  this.loadedMass = this.fuel + this.mass; //in kg
  this.PowerToWeightRatio = this.thrust / this.loadedMass; //needed for guidance control system multiplier
  this.height = height; //in m
  this.acceleration = (this.thrust / this.loadedMass) * sim.timeStep; //acceleration in m/s
  this.oldAcceleration = 0;
  this.velocity = {x: 0, y: 0, z: 0}; //maybe needed for proper integration
  this.speed = 0; //current speed in m/s
  this.momentOfInertia = 0.4 * this.loadedMass * wingspan * wingspan; //solid sphere inertia formula is from https://en.wikipedia.org/wiki/List_of_moments_of_inertia
  //check also https://www.toptal.com/game/video-game-physics-part-i-an-introduction-to-rigid-body-dynamics
  this.wingSpan = wingspan; //in m
  this.wingArea = wingarea; //in sq.m
  this.wingLoading = (this.loadedMass / this.wingArea) * sim.timeStep; //in kg/sq.m
  this.wingType = wingtype; //1 - flat bottom, 2 - semi-symmetric, 3 - symmetric
  this.frontalArea = this.wingSpan * this.height; //in sq.m
  this.liftCoeff = 0;
  this.liftForce = 0; //in kN
  this.fuelConsumption = (this.thrust / 100) * 0.035; //0.035 litres per second, thrust * fuel consumption per second, for jet engine ~150kN ~35g fuel per second per 1kN or 100kg thrust
  this.fuelConPerTimeStep = this.fuelConsumption * sim.timeStep; //small optimization
  this.trajectoryLine = traj;
  this.CoM = 0; //center of mass
  this.CoT = 0; //center of thrust
  this.CoL = 0; //center of lift
  this.size = this.wingArea / 10; //size of the bot on the canvas
  this.color = botColor;
  this.id = sim.botIdCounter;
  this.target = 0;
  this.targetAngleXY = 0;
  this.targetAngleZ = 0;
  this.hasTarget = false;
  this.time = 0;
  this.startTime = 0;
  this.isTimed = false;
  this.state = true;
  this.distanceBeforeFirstTarget = 0;
  this.isLanding = false;
  sim.botIdCounter++;
  sim.runningBots++;
  /* ------------------------------------------------------------------------ */
  
  //set starting position to be equal for each bot
  this.startPosDiffX = abs(targets[1].x - targets[0].x);
  this.startPosDiffY = abs(targets[1].y - targets[0].y);
  this.startPosDiffZ = abs(targets[1].z - targets[0].z);
  this.startPosDistance = hypot(this.startPosDiffX, this.startPosDiffY, this.startPosDiffZ);
  
  //this normalizes the vector, so our calculations for direction and speed in Cartesian system are not skewed
  if (this.startPosDistance > 0) {
    this.startPosDiffX /= this.startPosDistance;
    this.startPosDiffY /= this.startPosDistance;
    this.startPosDiffZ /= this.startPosDistance;
  }
  this.startPosAngle = atan2(-this.startPosDiffY, this.startPosDiffX); //startPosDiffY must be first!!!
  this.heading = this.startPosAngle;
  if (this.startPosAngle > 0) { this.heading /= this.startPosAngle; } //dunno if we must normalize the heading angle
  //IMPORTANT: Rly can't remember why I'm dividing startPosAngle by 180*PI
  this.position.x = targets[0].x + (sim.targetSize) * cos(this.startPosAngle / (180 * PI));
  this.position.y = targets[0].y + (sim.targetSize) * sin(this.startPosAngle / (180 * PI));
  this.position.z = targets[0].z + (sim.targetSize) * sin(this.startPosAngle / (180 * PI));
  
  //find distance between bot and first target so we can substract it from bot's overall distance travelled
  this.distanceBeforeFirstTarget = hypot(abs(this.position.x - targets[0].x), abs(this.position.y - targets[0].y), abs(this.position.z - targets[0].z));
  //some var cleaning, idk if this is usefull
  delete this.startPosDiffX; delete this.startPosDiffY; delete this.startPosDiffZ; delete this.startPosDistance; delete this.startPosAngle;
  /* ------------------------------------------------------------------------ */
  
  //bot timing
  this.updateTimer = function() {
    //start the stopwatch for our bot
    if (this.target === 1 && this.isTimed === false && this.startTime === 0) {
      this.startTime = performance.now();
      this.isTimed = true;
    }
    
    //save our bot's runtime
    if (this.isTimed === true && this.startTime !== 0) {
      this.time = performance.now() - this.startTime;
    }
  };
  
  //update bot state based on current fuel level
  this.updateFuel = function() {
    if (this.fuel >= this.fuelConPerTimeStep) {
      this.fuel -= this.fuelConPerTimeStep;
      this.loadedMass -= this.fuelConPerTimeStep;
      this.PowerToWeightRatio = this.thrust / this.loadedMass;
      this.acceleration = (this.thrust / this.loadedMass) * sim.timeStep;
    } else {
      this.fuel = 0; //directly set fuel to 0 when it is < 0 or has some very low values ~0.050l
      if (this.acceleration !== 0) this.acceleration = 0;
    }
  };
  
  //calculate wing loading and lift force
  this.updateWingLoadAndLiftForce = function() {
    this.wingLoading = (this.loadedMass / this.wingArea) * sim.timeStep;
    this.liftCoeff = ((this.loadedMass * sim.currentGravity) / ((sim.airDensity / 2) * pow(this.acceleration, 2) * this.wingArea)) * sim.timeStep;
    this.liftCoeff = isNaN(this.liftCoeff) ? 0 : this.liftCoeff;
    this.liftForce = (this.liftCoeff * (0.5*(sim.airDensity * pow(this.acceleration, 2))) * this.wingArea) * sim.timeStep;
    this.liftForce = isNaN(this.liftForce) ? 0 : this.liftForce;
  };

  //update targets
  this.updateTargets = function() {
    //set destination coords for our bot only once for each destination
    if (this.hasTarget === false && this.state === true) {
      this.hasTarget = true;
      this.destination.x = targets[this.target].x;
      this.destination.y = targets[this.target].y;
      this.destination.z = targets[this.target].z;
      console.log("Bot " + this.id + " locked on target " + this.target);
    }
    
    //update bot state if there aren't new targets
    if (this.target > targetCount) {
      this.isTimed = false; //stop the stopwatch for our bot
      this.state = false; //set state of our bot to inactive
      sim.runningBots--; //remove our bot from the list with active bots
      return; //maybe it's better to early exit from the function, since checking of the conditions following it is a performance hit
    }
  };
  
  this.checkTargets = function() {
    //IMPORTANT: after adding air pressure, density and temp it seems that bot stuck again at the checkpoints
    if (this.target < targetCount - 1) { //check if our bot has more targets
      if (this.distance <= this.size) {
        this.hasTarget = false;
        this.target++; //bot went through another target
        //this.distanceTravelled += this.size; //temporarily disabled
      }
    } else { //or if hasn't ...
      this.isTimed = false; //stop the stopwatch for our bot
      this.state = false; //set state of our bot to inactive
      this.hasTarget = false; //remove our bot's target state
      this.distanceTravelled -= this.distanceBeforeFirstTarget;
      sim.runningBots--; //remove our bot from the list with active bots
      console.log("Bot " + this.id + " finished in " + parseFloat(this.time*0.001).toFixed(3) + " seconds | " + parseFloat(this.distanceTravelled).toFixed(3) + " meters travelled");
    }
  };
    
  this.updatePosition = function() {
    //calculate the difference between current position and destination for each axis
    this.direction.x = this.destination.x - this.position.x;
    this.direction.y = this.destination.y - this.position.y;
    this.direction.z = this.destination.z - this.position.z;
 
    //calculate distance between the bot and it's current destination
    //IMPORTANT: DO NOT REMOVE ~~ FROM HERE or bots stuck in checkpoints
    //it seems that if ~~ is removed bots no more stuck, this happened after adding the 3rd axis
    this.distance = hypot(this.direction.x, this.direction.y, this.direction.z); //perf tests show that using ~~ in front of Math.hypot() the code is 8% faster
    
    //check if the bot is still away from the target, possible jittering near the target
    this.checkTargets();

    //this normalizes the vector, so our calculations for direction and speed in Cartesian system are not skewed
    this.direction.x /= this.distance;
    this.direction.y /= this.distance;
    this.direction.z /= this.distance;
    
    //calculate velocities for each axis
    this.velocity.x += (this.direction.x * this.acceleration * sim.timeStep); //+ this.heading;
    this.velocity.y += (this.direction.y * this.acceleration * sim.timeStep); //+ this.heading;
    this.velocity.z += (this.direction.z * this.acceleration * sim.timeStep); //+ this.pitch;
    
    //FIRST calculate Geopotential height
    //this is gravity-adjusted altitude of our bot, using variation of the gravity with latitude and elevation
    //based on https://en.wikipedia.org/wiki/Barometric_formula#Source_code
    sim.geopotentialHeight = (sim.earthRadius * this.altitude / (sim.earthRadius + this.altitude)) / 1000; //in kilometers
    
    //calculate current air temperature, in Kelvin, and air density + pressure, in Pascals
    //based on https://en.wikipedia.org/wiki/Barometric_formula#Source_code
    //1st variant
    //sim.airCurrentTemp = sim.airReferenceTemperature - (sim.airLapseRate*this.altitude) + 273.15; //in Kelvin
    //2nd variant
    if (sim.geopotentialHeight <= 11) { 
      sim.airCurrentTemp = 288.15 - (6.5 * sim.geopotentialHeight);
      sim.airPressure = 101325 * pow(288.15 / sim.airCurrentTemp, -5.255877);
    } // Troposphere
    else if (sim.geopotentialHeight <= 20) { 
      sim.airCurrentTemp = 216.65 - (6.5 * sim.geopotentialHeight);
      sim.airPressure = 22632.06 * exp(-0.1577 * (sim.geopotentialHeight - 11));
    } // Stratosphere starts
    else if (sim.geopotentialHeight <= 32) { 
      sim.airCurrentTemp = 196.65 + sim.geopotentialHeight;
      sim.airPressure = 5474.889 * pow(216.65 / sim.airCurrentTemp, 34.16319);
    }
    else if (sim.geopotentialHeight <= 47) { 
      sim.airCurrentTemp = 228.65 + 2.8 * (sim.geopotentialHeight - 32);
      sim.airPressure = 868.0187 * pow(228.65 / sim.airCurrentTemp, 12.2011);
    }
    else if (sim.geopotentialHeight <= 51) { 
      sim.airCurrentTemp = 270.65 - (6.5 * sim.geopotentialHeight);
      sim.airPressure = 110.9063 * exp(-0.1262 * (sim.geopotentialHeight - 47));
    }// Mesosphere starts
    else if (sim.geopotentialHeight <= 71) { 
      sim.airCurrentTemp = 270.65 - 2.8 * (sim.geopotentialHeight - 51);
      sim.airPressure = 66.93887 * pow(270.65 / sim.airCurrentTemp, -12.2011);
    }
    else if (sim.geopotentialHeight <= 84.85) { 
      sim.airCurrentTemp = 214.65 - 2 * (sim.geopotentialHeight - 71);
      sim.airPressure = 3.956420 * pow(214.65 / sim.airCurrentTemp, -17.0816);
    }
    //geopotHeight must be less than 84.85 km
    //altitude must be less than 86 km if we want the formula below to work
    sim.airDensity = (sim.airPressure * sim.airMolarMass) / (sim.gasConstant * sim.airCurrentTemp);
    
    //calculate current air pressure at bot's position
    sim.airPressureX = 0.5 * sim.airDensity * pow(this.velocity.x, 2);
    sim.airPressureY = 0.5 * sim.airDensity * pow(this.velocity.y, 2);
    sim.airPressureZ = 0.5 * sim.airDensity * pow(this.velocity.z, 2);
    
    //calculate current air viscosity
    sim.KelvinToRankine = sim.airCurrentTemp * 1.8; //in Rankine
    sim.airViscosity = sim.airReferenceViscosity*(((0.555*sim.RankineRefTemp) + sim.SutherlandConstant)/((0.555*sim.KelvinToRankine) + sim.SutherlandConstant))*pow(sim.KelvinToRankine/sim.RankineRefTemp, 3.2); //in centipose

    //IMPORTANT - adding and drag to equation makes bots to jump from reached destination
    //IMPORTANT - dunno why but changed calculation of position.xyz seems fixed the jumping, and travelled distance is somewhat CORRECT!!!
    
    //calculate the Reynolds number for using the correct drag law later
    sim.kinematicViscosity = sim.airViscosity / sim.airDensity;
    sim.ReynoldsNumber = (this.acceleration * this.size) / sim.kinematicViscosity;

    //choose which drag law to use
    if (sim.ReynoldsNumber < 1) {
      //for low velocity, linear drag or laminar flow
      var dragX = 6 * PI * sim.airViscosity * this.size * this.velocity.x;
      var dragY = 6 * PI * sim.airViscosity * this.size * this.velocity.y;
      var dragZ = 6 * PI * sim.airViscosity * this.size * this.velocity.z;
    } else {
      //for high velocity, quadratic drag or turbulent flow
      var dragX = sim.airPressureX * this.dragCoeff * this.frontalArea;
      var dragY = sim.airPressureY * this.dragCoeff * this.frontalArea;
      var dragZ = sim.airPressureZ * this.dragCoeff * this.frontalArea;
    }
    dragX = (isNaN(dragX) ? 0 : dragX*sim.timeStep);
    dragY = (isNaN(dragY) ? 0 : dragY*sim.timeStep);
    dragZ = (isNaN(dragZ) ? 0 : dragZ*sim.timeStep);
    
    //TODO: calculate this.dragForce
    
    //calculate actual Earth's gravity
    this.distanceFromEarthCenter = sim.earthRadius + this.position.z;
    sim.currentGravity = sim.referenceGravity * (sim.earthPowRadius / pow(this.distanceFromEarthCenter, 2));
    sim.currentGravity = parseFloat(sim.currentGravity).toFixed(6);

    //move our bot, maybe a Verlet version?
    //1st variant
    //var stepX = (this.velocity.x - dragX + (0.5*this.acceleration*sim.timeStep))*sim.timeStep;
    //var stepY = (this.velocity.y - dragY + (0.5*this.acceleration*sim.timeStep))*sim.timeStep;
    //var stepZ = ((this.velocity.z - dragZ + this.liftForce*sim.timeStep) - (0.5*sim.currentGravity*sim.timeStep)+(0.5*this.acceleration*sim.timeStep))*sim.timeStep;
    //2nd variant
    this.acceleration *= 0.5*sim.timeStep;
    sim.currentGravity *= 0.5*sim.timeStep*sim.timeStep;
    this.velocity.x += this.direction.x * ((this.acceleration - this.oldAcceleration)/2) * sim.timeStep;
    this.velocity.y += this.direction.y * ((this.acceleration - this.oldAcceleration)/2) * sim.timeStep;
    this.velocity.z += this.direction.z * ((this.acceleration - this.oldAcceleration)/2) * sim.timeStep;
    var stepX = (this.velocity.x - dragX + this.acceleration);
    var stepY = (this.velocity.y - dragY + this.acceleration);
    if (this.liftForce <= 0) {
      var stepZ = -(this.velocity.z - dragZ - sim.currentGravity + this.liftForce + this.acceleration);
    } else {
      var stepZ = (this.velocity.z - dragZ - sim.currentGravity + this.liftForce + this.acceleration);
    }
    this.position.x += stepX;
    this.position.y += stepY;
    this.position.z += stepZ;
    this.oldAcceleration = this.acceleration;
    
    //calculate current speed and travelled distance of our bot
    var tmp = hypot(stepX, stepY, stepZ); //IMPORTANT - DO NOT optimise with ~~ or speed and distance travelled will be wrong!!!
    this.distanceTravelled += tmp;
    this.speed = (tmp / sim.timeStep); //V = S / t, in m/s
    this.altitude = this.position.z;
    
    //check if our bot crashed or has been landed
    if (this.altitude <= 0 && this.isLanding === false) {
      this.isTimed = false; //stop the stopwatch for our bot
      this.state = false; //set state of our bot to inactive
      this.hasTarget = false; //remove our bot's target state
      this.distanceTravelled -= this.distanceBeforeFirstTarget;
      sim.runningBots--; //remove our bot from the list with active bots
      var statusText = (this.isLanding === false) ? " CRASHED" : " LANDED";
      console.log("Bot " + this.id + statusText + " at location [" + 
                          parseFloat(this.position.x).toFixed(3) + ", " + 
                          parseFloat(this.position.y).toFixed(3) + ", " + 
                          parseFloat(this.position.z).toFixed(3) + "]");
    }

    //this console.log below is interesting
    //seems current speed of the bot (to be precise distance travelled) and its acceleration based on aero formula thrust / mass ...
    //... are not equal or almost equal, ie the speed sometimes is between 1 and 50% bigger than usual ...
    //... or maybe the sim.dTime is not correct, dunno why
    //console.log("bot " + i + " - " + this.acceleration + " | vxvyvz - " + Math.hypot(vx, vy, vz));
    
    //output all parameters for debugging, only for bot #0
    /*if (this.id === 0) {
      console.log("Speed "          + this.speed +
                  " Altitude "       + this.altitude +
                  " AirTemp "        + tempTemp +
                  " AirDensity "     + sim.airDensity +
                  " AirPressureX "    + sim.airPressureX +
                  " AirPressureY "    + sim.airPressureY +
                  " AirPressureZ "    + sim.airPressureZ +
                  " AirViscosity "   + sim.airViscosity +
                  " CurrentGravity "       + sim.currentGravity
                 );
    }*/
  };
  
  this.updateGuidanceSystem = function() {
    //find angle to the target in radians and convert it to degrees
    //var targetAngleXY = atan2(-directionY, directionX) * (180 / PI); //y BEFORE x!!!
    //var targetAngleZ = atan(directionX/directionY) * (180 / PI);
    //var targetAngleXY = acos(directionZ / this.distance) * (180 / PI);
    //var targetAngleZ = atan2(-directionY, directionX) * (180 / PI);
    this.targetAngleXY = atan2(-this.direction.y, this.direction.x);
    this.targetAngleZ = acos(this.direction.z / hypot(this.position.x, this.position.y, this.position.z));
    
    //uses Proportional Navigation algorithm, diff is set to global var guidanceError, our multiplier is PowerToWeightRatio
    //bigger PowerToWeightRatio, bigger course corrections
    //faster bots have higher speed and hense energy so they need bigger course corrections (so their multiplier is bigger)
    if (this.heading - this.targetAngleXY >= guidanceError) {
      this.heading -= this.yawRate * this.PowerToWeightRatio;
    } else {
      this.heading += this.yawRate * this.PowerToWeightRatio;
    }
    
    if (this.pitch - this.targetAngleZ >= guidanceError) {
      this.pitch -= this.pitchRate * this.PowerToWeightRatio;
    } else {
      this.pitch += this.pitchRate * this.PowerToWeightRatio;
    }
      
    //IMPORTANT: This is a crash prevention. Check if bot's altitude is higher than its size
    if (this.altitude <= this.size) {
      this.pitch += this.pitchRate * this.PowerToWeightRatio;
    }
  };
  
  this.updateBot = function() {
    if (this.state === true) { //check if our bot is active
      this.updateTimer();
      this.updateFuel();
      this.updateWingLoadAndLiftForce();
      this.updatePosition();
      this.updateTargets();
      this.updateGuidanceSystem();
    }
  };
};

//spawn a bot based on different criteria
//(botColor, dragpoints, thrust, mass, height, wingspan, wingarea, wingtype, fuel, traj)
function spawnBot(type, botColor, dragpoints, thrust, mass, height, wingspan, wingarea, wingtype, fuel, traj) {
  switch (type) {
    case "fast": 
      sim.bots.push(new Bot("red", 100, 20000, 500, 5, 15, 70, 1, 1000, false));
      break;
    case "slow": 
      sim.bots.push(new Bot("green", 100, 10000, 500, 5, 15, 70, 1, 1000, false));
      break;
    case "generic":
      sim.bots.push(new Bot("white", 100, 15000, 500, 5, 15, 70, 1, 100, true));
      break;
  }
  console.log("A " + type + " bot was created");  
}

//create N random bots for testing
function spawnRandomBots(numOfBots) {
  for (var i = 0; i < numOfBots; i++) {
    sim.bots.push(new Bot('#'+random().toString(16).slice(-6), //color based on http://stackoverflow.com/a/5365036/1196983
                                                                        100, //dragpoints
                                                                        15000, //thrust
                                                                        5000, //mass
                                                                        5, //height
                                                                        15, //wingspan
                                                                        70, //wingarea
                                                                        1, //wingtype
                                                    (random()*100)+1, //fuel
                                                                        false)); //enable or disable trajectory drawing
  }
}

//restart our simulation
function restartSim() {
  sim.state = 0;
  sim.botIdCounter = 0; 
  sim.bots = [];
  sim.runningBots = 0;
  sim.startTime = 0;
  spawnRandomBots(3);
  sim.state = 1;
}

//sounds
/*var sounds = {
  soldier:    {shootSnd: {this: new Audio(), src: "soldshot.ogg", play: function(){this.play()}}}, 
  tank:       {shootSnd: {this: new Audio(), src: "tankshot.ogg", play: function(){this.play()}}}, 
  commander:  {shootSnd: {this: new Audio(), src: "commshot.ogg", play: function(){this.play()}}}
};*/

//some browser-compatibility-check shit, idk what these lines do
/*if (typeof pageWidth != "number") {
  if (document.compatMode == "CSS1Compat") {
    gameInterface.pageWidth = document.documentElement.clientWidth;
    gameInterface.pageHeight = document.documentElement.clientHeight;
  } else {
    gameInterface.pageWidth = document.body.clientWidth;
    gameInterface.pageHeight = document.body.clientHeight;
  }
}*/

//detect mouse clicks
function mouseEvents(event) {
  event.preventDefault(); event.stopPropagation();
  if (event.target === racetrackWindow.Canvas) {
    /*sim.mouseX = Math.abs(event.clientX - racetrackWindow.Rect.left - racetrackWindow.BorderWidth);
    sim.mouseY = Math.abs(event.clientY - racetrackWindow.Rect.top - racetrackWindow.BorderWidth);
    sim.mouseTarget = racetrackWindow.Canvas;*/
  }
  else if (event.target === simOptionsWindow.Canvas) {
    sim.mouseX = abs(event.clientX - simOptionsWindow.Rect.left - simOptionsWindow.BorderWidth);
    sim.mouseY = abs(event.clientY - simOptionsWindow.Rect.top - simOptionsWindow.BorderWidth);
    sim.mouseTarget = simOptionsWindow.Canvas;
  }
  else if (event.target === telemetryWindow.Canvas) {
    //sim.mouseX = Math.abs(event.clientX - telemetryWindow.Rect.left - telemetryWindow.BorderWidth) * gameInterface.ratio; //idk if Rect.left should be Rect.right, cause minimap has CSS pos right
    //sim.mouseY = Math.abs(event.clientY - telemetryWindow.Rect.top - telemetryWindow.BorderWidth) * gameInterface.ratio;
    //sim.mouseTarget = telemetryWindow.Canvas;
  }
  else {
    //FIXED: a bug where the user can spawn a bot even when the mouse is not on 'Create FAST/SLOW/GENERIC/RANDOM BOT' buttons
    sim.mouseY = 0; sim.mouseY = 0;
  }
  
  switch (event.type) {
    case "mouseup": 
      if (sim.mKey === 1 && sim.state === 1) {}
      break;
    case "mousedown":
      sim.mKey = event.keyCode || event.which; // || event.button; 1- left button, 2 - mid button, 3 - right button
      
      //if (sim.state === 0) { //detect click on Start in main menu
        //if (sim.mKey === 1) {
          //if (sim.mouseTarget === simOptionsWindow.Canvas) {
            //if (sim.mouseX > menuWidth && sim.mouseX < menuWidth*2 && sim.mouseY > menuHeight && sim.mouseY < menuHeight+menusTextHeight) { 
            //if (sim.mouseX > 0 && sim.mouseX < menuWidth && sim.mouseY > simOptionsWindow.CanvasHeight - menuHeight && sim.mouseY < simOptionsWindow.CanvasHeight) { 
              //spawnBots();
              //sim.state = 1;
              //main();
              //break;
            //}
          //}
        //}
      //}
      
      if (sim.state === 1) { //detect click on Sim Options window
        if (sim.mKey === 1) {
          if (sim.mouseY > 448 && sim.mouseY < 464) { spawnRandomBots(3); }
          if (sim.mouseY > 464 && sim.mouseY < 480) { spawnBot("generic"); }
          if (sim.mouseY > 480 && sim.mouseY < 496) { spawnBot("slow"); }
          if (sim.mouseY > 496 && sim.mouseY < 512) { spawnBot("fast"); }
        }
        if (sim.mKey === 2) {} //detect mid button click for map scroll
        if (sim.mKey === 3) {} //detect right button click
      }
      
      //if (sim.state === 2) { //detects click on Exit or Resume in main menu
        //if (sim.mouseTarget === simOptionsWindow.Canvas) {
          //if (sim.mKey === 1) {
            //if (sim.mouseX > menuWidth && sim.mouseX < menuWidth*2 && sim.mouseY > menuHeight && sim.mouseY < menuHeight+menusTextHeight) { //Restart
            //if (sim.mouseX > 0 && sim.mouseX < menuWidth && sim.mouseY > simOptionsWindow.CanvasHeight - menuHeight && sim.mouseY < simOptionsWindow.CanvasHeight) { 
              //sim.botIdCounter = 0; 
              //sim.bots = [];
              //sim.runningBots = 0;
              //sim.startTime = 0;
              //spawnRandomBots(3);
              //sim.state = 1;
              //main();
              //break;
            //}
            //if (sim.mouseX > menuWidth && sim.mouseX < menuWidth*2 && sim.mouseY > (menuHeight+(menusTextHeight*2)) && sim.mouseY < (menuHeight+(menusTextHeight*3))) { //Exit
              // //the following lines reset game data in case of Exit
              //sim.botIdCounter = 0; 
              //sim.bots = [];
              //sim.runningBots = 0;
              //sim.startTime = 0;
              //sim.state = 0;
              //main();
              //break;
            //}
          //}
        //}
      //}
      
      break;
    //case "mousemove":
      //sim.mouseX = Math.abs(event.clientX - racetrackWindow.Rect.left - racetrackWindow.BorderWidth);
      //sim.mouseY = Math.abs(event.clientY - racetrackWindow.Rect.top - racetrackWindow.BorderWidth);
      //if (sim.state === 1 && sim.mouseScroll === true) { //mouse scroll to map scroll detection
        //if (sim.mouseX < halfWidth) sim.viewPosX-=5 //left, step must be 2-4 times lower than those for arrows because mouse is a fast shit
        //if (sim.mouseX > halfWidth) sim.viewPosX+=5 //right, same rule
        //if (sim.mouseY < halfHeight) sim.viewPosY-=5 //up, same rule
        //if (sim.mouseY > halfHeight) sim.viewPosY+=5 //down, same rule
      //}
      //break;
  }
}

//clear racetrack and telemetry windows before each frame is drawn
function clearFrame() {
  //resetting the matrix BEFORE clearing the viewport!!!
  racetrackWindow.Context.setTransform(1,0,0,1,0,0); //reset the transform matrix as it is cumulative
  /* ------------------------------------------------------------------------ */
  racetrackWindow.Context.clearRect(0, 0, racetrackWindow.CanvasWidth, racetrackWindow.CanvasHeight); //clear the viewport ONLY IF the matrix is reset
  racetrackWindow.Context.fillStyle = "#000000"; //main background
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

//draw racetrack checkpoints
function drawRacetrack() {
  for (var i = 0; i < targetCount; i++) {
    racetrackWindow.Context.beginPath();
    //racetrackWindow.Context.moveTo(targets[i].x, targets[i].y);
    //racetrackWindow.Context.arc(targets[i].x, targets[i].y, sim.targetSize, 0, TAU);
    racetrackWindow.Context.arc(targets[i].x + halfWidth, halfHeight - targets[i].y, sim.targetSize, 0, TAU);
    racetrackWindow.Context.strokeStyle = "yellow";
    racetrackWindow.Context.stroke();
  }
}

//draw our bots
function drawUnits(passDeltaTime) {
  var optiInterp = 1 - passDeltaTime; //small optimization
  var botsCount = sim.bots.length;
  for (var i = 0; i < botsCount; i++) {
    //dunno why I placed these 3 lines here, but seems they are not needed, so commented them out
    //TODO: delete them if no new bugs appear
    //sim.bots[i].destination.x = targets[sim.bots[i].target].x;
    //sim.bots[i].destination.y = targets[sim.bots[i].target].y;
    //sim.bots[i].destination.z = targets[sim.bots[i].target].z;
    var drawX = (sim.bots[i].position.x * passDeltaTime) + (sim.bots[i].position.x * optiInterp), drawY = (sim.bots[i].position.y * passDeltaTime) + (sim.bots[i].position.y * optiInterp); //interpolation
    drawX = halfWidth + drawX; drawY = halfHeight - drawY; //translation from cartesian to screen coords
    racetrackWindow.Context.beginPath();
    if (drawX >= sim.viewPortMinX && drawX <= sim.viewPortMaxX && drawY >= sim.viewPortMinY && drawY <= sim.viewPortMaxY) { //PERFOPT: culling or check to draw visible-only units
      if (sim.bots[i].trajectoryLine === true) { 
        racetrackWindow.Context.moveTo(drawX, drawY);
        racetrackWindow.Context.lineWidth = 1;
        racetrackWindow.Context.strokeStyle = sim.bots[i].color;
        //racetrackWindow.Context.lineTo(sim.bots[i].destination.x, sim.bots[i].destination.y);
        racetrackWindow.Context.lineTo(sim.bots[i].destination.x + halfWidth, halfHeight - sim.bots[i].destination.y); //translation from cartesian to screen coords
        racetrackWindow.Context.stroke();
      }
      //--
      racetrackWindow.Context.moveTo(drawX, drawY);
      racetrackWindow.Context.ellipse(drawX, //X-axis coordinate of the ellipse's center
                                      drawY, //Y-axis coordinate of the ellipse's center
                                      sim.bots[i].size, //The ellipse's major-axis radius or X radius
                                      sim.bots[i].size, //The ellipse's minor-axis radius or Y radius
                                      //TODO: Fix the wrong rotation heading below
                                      sim.bots[i].heading, //The rotation for this ellipse, which uses Radians as parameter
                                      0, //The starting point, measured from the x axis, from which it will be drawn, expressed in radians
                                      TAU, //The end ellipse's angle to which it will be drawn, expressed in radians
                                      false); //if true, draws the ellipse anticlockwise (counter-clockwise), otherwise in a clockwise direction
      racetrackWindow.Context.strokeStyle = sim.bots[i].color;
      racetrackWindow.Context.stroke();
      //racetrackWindow.Context.fillStyle = "black";
      //racetrackWindow.Context.font = "14px Arial"; //1em = 16px
      //racetrackWindow.Context.textBaseline = "alphabetic";
      //if (sim.showUnitStats === true) {
        //racetrackWindow.Context.lineWidth = 3;
        //racetrackWindow.Context.strokeStyle = "white";
        //var uState = units[i].isMoving === true ? "m" : "n";
        //racetrackWindow.Context.strokeText(i+1 + uState, drawX, drawY + sim.bots[i].position.x.size); //for readibility when black text on black ground
        //racetrackWindow.Context.fillText(i+1 + uState, drawX, drawY + sim.bots[i].position.x.size); //draws unit state, also number based on spawn order
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

//draw a projectile
/*function drawProjectile() { //not used yet
  racetrackWindow.Context.fillStyle = "white";
  racetrackWindow.Context.fillRect(0, 0, racetrackWindow.CanvasWidth, racetrackWindow.CanvasHeight);
  //for (var i = 0; i < 100; i++) {
    //drawUnit(~~(Math.random() * (racetrackWindow.CanvasWidth+1)), ~~(Math.random() * (racetrackWindow.CanvasHeight+1)),"white");
  //}
}*/

//output all stats to the telemetry window
function drawStats() {
  var screenStats = [];
  var gameBotsLen = sim.bots.length;
  var textSize = 12; //1em = 16px, 12px = 1em*0.75 or 16px*0.75
  
  for (var i = 0; i < gameBotsLen; i++) {
    screenStats.push(["[bot " +                               sim.bots[i].id + "]", 
                      //"    posX: " +                 parseInt(sim.bots[i].position.x), 
                      //"    posY: " +                 parseInt(sim.bots[i].position.y), 
                      //"    posZ: " +                 parseInt(sim.bots[i].position.z), 
                      //"    destinationX: " +         parseInt(sim.bots[i].destination.x), 
                      //"    destinationY: " +         parseInt(sim.bots[i].destination.y),
                      //"    destinationZ: " +         parseInt(sim.bots[i].destination.z),
                      "    target: ring " +                  (sim.bots[i].target + 1), 
                      "    active: " +                        sim.bots[i].state, 
                      //"    XYangle: " +                       sim.bots[i].targetAngleXY.toFixed(3), 
                      //"    Zangle: " +                        sim.bots[i].targetAngleZ.toFixed(3), 
                      "    speed: " +              parseFloat(sim.bots[i].speed).toFixed(3) + " m/s",
                      "    fuel: " +               parseFloat(sim.bots[i].fuel).toFixed(3) + " litres",
                      "    weight: " +             parseFloat(sim.bots[i].loadedMass).toFixed(3) + " kgs",
                      "    altitude: " +           parseFloat(sim.bots[i].altitude).toFixed(3) + " meters",
                      "    heading: " +            parseFloat(sim.bots[i].heading).toFixed(3),
                      "    pitch: " +              parseFloat(sim.bots[i].pitch).toFixed(3),
                      "    roll: " +               parseFloat(sim.bots[i].roll).toFixed(3),
                      "    yaw: " +                parseFloat(sim.bots[i].yaw).toFixed(3),
                      "    lift force: " +         parseFloat(sim.bots[i].liftForce).toFixed(3),
                      "    drag force: " +         parseFloat(sim.bots[i].dragForce).toFixed(3),
                      "    distance travelled: " + parseFloat(sim.bots[i].distanceTravelled).toFixed(3),
                      "    time: " +              parseFloat((sim.bots[i].time*0.001)/sim.timeScale).toFixed(3) + " sec"]);
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

//draw current frames per second on the screen
function drawEngineInfo() {
  if (sim.showFPSMem === true) {
    var fpsFilter = 5;
    var msForCurrentFrame = sim.currentTime - sim.lastTime;
    var fpsForCurrentFrame = 1000 / msForCurrentFrame;
    sim.renderTime = (msForCurrentFrame > fpsFilter) ? ~~(msForCurrentFrame / fpsFilter) : ~~(fpsFilter / msForCurrentFrame);
    if (sim.currentTime != sim.lastTime) {
      sim.currentFPS += ~~((fpsForCurrentFrame - sim.currentFPS) / fpsFilter);
    }
    //the memory usage code is taken from https://github.com/mrdoob/stats.js/blob/master/src/Stats.js
    var minVal = Infinity;
    //var maxVal = 0;
    //var heapLimit = performance.memory.jsHeapSizeLimit / 1048576; //this will be used for the graph
    if (isChromium == true) { //IMPORTANT: performance.memory is supported only by Chromium
      minVal = min(minVal, performance.memory.usedJSHeapSize / 1048576);
    } else { minVal = 1; }
    //maxVal = min(maxVal, performance.memory.usedJSHeapSize / 1048576);
    sim.currentMem = round(minVal); // | " + round(minVal) + " MB | " + round(maxVal) + " MB";
    racetrackWindow.Context.fillStyle = "white";
    racetrackWindow.Context.font = "0.75em Arial"; //1em = 16px
    racetrackWindow.Context.textBaseline = "alphabetic";
    racetrackWindow.Context.fillText("FPS: " + sim.currentFPS, 4, 16); //FPS, 4px offset from top left corner
    racetrackWindow.Context.fillText("World updates: " + parseInt(sim.worldUpdates), 4, 32); //ms, 4px offset from top left corner
    racetrackWindow.Context.fillText("Bots: " + sim.bots.length, 4, 48); //bot counter, 4px offset from top left corner
    racetrackWindow.Context.fillText("Render time (in ms): " + sim.renderTime, 4, 64); //ms, 4px offset from top left corner
    racetrackWindow.Context.fillText("Update time (in ms): " + sim.updateTime, 4, 80); //ms, 4px offset from top left corner
    racetrackWindow.Context.fillText("Memory usage (in MB): " + sim.currentMem, 4, 96); //ms, 4px offset from top left corner
  }
}

//draw game menus on demand
function drawMenus(menuEvent) {
  console.log("Menu was drawn");
  simOptionsWindow.Context.beginPath();
  switch(menuEvent) { //0 - not running, 1 - running, 2 - paused
    //case 0: //not running
      //simOptionsWindow.Context.setTransform(1,0,0,1,0,0);
      //simOptionsWindow.Context.clearRect(0, 0, simOptionsWindow.CanvasWidth, simOptionsWindow.CanvasHeight);
      //telemetryWindow.Context.clearRect(0, 0, telemetryWindow.CanvasWidth, telemetryWindow.CanvasHeight); //do not clear the telemetryWindow or at the end bot data will be cleared
      //simOptionsWindow.Context.font = menuFont;
      //simOptionsWindow.Context.fillStyle = "DarkBlue";
      //simOptionsWindow.Context.fillRect(menuWidth, menuHeight, menuWidth, menuHeight);
      //simOptionsWindow.Context.fillRect(0, simOptionsWindow.CanvasHeight - menuHeight, menuWidth, menuHeight);
      //simOptionsWindow.Context.fillStyle = "white";
      //simOptionsWindow.Context.textBaseline = "top";
      //simOptionsWindow.Context.fillText(screenMenus[0], 0, simOptionsWindow.CanvasHeight - menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[0], menuWidth, menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[3], menuWidth, menuHeight*1.2);//load - 160px
      //simOptionsWindow.Context.fillText(screenMenus[4], menuWidth, menuHeight*1.4);//options - 240px
      //exit is not needed when the game is not started ... pretty obvious, isn't it?
      //break;
    case 1: 
      simOptionsWindow.Context.setTransform(1,0,0,1,0,0);
      simOptionsWindow.Context.clearRect(0, 0, simOptionsWindow.CanvasWidth, simOptionsWindow.CanvasHeight);
      simOptionsWindow.Context.font = menuFont;
      for (var i = 0; i < screenMenus.length; i++) {
        if (screenMenus[i] === "CREATE GENERIC BOT") {
          simOptionsWindow.Context.fillStyle = "Black";
        }
        else if (screenMenus[i] === "CREATE FAST BOT") {
          simOptionsWindow.Context.fillStyle = "Red";
        }
        else if (screenMenus[i] === "CREATE SLOW BOT") {
          simOptionsWindow.Context.fillStyle = "Green";
        }
        else if (screenMenus[i] === "CREATE RANDOM BOTS") {
          simOptionsWindow.Context.fillStyle = "Blue";
        }
        simOptionsWindow.Context.fillRect(0, simOptionsWindow.CanvasHeight - (menuHeight*(1+i)), simOptionsWindow.CanvasWidth, menuHeight);
        simOptionsWindow.Context.fillStyle = "white";
        simOptionsWindow.Context.textBaseline = "top";
        simOptionsWindow.Context.textAlign = "center";
        simOptionsWindow.Context.fillText(screenMenus[i], simOptionsWindow.CanvasWidth / 2, simOptionsWindow.CanvasHeight - (menuHeight*(1+i) - 2));
      }
      //racetrack length is moved here to lower the text clutter in racetrack window
      simOptionsWindow.Context.fillText("Racetrack length (in m): " + parseFloat(sim.racetrackLength).toFixed(3), simOptionsWindow.CanvasWidth / 2, 4); //ms, 4px offset from top left corner
      break; //running
    //case 2: //finished or paused, whatever i can't fight this logic right now
      //simOptionsWindow.Context.clearRect(0, 0, simOptionsWindow.CanvasWidth, simOptionsWindow.CanvasHeight);
      //simOptionsWindow.Context.font = menuFont;
      //simOptionsWindow.Context.fillStyle = "DarkBlue";
      //simOptionsWindow.Context.fillRect(menuWidth, menuHeight, menuWidth, menuHeight);
      //simOptionsWindow.Context.fillRect(0, simOptionsWindow.CanvasHeight - menuHeight, menuWidth, menuHeight);
      //simOptionsWindow.Context.fillStyle = "white";
      //simOptionsWindow.Context.textBaseline = "top";
      //simOptionsWindow.Context.fillText(screenMenus[0], 0, simOptionsWindow.CanvasHeight - menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[0], menuWidth, menuHeight);//start - 80px
      //simOptionsWindow.Context.fillText(screenMenus[1], menuWidth, menuHeight);//restart - 80px
      //simOptionsWindow.Context.fillText(screenMenus[5], menuWidth, menuHeight*1.2);//exit - 160px
      //simOptionsWindow.Context.fillText(screenMenus[1], menuWidth, menuHeight);//resume - 80px
      //simOptionsWindow.Context.fillText(screenMenus[2], menuWidth, menuHeight*1.2);//save - 160px
      //simOptionsWindow.Context.fillText(screenMenus[3], menuWidth, menuHeight*1.4);//load - 240px
      //simOptionsWindow.Context.fillText(screenMenus[4], menuWidth, menuHeight*1.6);//options - 320px
      //simOptionsWindow.Context.fillText(screenMenus[5], menuWidth, menuHeight*1.8);//exit - 400px
      //break;
  }
}

//detect collisions between all objects we created
function detectCollisions() { //used in updateWorld() //Disabled for now, should be an option
  // //collWorker.postMessage([pl1]);
  // //the problem with not moving units during formation time is probably the angle of the two colliding units - they are equal
  // for (var i = 0; i < unitCount - 1; i++) {
    // //if (i === unitCount - 2) { return }
    // for (var j = i + 1; j < unitCount; j++) {
      // var sumRad = sim.bots[i].size + sim.bots[j].size, diffX = ~~(Math.abs(sim.bots[i].position.x - sim.bots[j].position.x)), diffY = ~~(Math.abs(sim.bots[i].position.y - sim.bots[j].position.y));
      // if (diffX < sumRad && diffY < sumRad) { //on this line sumRad should be replaced with averaged (unit radius * 2) from all units
        // //AABB or proximity check optimization before the real collision check, 20-25% improved performance but units start to overlap a bit ... well, whatever
        // if (sim.bots[i].isMoving === true //idk if this check should be placed here (perf gain?), note that it's already called in updateWorld() 
        // && sim.bots[i].position.x + sumRad > sim.bots[j].position.x 
        // && sim.bots[i].position.x < sim.bots[j].position.x + sumRad 
        // && sim.bots[i].position.y + sumRad > sim.bots[j].position.y 
        // && sim.bots[i].position.y < sim.bots[j].position.y + sumRad) {
          // //Standart Discrete Collision Detection for circles w/o Penetration Vector Correction and Normalization
          // var deltaDist = ~~(Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2)));
          // //var distX = ~~(sim.bots[i].position.x - sim.bots[j].position.x); //parseInt() or .toFixed(0) are slow as hell, and btw Google Chrome 32.0.1700.107m is definitely faster than FF 27.0 in this case
          // //var distY = ~~(sim.bots[i].position.y - sim.bots[j].position.y);
          // if (deltaDist < ~~(sumRad)) {
            // //Friction
            // //var sim.frictionVector = coeffFriction * sim.bots[i].mass * g; //in opposite direction of force applied ... m-m-m-m of movement
            // //--
            // //Verlet integration
            // //var velocityNew = velocityCurrent + (Acceleration * sim.timeStep);
            // //var positionNew = positionCurrent + (velocityNew * sim.timeStep);
            // //or
            // //var positionNew = positionCurrent + (positionCurrent - positionOld) + (Acceleration * Math.pow(sim.timeStep, 2));
            // //var positionOld = positionCurrent;
            // //--
            // var massSum = sim.bots[i].mass + sim.bots[j].mass;
            // var massDiff = sim.bots[i].mass - sim.bots[j].mass, massDiff2 = sim.bots[j].mass - sim.bots[i].mass;
            // var newVelpl1i = ((sim.bots[i].speedPerTick * massDiff) + (2 * sim.bots[j].force)) / massSum;
            // var newVelpl1j = ((sim.bots[j].speedPerTick * massDiff2) + (2 * sim.bots[i].force)) / massSum;
            // //--
            // //integration based on velocity before and after collision
            // //var relVelocity = Math.abs(sim.bots[i].speedPerTick - sim.bots[j].speedPerTick);
            // //var dotVector = (sim.bots[i].position.x * sim.bots[j].position.x) + (sim.bots[i].position.y * sim.bots[j].position.y) + relVelocity;
            // //var newVelpl1i = Math.abs(sim.bots[i].speedPerTick - (sim.bots[i].speedPerTick * sim.bounceFactor));
            // //var newVelpl1j = Math.abs(sim.bots[j].speedPerTick - (sim.bots[j].speedPerTick * sim.bounceFactor));
            // //var iuForce = sim.bots[i].force;
            // //var juForce = sim.bots[j].force;
            // if (sim.bots[i].position.x < sim.bots[j].position.x) { sim.bots[i].position.x -= newVelpl1i, sim.bots[j].position.x += newVelpl1j } else { sim.bots[i].position.x += newVelpl1i, sim.bots[j].position.x -= newVelpl1j }
            // if (sim.bots[i].position.y < sim.bots[j].position.y) { sim.bots[i].position.y -= newVelpl1i, sim.bots[j].position.y += newVelpl1j } else { sim.bots[i].position.y += newVelpl1i, sim.bots[j].position.y -= newVelpl1j }
            // //add here stop command at destination arrival
          // }
          // //Separation Axis Theorem with Discrete Collision Detection for circles
          // /*var length = Math.abs((sim.bots[i].position.x - sim.bots[j].position.x) + (sim.bots[i].position.y - sim.bots[j].position.y));
          // var halfWidth1 = sim.bots[i].size * 0.5;
          // var halfWidth2 = sim.bots[j].size * 0.5;
          // var gap = length - halfWidth1 - halfWidth2;
          // if (gap < 0) {
            // (sim.bots[i].position.x < sim.bots[j].position.x) ? (sim.bots[i].position.x -= 1, sim.bots[j].position.x += 1) : (sim.bots[i].position.x += 1, sim.bots[j].position.x -= 1);
            // (sim.bots[i].position.y < sim.bots[j].position.y) ? (sim.bots[i].position.y -= 1, sim.bots[j].position.y += 1) : (sim.bots[i].position.y += 1, sim.bots[j].position.y -= 1);
          // }*/
        // }
      // }
    // }
  // }
}

//update current coordinates of the bots
function updateWorld() {
  //if (sim.runningBots === 0) { //check if we have any active bots so we can continue the simulation
    //sim.state = 0; //tell the engine that the sim was ended
    //add here some stats logic
    //console.log("Race finished");
    //for (var i = 0; i < sim.bots.length; i++) {
      //console.log("Bot " + i + " finished in " + parseFloat(sim.bots[i].time*0.001).toFixed(3) + " seconds | " + parseFloat(sim.bots[i].distanceTravelled).toFixed(3) + " meters travelled");
    //}
    //return; //maybe it's better to early exit from the function, execution of the conditions below is useless
  //}
  
  //sim.updateTime = performance.now().toFixed(3);
  if (sim.runningBots > 0) {
    for (var i = 0; i < sim.bots.length; i++) {
      sim.bots[i].updateBot();
    }
  }
  //sim.updateTime = ~~(performance.now().toFixed(3) - sim.updateTime);
  
  sim.worldUpdates++;
  var worldUpdatesFilter = 5;
  var msForCurrentUpdate = sim.currentTime - sim.lastTime;
  var updatesForCurrentFrame = 1000 / msForCurrentUpdate;
  sim.updateTime = (msForCurrentUpdate > worldUpdatesFilter) ? ~~(msForCurrentUpdate / worldUpdatesFilter) : ~~(worldUpdatesFilter / msForCurrentUpdate);
  if (sim.currentTime != sim.lastTime) {
    sim.worldUpdates += ~~((updatesForCurrentFrame - sim.worldUpdates) / worldUpdatesFilter);
  }
  
  //after coordinates of our bots are updated, we can check if there are any collisions between objects
  //detectCollisions(); //Disabled for now, should be an option
}

//draw everything in order
function renderWorld(passDeltaTime) { //drawing order of our objects: map->units->UI
  clearFrame(); //clear the canvas
  drawRacetrack(); //draw checkpoints of the current route
  drawUnits(passDeltaTime); //draw our bots
  drawStats(); //draw real-time statistics
  drawEngineInfo(); //draw fps, rendertime and memory usage
}

/* -------------------------------------------------------------------------- */

// these vars are for FIX-YOUR-TIMESTEP solution
//exact copy of http://gafferongames.com/game-physics/fix-your-timestep/
//currentState and previousState maybe are current and previous position of our bots, in fact idk
/*
var t = 0;
var dt = 0.01;
var accumulator = 0;
var previousState = 0;
var currentState = 0;
var state = 0;
sim.currentTime = performance.now().toFixed(3); //gets the current time needed for FIX-YOUR-TIMESTEP solution

function main() {
  if (sim.runningBots > 0) {
    requestAnimationFrame(main);
  
    while (true) {
      var newTime = performance.now();
      var frameTime = (newTime - sim.currentTime)*0.001;
      
      if (frameTime > dt) {
        frameTime = dt;
        currentTime = newTime;
      }
      
      accumulator += frameTime;
      
      while (accumulator >= dt) {
        previousState = currentState;
        updateWorld(); //update the world
        t += dt;
        accumulator -= dt;
      }
      
      var alpha = accumulator / dt;
      
      renderWorld(dt / (currentState * alpha + previousState * (1.0 - alpha)));
    }
  } else { requestAnimationFrame(main); }
}*/

//engine's main loop
function main() {
  if (sim.runningBots > 0) {
    requestAnimationFrame(main); //first step is to draw so first update will be always drawn
    sim.currentTime = performance.now(); //get the current time needed for our engine
    sim.timeDiff = (abs(sim.currentTime - sim.lastTime) * 0.001);
    //update our deltaTime
    //IMPORTANT - in most cases this is 15% slower to 15% faster
    sim.dTime += min(sim.timeDiff, 1); //set dTime to 1 second when the browser loses focus on the sim tab
    //get the timeProduct
    sim.timeProduct = sim.timeStep * sim.timeScale;
    while (sim.dTime > sim.timeProduct) { //update the world while deltaTime is bigger than the timeProduct
      updateWorld(); //update the world
      sim.dTime -= sim.timeProduct; //update our deltaTime
    }
    //now it's time to render the world
    //IMPORTANT - must be outside the main loop to free cpu time
    //IMPORTANT - makes wobbly units but adds interpolation
    renderWorld(sim.dTime / sim.timeProduct);
    sim.lastTime = sim.currentTime;
  } else { requestAnimationFrame(main); }
  
  //if (sim.state === 2) { drawMenus(2); return; } //draw menus if the game is paused
}

//load all event listeners and our engine when the page is loaded
document.body.onload = function() {
  //disable right-click in canvas and detect mouse movement and pressed/released mouse buttons
  var mEvents = ['contextmenu', 'mousedown', 'mouseup', 'mousemove'];
  for (var i = 0; i < mEvents.length; i++) {
    window.addEventListener(mEvents[i], function(event){mouseEvents(event)}, false); //disable right-click menu in canvas
  }
  window.addEventListener('keydown', function(event){detectKeys(event)}, false); //detect pressed keyboard keys
  drawMenus(1);
  main(); //and finally let's load our engine
};

/* ------------------------------- TODO SECTION ----------------------------- */
/*
1. Physics
2. Loading bot models from file(s)
3. Collision detection per model or per sim mode
4. AI
5. Projectiles for dogfight/evasion modes
6. Aftermath statistics
7. Sim controls
8. To learn the retarded Git commands. Do not forget your passphrase, folks!
9. Check if everything related to angles to be in Radians (because Math)
*/
/* ------------------------------- TODO SECTION ----------------------------- */
