# botlab
A small physics app for testing the design of aircrafts and their AI

This is a very early version of an application for testing the design of different aircrafts and their AIs used for navigation through a specific course.
For now it contains a basic simulation of 2D movement in two variants:
  * - main loop is based on http://gafferongames.com/game-physics/fix-your-timestep/, and FPS counter is not yet fixed for this.
      Seems there's a problem with accuracy of this variant, I don't know why but the travelled distance is too little compared to the length of the course
  * - the original sim-model is commented and is located above the Glenn Fiedler's version (https://github.com/gafferongames)
  * - actual position is updated in procedural manner rather than using a vector object. For me it is more readable, but it will be definitely rewritten in the future

The interface is horrible but it works. It will be rewritten too, if I understand the idea behind the controls used in projects like matter-js, p2js, etc

---
Note that this is a hobby project, I'm not a professional coder so be good and explain what and why you're doing with the code :)
