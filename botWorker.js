'use strict'; //meh

//postMessage('Worker is running');

onmessage = function (event) {
  
  //console.log(`BOT ${event.data.id} position: ${event.data.position.x} `);
  //postMessage(`BOT ${event.data} REPORTING`);

  //calculate the difference between current position and destination for each axis
  event.data.direction.x = event.data.destination.x - event.data.position.x;
  event.data.direction.y = event.data.destination.y - event.data.position.y;
  event.data.direction.z = event.data.destination.z - event.data.position.z;

  //calculate distance between the bot and it's current destination
  //IMPORTANT: DO NOT REMOVE ~~ FROM HERE or bots stuck in checkpoints
  //it seems that if ~~ is removed bots no more stuck, this happened after adding the 3rd axis
  event.data.distance = Math.hypot(event.data.direction.x, event.data.direction.y, event.data.direction.z); //perf tests show that using ~~ in front of Math.hypot() the code is 8% faster

  //check if the bot is still away from the target, possible jittering near the target
  //IMPORTANT: after adding air pressure, density and temp it seems that bot stuck again at the checkpoints
  if (event.data.target <= event.data.targetCount - 1) { //check if our bot has more targets
    if (event.data.distance <= event.data.size) {
      event.data.hasTarget = false;
      event.data.target++; //bot went through another target
      //event.data.distanceTravelled += event.data.size; //temporarily disabled
    }
  } else { //or if hasn't ...
    event.data.isTimed = false; //stop the stopwatch for our bot
    event.data.state = false; //set state of our bot to inactive
    event.data.hasTarget = false; //set our bot has no target
    event.data.distanceTravelled -= event.data.distanceBeforeFirstTarget;
    event.data.runningBots--; //remove our bot from the active bots' list
    console.log("Bot " + event.data.id + " finished in " + parseFloat(event.data.time*0.001).toFixed(3) + " seconds | " + parseFloat(event.data.distanceTravelled).toFixed(3) + " meters travelled");
  }
  
  //this normalizes the vector, so our calculations for direction and speed in Cartesian system are not skewed
  event.data.direction.x /= event.data.distance;
  event.data.direction.y /= event.data.distance;
  event.data.direction.z /= event.data.distance;
  
  //calculate velocities for each axis
  event.data.velocity.x += (event.data.direction.x * event.data.acceleration * event.data.timeStep); //+ event.data.heading;
  event.data.velocity.y += (event.data.direction.y * event.data.acceleration * event.data.timeStep); //+ event.data.heading;
  event.data.velocity.z += (event.data.direction.z * event.data.acceleration * event.data.timeStep); //+ event.data.pitch;
  
  //FIRST calculate Geopotential height
  //this is gravity-adjusted altitude of our bot, using variation of the gravity with latitude and elevation
  //based on https://en.wikipedia.org/wiki/Barometric_formula#Source_code
  event.data.geopotentialHeight = (event.data.earthRadius * event.data.altitude / (event.data.earthRadius + event.data.altitude)) / 1000; //in kilometers
  
  //calculate current air temperature, in Kelvin, and air density + pressure, in Pascals
  //based on https://en.wikipedia.org/wiki/Barometric_formula#Source_code
  //1st variant
  //event.data.airCurrentTemp = event.data.airReferenceTemperature - (event.data.airLapseRate*event.data.altitude) + 273.15; //in Kelvin
  //2nd variant
  if (event.data.geopotentialHeight <= 11) { 
    event.data.airCurrentTemp = 288.15 - (6.5 * event.data.geopotentialHeight);
    event.data.airPressure = 101325 * Math.pow(288.15 / event.data.airCurrentTemp, -5.255877);
  } // Troposphere
  else if (event.data.geopotentialHeight <= 20) { 
    event.data.airCurrentTemp = 216.65 - (6.5 * event.data.geopotentialHeight);
    event.data.airPressure = 22632.06 * Math.exp(-0.1577 * (event.data.geopotentialHeight - 11));
  } // Stratosphere starts
  else if (event.data.geopotentialHeight <= 32) { 
    event.data.airCurrentTemp = 196.65 + event.data.geopotentialHeight;
    event.data.airPressure = 5474.889 * Math.pow(216.65 / event.data.airCurrentTemp, 34.16319);
  }
  else if (event.data.geopotentialHeight <= 47) { 
    event.data.airCurrentTemp = 228.65 + 2.8 * (event.data.geopotentialHeight - 32);
    event.data.airPressure = 868.0187 * Math.pow(228.65 / event.data.airCurrentTemp, 12.2011);
  }
  else if (event.data.geopotentialHeight <= 51) { 
    event.data.airCurrentTemp = 270.65 - (6.5 * event.data.geopotentialHeight);
    event.data.airPressure = 110.9063 * Math.exp(-0.1262 * (event.data.geopotentialHeight - 47));
  }// Mesosphere starts
  else if (event.data.geopotentialHeight <= 71) { 
    event.data.airCurrentTemp = 270.65 - 2.8 * (event.data.geopotentialHeight - 51);
    event.data.airPressure = 66.93887 * Math.pow(270.65 / event.data.airCurrentTemp, -12.2011);
  }
  else if (event.data.geopotentialHeight <= 84.85) { 
    event.data.airCurrentTemp = 214.65 - 2 * (event.data.geopotentialHeight - 71);
    event.data.airPressure = 3.956420 * Math.pow(214.65 / event.data.airCurrentTemp, -17.0816);
  }
  //geopotHeight must be less than 84.85 km
  //altitude must be less than 86 km if we want the formula below to work
  event.data.airDensity = (event.data.airPressure * event.data.airMolarMass) / (event.data.gasConstant * event.data.airCurrentTemp);
  
  //calculate current air pressure at bot's position
  event.data.airPressureX = 0.5 * event.data.airDensity * Math.pow(event.data.velocity.x, 2);
  event.data.airPressureY = 0.5 * event.data.airDensity * Math.pow(event.data.velocity.y, 2);
  event.data.airPressureZ = 0.5 * event.data.airDensity * Math.pow(event.data.velocity.z, 2);
  
  //calculate current air viscosity
  event.data.KelvinToRankine = event.data.airCurrentTemp * 1.8; //in Rankine
  event.data.airViscosity = event.data.airReferenceViscosity*(((0.555*event.data.RankineRefTemp) + event.data.SutherlandConstant)/((0.555*event.data.KelvinToRankine) + event.data.SutherlandConstant))*Math.pow(event.data.KelvinToRankine/event.data.RankineRefTemp, 3.2); //in centipose

  //IMPORTANT - adding and drag to equation makes bots to jump from reached destination
  //IMPORTANT - dunno why but changed calculation of position.xyz seems fixed the jumping, and travelled distance is somewhat CORRECT!!!
  
  //calculate the Reynolds number for using the correct drag law later
  event.data.kinematicViscosity = event.data.airViscosity / event.data.airDensity;
  event.data.ReynoldsNumber = (event.data.acceleration * event.data.size) / event.data.kinematicViscosity;

  //choose which drag law to use
  if (event.data.ReynoldsNumber < 1) {
    //for low velocity, linear drag or laminar flow
    var dragX = 6 * event.data.PI * event.data.airViscosity * event.data.size * event.data.velocity.x;
    var dragY = 6 * event.data.PI * event.data.airViscosity * event.data.size * event.data.velocity.y;
    var dragZ = 6 * event.data.PI * event.data.airViscosity * event.data.size * event.data.velocity.z;
  } else {
    //for high velocity, quadratic drag or turbulent flow
    var dragX = event.data.airPressureX * event.data.dragCoeff * event.data.frontalArea;
    var dragY = event.data.airPressureY * event.data.dragCoeff * event.data.frontalArea;
    var dragZ = event.data.airPressureZ * event.data.dragCoeff * event.data.frontalArea;
  }
  dragX = (isNaN(dragX) ? 0 : dragX*event.data.timeStep); //BUG: Always ZERO
  dragY = (isNaN(dragY) ? 0 : dragY*event.data.timeStep); //BUG: Always ZERO
  dragZ = (isNaN(dragZ) ? 0 : dragZ*event.data.timeStep); //BUG: Always ZERO
  
  //TODO: calculate event.data.dragForce
  
  //calculate actual Earth's gravity
  event.data.distanceFromEarthCenter = event.data.earthRadius + event.data.position.z;
  event.data.currentGravity = event.data.referenceGravity * (event.data.earthPowRadius / Math.pow(event.data.distanceFromEarthCenter, 2));
  event.data.currentGravity = parseFloat(event.data.currentGravity).toFixed(6);

  //move our bot, maybe a Verlet version?
  //1st variant
  //var stepX = (event.data.velocity.x - dragX + (0.5*event.data.acceleration*event.data.timeStep))*event.data.timeStep;
  //var stepY = (event.data.velocity.y - dragY + (0.5*event.data.acceleration*event.data.timeStep))*event.data.timeStep;
  //var stepZ = ((event.data.velocity.z - dragZ + event.data.liftForce*event.data.timeStep) - (0.5*event.data.currentGravity*event.data.timeStep)+(0.5*event.data.acceleration*event.data.timeStep))*event.data.timeStep;
  //2nd variant
  event.data.acceleration *= 0.5*event.data.timeStep;
  event.data.currentGravity *= 0.5*event.data.timeStep*event.data.timeStep;
  event.data.velocity.x += event.data.direction.x * ((event.data.acceleration - event.data.oldAcceleration)/2) * event.data.timeStep;
  event.data.velocity.y += event.data.direction.y * ((event.data.acceleration - event.data.oldAcceleration)/2) * event.data.timeStep;
  event.data.velocity.z += event.data.direction.z * ((event.data.acceleration - event.data.oldAcceleration)/2) * event.data.timeStep;
  var stepX = (event.data.velocity.x - dragX + event.data.acceleration);
  var stepY = (event.data.velocity.y - dragY + event.data.acceleration);
  if (event.data.liftForce <= 0) {
    var stepZ = -(event.data.velocity.z - dragZ - event.data.currentGravity + event.data.liftForce + event.data.acceleration);
  } else {
    var stepZ = (event.data.velocity.z - dragZ - event.data.currentGravity + event.data.liftForce + event.data.acceleration);
  }
  event.data.position.x += stepX;
  event.data.position.y += stepY;
  event.data.position.z += stepZ;
  event.data.oldAcceleration = event.data.acceleration;
  
  //calculate current speed and travelled distance of our bot
  var tmp = Math.hypot(stepX, stepY, stepZ); //IMPORTANT - DO NOT optimise with ~~ or speed and distance travelled will be wrong!!!
  event.data.distanceTravelled += tmp;
  event.data.speed = (tmp / event.data.timeStep); //V = S / t, in m/s
  event.data.altitude = event.data.position.z;
  
  //check if our bot crashed or has been landed
  if (event.data.altitude <= 0 && event.data.isLanding === false) {
    event.data.isTimed = false; //stop the stopwatch for our bot
    event.data.state = false; //set state of our bot to inactive
    event.data.hasTarget = false; //remove our bot's target state
    event.data.distanceTravelled -= event.data.distanceBeforeFirstTarget;
    event.data.runningBots--; //remove our bot from the list with active bots
    var statusText = (event.data.isLanding === false) ? " CRASHED" : " LANDED";
    console.log("Bot " + event.data.id + statusText + " at location [" + 
                        parseFloat(event.data.position.x).toFixed(3) + ", " + 
                        parseFloat(event.data.position.y).toFixed(3) + ", " + 
                        parseFloat(event.data.position.z).toFixed(3) + "]");
  }
  
  var returnedShits = {
    position: event.data.position, 
    destination: event.data.destination, 
    direction: event.data.direction, 
    distance: event.data.distance, 
    distanceTravelled: event.data.distanceTravelled, 
    distanceFromEarthCenter: event.data.distanceFromEarthCenter, 
    currentGravity: event.data.currentGravity, 
    airViscosity: event.data.airViscosity, 
    airPressure: event.data.airPressure, 
    airDensity: event.data.airDensity, 
    airCurrentTemp: event.data.airCurrentTemp, 
    KelvinToRankine: event.data.KelvinToRankine, 
    ReynoldsNumber: event.data.ReynoldsNumber, 
    geopotentialHeight: event.data.geopotentialHeight, 
    altitude: event.data.altitude, 
    pitch: event.data.pitch, 
    roll: event.data.roll, 
    yaw: event.data.yaw, 
    heading: event.data.heading, 
    rollRate: event.data.rollRate, 
    yawRate: event.data.yawRate, 
    pitchRate: event.data.pitchRate, 
    dragCoeff: event.data.dragCoeff, 
    dragForce: event.data.dragForce, 
    thrust: event.data.thrust, 
    fuel: event.data.fuel, 
    mass: event.data.mass, 
    loadedMass: event.data.loadedMass, 
    PowerToWeightRatio: event.data.PowerToWeightRatio, 
    height: event.data.height, 
    acceleration: event.data.acceleration, 
    oldAcceleration: event.data.oldAcceleration, 
    velocity: event.data.velocity, 
    speed: event.data.speed, 
    momentOfInertia: event.data.momentOfInertia, 
    wingSpan: event.data.wingSpan, 
    wingArea: event.data.wingArea, 
    wingLoading: event.data.wingLoading, 
    wingType: event.data.wingType, 
    frontalArea: event.data.frontalArea, 
    liftCoeff: event.data.liftCoeff, 
    liftForce: event.data.liftForce, 
    fuelConsumption: event.data.fuelConsumption, 
    fuelConPerTimeStep: event.data.fuelConPerTimeStep, 
    trajectoryLine: event.data.trajectoryLine, 
    CoM: event.data.CoM, 
    CoT: event.data.CoT, 
    CoL: event.data.CoL, 
    size: event.data.size, 
    color: event.data.color, 
    id: event.data.id, 
    target: event.data.target, 
    targetAngleXY: event.data.targetAngleXY, 
    targetAngleZ: event.data.targetAngleZ, 
    hasTarget: event.data.hasTarget, 
    time: event.data.time, 
    startTime: event.data.startTime, 
    isTimed: event.data.isTimed, 
    state: event.data.state, 
    distanceBeforeFirstTarget: event.data.distanceBeforeFirstTarget, 
    isLanding: event.data.isLanding
  };
  
  postMessage(returnedShits);

  //this console.log below is interesting
  //seems current speed of the bot (to be precise distance travelled) and its acceleration based on aero formula thrust / mass ...
  //... are not equal or almost equal, ie the speed sometimes is between 1 and 50% bigger than usual ...
  //... or maybe the event.data.dTime is not correct, dunno why
  //console.log("bot " + i + " - " + event.data.acceleration + " | vxvyvz - " + Math.hypot(vx, vy, vz));
  
  //output all parameters for debugging, only for bot #0
  /*if (event.data.id === 0) {
    console.log("Speed "          + event.data.speed +
                " Altitude "       + event.data.altitude +
                " AirTemp "        + tempTemp +
                " AirDensity "     + event.data.airDensity +
                " AirPressureX "    + event.data.airPressureX +
                " AirPressureY "    + event.data.airPressureY +
                " AirPressureZ "    + event.data.airPressureZ +
                " AirViscosity "   + event.data.airViscosity +
                " CurrentGravity "       + event.data.currentGravity
               );
  }*/
};