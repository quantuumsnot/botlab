'use strict'; //meh

onmessage = function(event) {
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
  this.geopotentialHeight = (sim.earthRadius * this.altitude / (sim.earthRadius + this.altitude)) / 1000; //in kilometers
  
  //calculate current air temperature, in Kelvin, and air density + pressure, in Pascals
  //based on https://en.wikipedia.org/wiki/Barometric_formula#Source_code
  //1st variant
  //this.airCurrentTemp = sim.airReferenceTemperature - (sim.airLapseRate*this.altitude) + 273.15; //in Kelvin
  //2nd variant
  if (this.geopotentialHeight <= 11) { 
    this.airCurrentTemp = 288.15 - (6.5 * this.geopotentialHeight);
    this.airPressure = 101325 * pow(288.15 / this.airCurrentTemp, -5.255877);
  } // Troposphere
  else if (this.geopotentialHeight <= 20) { 
    this.airCurrentTemp = 216.65 - (6.5 * this.geopotentialHeight);
    this.airPressure = 22632.06 * exp(-0.1577 * (this.geopotentialHeight - 11));
  } // Stratosphere starts
  else if (this.geopotentialHeight <= 32) { 
    this.airCurrentTemp = 196.65 + this.geopotentialHeight;
    this.airPressure = 5474.889 * pow(216.65 / this.airCurrentTemp, 34.16319);
  }
  else if (this.geopotentialHeight <= 47) { 
    this.airCurrentTemp = 228.65 + 2.8 * (this.geopotentialHeight - 32);
    this.airPressure = 868.0187 * pow(228.65 / this.airCurrentTemp, 12.2011);
  }
  else if (this.geopotentialHeight <= 51) { 
    this.airCurrentTemp = 270.65 - (6.5 * this.geopotentialHeight);
    this.airPressure = 110.9063 * exp(-0.1262 * (this.geopotentialHeight - 47));
  }// Mesosphere starts
  else if (this.geopotentialHeight <= 71) { 
    this.airCurrentTemp = 270.65 - 2.8 * (this.geopotentialHeight - 51);
    this.airPressure = 66.93887 * pow(270.65 / this.airCurrentTemp, -12.2011);
  }
  else if (this.geopotentialHeight <= 84.85) { 
    this.airCurrentTemp = 214.65 - 2 * (this.geopotentialHeight - 71);
    this.airPressure = 3.956420 * pow(214.65 / this.airCurrentTemp, -17.0816);
  }
  //geopotHeight must be less than 84.85 km
  //altitude must be less than 86 km if we want the formula below to work
  this.airDensity = (this.airPressure * sim.airMolarMass) / (sim.gasConstant * this.airCurrentTemp);
  
  //calculate current air pressure at bot's position
  this.airPressureX = 0.5 * this.airDensity * pow(this.velocity.x, 2);
  this.airPressureY = 0.5 * this.airDensity * pow(this.velocity.y, 2);
  this.airPressureZ = 0.5 * this.airDensity * pow(this.velocity.z, 2);
  
  //calculate current air viscosity
  this.KelvinToRankine = this.airCurrentTemp * 1.8; //in Rankine
  this.airViscosity = sim.airReferenceViscosity*(((0.555*sim.RankineRefTemp) + sim.SutherlandConstant)/((0.555*this.KelvinToRankine) + sim.SutherlandConstant))*pow(this.KelvinToRankine/sim.RankineRefTemp, 3.2); //in centipose

  //IMPORTANT - adding and drag to equation makes bots to jump from reached destination
  //IMPORTANT - dunno why but changed calculation of position.xyz seems fixed the jumping, and travelled distance is somewhat CORRECT!!!
  
  //calculate the Reynolds number for using the correct drag law later
  this.kinematicViscosity = this.airViscosity / this.airDensity;
  this.ReynoldsNumber = (this.acceleration * this.size) / this.kinematicViscosity;

  //choose which drag law to use
  if (this.ReynoldsNumber < 1) {
    //for low velocity, linear drag or laminar flow
    var dragX = 6 * PI * this.airViscosity * this.size * this.velocity.x;
    var dragY = 6 * PI * this.airViscosity * this.size * this.velocity.y;
    var dragZ = 6 * PI * this.airViscosity * this.size * this.velocity.z;
  } else {
    //for high velocity, quadratic drag or turbulent flow
    var dragX = this.airPressureX * this.dragCoeff * this.frontalArea;
    var dragY = this.airPressureY * this.dragCoeff * this.frontalArea;
    var dragZ = this.airPressureZ * this.dragCoeff * this.frontalArea;
  }
  dragX = (isNaN(dragX) ? 0 : dragX*sim.timeStep); //BUG: Always ZERO
  dragY = (isNaN(dragY) ? 0 : dragY*sim.timeStep); //BUG: Always ZERO
  dragZ = (isNaN(dragZ) ? 0 : dragZ*sim.timeStep); //BUG: Always ZERO
  
  //TODO: calculate this.dragForce
  
  //calculate actual Earth's gravity
  this.distanceFromEarthCenter = sim.earthRadius + this.position.z;
  this.currentGravity = sim.referenceGravity * (sim.earthPowRadius / pow(this.distanceFromEarthCenter, 2));
  this.currentGravity = parseFloat(this.currentGravity).toFixed(6);

  //move our bot, maybe a Verlet version?
  //1st variant
  //var stepX = (this.velocity.x - dragX + (0.5*this.acceleration*sim.timeStep))*sim.timeStep;
  //var stepY = (this.velocity.y - dragY + (0.5*this.acceleration*sim.timeStep))*sim.timeStep;
  //var stepZ = ((this.velocity.z - dragZ + this.liftForce*sim.timeStep) - (0.5*this.currentGravity*sim.timeStep)+(0.5*this.acceleration*sim.timeStep))*sim.timeStep;
  //2nd variant
  this.acceleration *= 0.5*sim.timeStep;
  this.currentGravity *= 0.5*sim.timeStep*sim.timeStep;
  this.velocity.x += this.direction.x * ((this.acceleration - this.oldAcceleration)/2) * sim.timeStep;
  this.velocity.y += this.direction.y * ((this.acceleration - this.oldAcceleration)/2) * sim.timeStep;
  this.velocity.z += this.direction.z * ((this.acceleration - this.oldAcceleration)/2) * sim.timeStep;
  var stepX = (this.velocity.x - dragX + this.acceleration);
  var stepY = (this.velocity.y - dragY + this.acceleration);
  if (this.liftForce <= 0) {
    var stepZ = -(this.velocity.z - dragZ - this.currentGravity + this.liftForce + this.acceleration);
  } else {
    var stepZ = (this.velocity.z - dragZ - this.currentGravity + this.liftForce + this.acceleration);
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
                " AirDensity "     + this.airDensity +
                " AirPressureX "    + this.airPressureX +
                " AirPressureY "    + this.airPressureY +
                " AirPressureZ "    + this.airPressureZ +
                " AirViscosity "   + this.airViscosity +
                " CurrentGravity "       + this.currentGravity
               );
  }*/
};
